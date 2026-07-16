import { prisma } from '@/lib/db'

const memberCheckoutSelect = {
  id: true,
  mustPayRegistrationFee: true,
  payments: {
    where: {
      status: 'PAID' as const,
      type: { in: ['MEMBERSHIP_NEW' as const, 'MEMBERSHIP_RENEWAL' as const] },
    },
    select: { id: true },
    take: 1,
  },
} satisfies Parameters<typeof prisma.member.findUnique>[0]['select']

export class PaymentRepository {
  findMemberForCheckout(email: string) {
    return prisma.member.findUnique({
      where: { email },
      select: memberCheckoutSelect,
    })
  }

  /**
   * Pastikan ada baris Member untuk email checkout agar payment selalu punya memberId.
   * Tanpa ini, konfirmasi tunai/QRIS tidak bisa mengaktifkan membership / nomor kartu.
   */
  async ensureMemberForCheckout(email: string, displayName?: string | null) {
    const normalized = String(email || '').trim().toLowerCase()
    const existing = await prisma.member.findUnique({
      where: { email: normalized },
      select: memberCheckoutSelect,
    })
    if (existing) return existing

    const name =
      (displayName && String(displayName).trim()) || normalized.split('@')[0] || 'Member'
    try {
      return await prisma.member.create({
        data: {
          email: normalized,
          name,
          isActive: false,
        },
        select: memberCheckoutSelect,
      })
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'P2002') {
        const retry = await prisma.member.findUnique({
          where: { email: normalized },
          select: memberCheckoutSelect,
        })
        if (retry) return retry
      }
      throw e
    }
  }

  createPayment(data: {
    memberId: string | null
    type: 'VISIT' | 'MEMBERSHIP_NEW' | 'MEMBERSHIP_RENEWAL'
    amount: number
    status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'
    paymentMethod: string
    orderId: string
    description: string
  }) {
    return prisma.payment.create({
      data: {
        memberId: data.memberId,
        type: data.type,
        amount: data.amount,
        status: data.status,
        paymentMethod: data.paymentMethod,
        orderId: data.orderId,
        description: data.description,
      },
    })
  }

  findLatestByOrderId(orderId: string) {
    return prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    })
  }

  updateStatus(id: string, status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED') {
    return prisma.payment.update({ where: { id }, data: { status } })
  }

  markPaid(id: string) {
    return prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    })
  }

  findMemberIdByEmail(email: string) {
    return prisma.member.findUnique({ where: { email }, select: { id: true } })
  }

  findHistoryByMemberId(memberId: string) {
    return prisma.payment.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        paymentMethod: true,
        orderId: true,
        description: true,
        paidAt: true,
        createdAt: true,
      },
    })
  }
}

