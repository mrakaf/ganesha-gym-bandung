import type { PaymentType, Prisma } from '@prisma/client'
import { addAdminNotification } from '@/lib/admin-notifications'

export function addThirtyDays(baseDate: Date): Date {
  return new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
}

export async function applyBenefitsForPaidPayment(
  tx: Prisma.TransactionClient,
  params: {
    memberId: string | null
    type: PaymentType
    orderId: string | null
    paymentMethod?: string | null
  }
): Promise<void> {
  const { memberId, type, orderId, paymentMethod } = params
  if (!memberId) return

  const ref = orderId || 'unknown'
  const isCashPayment = paymentMethod?.toLowerCase() === 'cash'

  // Get member name for notification
  const memberData = await tx.member.findUnique({
    where: { id: memberId },
    select: { name: true }
  })

  if (type === 'VISIT') {
    const now = new Date()
    const accessEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const visit = await tx.visit.create({
      data: {
        memberId,
        checkInStatus: isCashPayment ? 'CHECKED_IN' : 'PENDING',
        notes: `Visit berbayar (${ref})${isCashPayment ? ' | Check-in via Cash Confirmation' : ''}`,
        visitDate: now,
      },
    })

    await tx.member.update({
      where: { id: memberId },
      data: {
        accessType: 'VISIT',
        accessStart: now,
        accessEnd,
      },
    })
    
    // If it's cash payment, mark payment as used right away
    if (isCashPayment && orderId) {
      const paymentToUse = await tx.payment.findFirst({
        where: {
          memberId: memberId,
          type: 'VISIT',
          status: 'PAID',
          isVisitUsed: false,
          orderId: orderId,
        },
        orderBy: { createdAt: 'desc' },
      })
      if (paymentToUse) {
        await tx.payment.update({
          where: { id: paymentToUse.id },
          data: { isVisitUsed: true },
        })
      }
    }
    
    // Send notification for visit payment
    await addAdminNotification({
      type: 'success',
      title: 'Pembayaran Visit Berhasil',
      message: `${memberData?.name || 'Member'} telah melakukan pembayaran visit.`,
      link: `/admin/members/${memberId}`,
    })
  } else if (type === 'MEMBERSHIP_NEW' || type === 'MEMBERSHIP_RENEWAL') {
    const member = await tx.member.findUnique({
      where: { id: memberId },
      select: { membershipEnd: true, memberCardId: true, name: true },
    })
    const now = new Date()
    const membershipStart = now
    const baseDate =
      member?.membershipEnd && member.membershipEnd > now ? member.membershipEnd : now
    const membershipEnd = addThirtyDays(baseDate)

    if (type === 'MEMBERSHIP_NEW' && !member?.memberCardId) {
      const issue = await tx.memberCardIssue.create({ data: { memberId } })
      await tx.member.update({
        where: { id: memberId },
        data: { memberCardId: `${issue.id}/04` },
      })
    }

    await tx.member.update({
      where: { id: memberId },
      data: {
        isActive: true,
        mustPayRegistrationFee: false,
        membershipStart,
        membershipEnd,
        accessType: 'MEMBERSHIP',
        accessStart: membershipStart,
        accessEnd: membershipEnd,
      },
    })
    
    // Send notification for membership payment
    const notificationTitle = type === 'MEMBERSHIP_NEW' ? 'Pembayaran Member Baru Berhasil' : 'Perpanjangan Membership Berhasil'
    const notificationMessage = type === 'MEMBERSHIP_NEW' 
      ? `${member?.name || 'Member'} telah mendaftar membership baru.`
      : `${member?.name || 'Member'} telah memperpanjang membership.`
    
    await addAdminNotification({
      type: 'success',
      title: notificationTitle,
      message: notificationMessage,
      link: `/admin/members/${memberId}`,
    })
  }
}
