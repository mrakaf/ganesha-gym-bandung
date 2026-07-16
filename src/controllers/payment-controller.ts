import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/src/services/payment-service'
import { BaseController } from '@/src/controllers/base-controller'

export class PaymentController extends BaseController {
  constructor(private readonly paymentService: PaymentService = new PaymentService()) {
    super()
  }

  async create(request: NextRequest) {
    try {
      const body = await request.json()
      const result = await this.paymentService.createCheckout({
        paymentType: body.paymentType,
        amount: body.amount,
        userEmail: body.userEmail,
        userName: body.userName,
        checkoutMethod: body.checkoutMethod,
      })
      return this.json(result)
    } catch (error: unknown) {
      return this.handleError(error, 'Error creating payment checkout:', 'Gagal membuat transaksi pembayaran')
    }
  }

  async status(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const orderId = searchParams.get('orderId')
      const amount = Number(searchParams.get('amount'))
      const result = await this.paymentService.getStatus(orderId || '', amount)
      return this.json(result)
    } catch (error: unknown) {
      return this.handleError(error, 'Error checking payment status:', 'Gagal mengecek status pembayaran')
    }
  }

  async history(request: NextRequest) {
    try {
      const email = request.nextUrl.searchParams.get('email')
      const payments = await this.paymentService.getHistory(email || '')
      return this.json({ success: true, payments })
    } catch (error: unknown) {
      return this.handleError(error, 'Error fetching payment history:', 'Gagal mengambil riwayat pembayaran')
    }
  }

  async notification(request: NextRequest) {
    try {
      const body = await request.json()
      const result = await this.paymentService.handleNotification(body)
      return this.json(result)
    } catch (error: any) {
      console.error('Error processing PaKasir notification:', error)
      return NextResponse.json({ received: false, error: error?.message }, { status: 200 })
    }
  }

}

