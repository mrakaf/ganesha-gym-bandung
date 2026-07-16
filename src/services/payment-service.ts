import { AppError } from '@/src/models/app-error'
import { CheckoutMethod, CreateCheckoutInput, PaymentType } from '@/src/models/payment'
import { PaymentRepository } from '@/src/repositories/payment-repository'
import { applyBenefitsForPaidPayment } from '@/src/helpers/payment-activation'
import { prisma } from '@/lib/db'

export class PaymentService {
  constructor(private readonly repo: PaymentRepository = new PaymentRepository()) {}

  async createCheckout(input: CreateCheckoutInput) {
    const paymentType = input.paymentType
    const amount = Number(input.amount)
    const userEmail = String(input.userEmail || '').trim().toLowerCase()
    const checkoutMethod: CheckoutMethod = input.checkoutMethod === 'cash' ? 'cash' : 'qris'

    if (!paymentType || !amount || !userEmail) {
      throw new AppError('paymentType, amount, dan userEmail wajib diisi', 400)
    }
    if (amount < 1000) throw new AppError('Minimum pembayaran adalah Rp 1.000', 400)

    const orderId = `GANESHA-${paymentType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const itemName = this.getItemName(paymentType)

    const member = await this.repo.ensureMemberForCheckout(userEmail, input.userName)
    const hasMembershipHistory = (member?.payments?.length || 0) > 0
    const mustPayRegistrationFee = !!member?.mustPayRegistrationFee

    if (paymentType === 'MEMBERSHIP_RENEWAL' && (!hasMembershipHistory || mustPayRegistrationFee)) {
      throw new AppError('Akun ini wajib registrasi ulang Member Baru (Rp 200.000) sebelum bisa melakukan perpanjangan.', 400)
    }
    if (paymentType === 'MEMBERSHIP_NEW' && hasMembershipHistory && !mustPayRegistrationFee) {
      throw new AppError('Akun ini sudah pernah membership. Silakan pilih Perpanjangan Member (Rp 160.000).', 400)
    }

    if (checkoutMethod === 'cash') {
      await this.repo.createPayment({
        memberId: member?.id || null,
        type: paymentType,
        amount,
        status: 'PENDING',
        paymentMethod: 'cash',
        orderId,
        description: `${itemName} — tunai (menunggu konfirmasi kasir)`,
      })
      return {
        success: true,
        provider: null,
        paymentMethod: 'cash',
        orderId,
        paymentType,
        itemName,
        amount,
        fee: 0,
        totalPayment: amount,
        qrString: null as string | null,
        expiredAt: null as string | null,
      }
    }

    const pakasirData = await this.createPakasirTransaction(orderId, amount)
    await this.repo.createPayment({
      memberId: member?.id || null,
      type: paymentType,
      amount,
      status: 'PENDING',
      paymentMethod: 'qris',
      orderId,
      description: `${itemName} via PaKasir`,
    })

    return {
      success: true,
      provider: 'pakasir',
      paymentMethod: 'qris',
      orderId,
      paymentType,
      itemName,
      amount,
      fee: pakasirData.payment.fee ?? 0,
      totalPayment: pakasirData.payment.total_payment ?? amount,
      qrString: pakasirData.payment.payment_number,
      expiredAt: pakasirData.payment.expired_at,
      raw: pakasirData.payment,
    }
  }

  async getStatus(orderId: string, amount: number) {
    if (!orderId) throw new AppError('orderId wajib diisi', 400)
    if (!amount || Number.isNaN(amount)) throw new AppError('amount wajib diisi untuk cek status', 400)

    const payment = await this.repo.findLatestByOrderId(orderId)
    if (!payment) throw new AppError('Transaksi tidak ditemukan', 404)

    if (payment.paymentMethod?.toLowerCase() === 'cash') {
      const expectedAmount = Number(payment.amount)
      if (Math.abs(expectedAmount - amount) > 0.01) throw new AppError('Nominal tidak cocok dengan pesanan tunai ini', 400)

      if (payment.status === 'PAID') {
        return this.cashResponse('success', orderId, expectedAmount, 'Pembayaran tunai telah dikonfirmasi', 'paid', payment.paidAt?.toISOString() ?? null)
      }
      if (payment.status === 'FAILED' || payment.status === 'CANCELLED') {
        return this.cashResponse(
          'failed',
          orderId,
          expectedAmount,
          payment.status === 'CANCELLED' ? 'Pembayaran dibatalkan' : 'Pembayaran tidak berhasil',
          payment.status.toLowerCase(),
          null
        )
      }
      return this.cashResponse('pending', orderId, expectedAmount, 'Menunggu konfirmasi kasir setelah pembayaran tunai diterima', 'pending_confirmation', null)
    }

    const transaction = await this.getPakasirTransaction(orderId, amount)
    const providerStatus = String(transaction.status || '').toLowerCase()

    let txnStatus: 'success' | 'failed' | 'pending' = 'pending'
    let message = 'Menunggu pembayaran'
    if (providerStatus === 'completed' || providerStatus === 'settlement') {
      txnStatus = 'success'
      message = 'Pembayaran berhasil'
    } else if (providerStatus === 'failed' || providerStatus === 'cancelled' || providerStatus === 'expired') {
      txnStatus = 'failed'
      message = 'Pembayaran gagal atau dibatalkan'
    }

    if (txnStatus === 'success' && payment.status !== 'PAID') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } })
        await applyBenefitsForPaidPayment(tx, {
          memberId: payment.memberId,
          type: payment.type,
          orderId: payment.orderId,
          paymentMethod: payment.paymentMethod,
        })
      })
    }
    if (txnStatus === 'failed' && payment.status === 'PENDING') {
      await this.repo.updateStatus(payment.id, 'FAILED')
    }

    return {
      success: true,
      provider: 'pakasir',
      orderId,
      status: txnStatus,
      message,
      transactionStatus: providerStatus || 'unknown',
      paymentType: transaction.payment_method || 'qris',
      grossAmount: transaction.amount || amount,
      settlementTime: transaction.completed_at || null,
      raw: transaction,
    }
  }

  async getHistory(emailRaw: string) {
    const email = String(emailRaw || '').trim().toLowerCase()
    if (!email) throw new AppError('email wajib diisi', 400)
    const member = await this.repo.findMemberIdByEmail(email)
    if (!member) throw new AppError('Member tidak ditemukan', 404)
    const payments = await this.repo.findHistoryByMemberId(member.id)
    return payments.map((payment) => ({ ...payment, amount: Number(payment.amount) }))
  }

  async handleNotification(payload: any) {
    const orderId = payload?.order_id
    const providerStatus = String(payload?.status || '').toLowerCase()
    if (!orderId) return { received: false, reason: 'order_id kosong' }

    const payment = await this.repo.findLatestByOrderId(orderId)
    if (!payment) return { received: true, skipped: true }

    if (providerStatus === 'completed' || providerStatus === 'settlement') {
      if (payment.status !== 'PAID') {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } })
          await applyBenefitsForPaidPayment(tx, {
            memberId: payment.memberId,
            type: payment.type,
            orderId: payment.orderId,
            paymentMethod: payment.paymentMethod,
          })
        })
      }
    } else if (providerStatus === 'failed' || providerStatus === 'cancelled' || providerStatus === 'expired') {
      if (payment.status === 'PENDING') {
        await this.repo.updateStatus(payment.id, 'FAILED')
      }
    }

    return { received: true }
  }

  private getItemName(paymentType: PaymentType): string {
    switch (paymentType) {
      case 'VISIT':
        return 'Visit - Akses Gym 1 Kali'
      case 'MEMBERSHIP_NEW':
        return 'Member Baru - Kartu Member + Membership 1 Bulan'
      case 'MEMBERSHIP_RENEWAL':
        return 'Perpanjangan Membership - 1 Bulan'
      default:
        return 'Pembayaran Ganesha Gym'
    }
  }

  private cashResponse(
    status: 'success' | 'failed' | 'pending',
    orderId: string,
    amount: number,
    message: string,
    transactionStatus: string,
    settlementTime: string | null
  ) {
    return {
      success: true,
      provider: 'cash',
      orderId,
      status,
      message,
      transactionStatus,
      paymentType: 'cash',
      grossAmount: amount,
      settlementTime,
    }
  }

  private getPakasirEnv() {
    const project = process.env.PAKASIR_PROJECT
    const apiKey = process.env.PAKASIR_API_KEY
    const baseUrl = process.env.PAKASIR_BASE_URL || 'https://app.pakasir.com'
    if (!project || !apiKey) {
      throw new AppError('Konfigurasi PaKasir belum lengkap. Pastikan PAKASIR_PROJECT dan PAKASIR_API_KEY sudah di-set.', 500)
    }
    return { project, apiKey, baseUrl }
  }

  private async createPakasirTransaction(orderId: string, amount: number) {
    const { project, apiKey, baseUrl } = this.getPakasirEnv()
    const response = await fetch(`${baseUrl}/api/transactioncreate/qris`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project,
        order_id: orderId,
        amount,
        api_key: apiKey,
      }),
      cache: 'no-store',
    })
    const data = await response.json()
    if (!response.ok || !data?.payment) {
      throw new AppError(data?.error || 'Gagal membuat transaksi QRIS di PaKasir', response.status || 500)
    }
    return data
  }

  private async getPakasirTransaction(orderId: string, amount: number) {
    const { project, apiKey, baseUrl } = this.getPakasirEnv()
    const statusUrl = new URL(`${baseUrl}/api/transactiondetail`)
    statusUrl.searchParams.set('project', project)
    statusUrl.searchParams.set('amount', String(amount))
    statusUrl.searchParams.set('order_id', orderId)
    statusUrl.searchParams.set('api_key', apiKey)

    const response = await fetch(statusUrl.toString(), { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || !data?.transaction) {
      throw new AppError(data?.error || 'Gagal mengecek status transaksi di PaKasir', response.status || 500)
    }
    return data.transaction
  }
}

