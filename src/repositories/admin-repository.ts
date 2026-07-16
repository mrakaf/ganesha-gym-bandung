import { prisma } from '@/lib/db'

export class AdminRepository {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } })
  }

  findUserByIdMinimal(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    })
  }

  countMembers(where: any = {}) {
    return prisma.member.count({ where })
  }

  countVisits(where: any = {}) {
    return prisma.visit.count({ where })
  }

  countPayments(where: any = {}) {
    return prisma.payment.count({ where })
  }

  aggregateRevenue(where: any = {}) {
    return prisma.payment.aggregate({
      where,
      _sum: { amount: true },
    })
  }

  findMembers(where: any, skip: number, take: number) {
    return prisma.member.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { visits: true, payments: true } },
        visits: { orderBy: { visitDate: 'desc' }, take: 1 },
      },
    })
  }

  createMember(data: any) {
    return prisma.member.create({
      data,
      include: {
        _count: { select: { visits: true, payments: true } },
      },
    })
  }

  async createMemberWithAutoCard(
    data: any,
    options: { cardSuffix?: string } = {}
  ) {
    const cardSuffix = options.cardSuffix ?? '04'
    return prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: { ...data, memberCardId: null },
        include: { _count: { select: { visits: true, payments: true } } },
      })

      const issue = await tx.memberCardIssue.create({
        data: { memberId: created.id },
      })

      const memberCardId = `${issue.id}/${cardSuffix}`

      return tx.member.update({
        where: { id: created.id },
        data: { memberCardId },
        include: { _count: { select: { visits: true, payments: true } } },
      })
    })
  }

  findMemberById(id: string) {
    return prisma.member.findUnique({ where: { id } })
  }

  async findMemberByIdDetail(id: string) {
    try {
      return await prisma.member.findUnique({
        where: { id },
        include: {
          _count: { select: { visits: true, payments: true } },
          visits: { take: 5, orderBy: { visitDate: 'desc' } },
          payments: { take: 5, orderBy: { createdAt: 'desc' } },
          reminders: { orderBy: { sentAt: 'desc' } },
        },
      })
    } catch (error) {
      console.error('Error in findMemberByIdDetail:', error)
      return await prisma.member.findUnique({
        where: { id },
        include: {
          _count: { select: { visits: true, payments: true } },
          visits: { take: 5, orderBy: { visitDate: 'desc' } },
          payments: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      })
    }
  }

  updateMemberById(id: string, data: any) {
    return prisma.member.update({
      where: { id },
      data,
      include: {
        _count: { select: { visits: true, payments: true } },
      },
    })
  }

  deleteMemberById(id: string) {
    return prisma.member.delete({ where: { id } })
  }

  findMemberByEmail(email: string) {
    return prisma.member.findUnique({ where: { email } })
  }

  findMemberByUsername(username: string) {
    return prisma.member.findUnique({ where: { username } })
  }

  findMemberByCardId(memberCardId: string) {
    return prisma.member.findUnique({ where: { memberCardId } })
  }

  findPayments(where: any, skip: number, take: number) {
    return prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        member: {
          select: { id: true, name: true, email: true, memberCardId: true, phone: true },
        },
      },
    })
  }

  findPaymentById(id: string) {
    return prisma.payment.findUnique({ where: { id } })
  }

  updatePaymentPaid(id: string) {
    return prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    })
  }

  findOverdueMembers(limit = 10) {
    return prisma.member.findMany({
      where: {
        membershipEnd: { lt: new Date() },
        isActive: true,
        payments: { 
          some: { 
            type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] }
          }
        }
      },
      include: {
        payments: {
          where: {
            status: 'PAID',
            type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] },
          },
          orderBy: { paidAt: 'desc' },
          take: 1,
        },
      },
      take: limit,
      orderBy: { membershipEnd: 'asc' },
    })
  }

  findAllExercises() {
    return prisma.exercise.findMany({ orderBy: { name: 'asc' } })
  }

  updateExerciseInstruction(id: string, instructionsId: string | null) {
    return prisma.exercise.update({
      where: { id },
      data: { instructionsId },
    })
  }

  findVisits(where: any, skip: number, take: number) {
    return prisma.visit.findMany({
      where,
      skip,
      take,
      orderBy: { visitDate: 'desc' },
      include: {
        member: {
          select: { id: true, name: true, email: true, memberCardId: true, phone: true },
        },
      },
    })
  }

  countVisitsByWhere(where: any) {
    return prisma.visit.count({ where })
  }

  createMemberMinimal(data: { name: string }) {
    return prisma.member.create({
      data: { name: data.name },
      select: { id: true, name: true, phone: true },
    })
  }

  updateMemberName(memberId: string, name: string) {
    return prisma.member.update({
      where: { id: memberId },
      data: { name },
      select: { id: true, name: true, phone: true },
    })
  }

  createVisit(data: { memberId?: string; visitorName?: string; visitDate: Date; notes: string | null; createdAt?: Date }) {
    return prisma.visit.create({
      data: {
        ...data,
        checkInStatus: 'CHECKED_IN',
      },
      include: {
        member: {
          select: { id: true, name: true, email: true, memberCardId: true, phone: true },
        },
      },
    })
  }

  updateVisit(id: string, data: { visitorName?: string; visitDate?: Date; notes?: string | null; createdAt?: Date }) {
    return prisma.visit.update({
      where: { id },
      data,
      include: {
        member: {
          select: { id: true, name: true, email: true, memberCardId: true, phone: true },
        },
      },
    })
  }

  deleteVisit(id: string) {
    return prisma.visit.delete({ where: { id } })
  }

  findVisitById(id: string) {
    return prisma.visit.findUnique({
      where: { id },
      include: {
        member: {
          select: { id: true, name: true, email: true, memberCardId: true, phone: true },
        },
      },
    })
  }

  findPaidPaymentsInRange(start: Date, end: Date) {
    return prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: start, lte: end },
      },
      orderBy: { paidAt: 'desc' },
      include: {
        member: {
          select: { name: true, email: true, memberCardId: true, phone: true },
        },
      },
    })
  }

  createAdminPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.adminPasswordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    })
  }

  findAdminPasswordResetToken(tokenHash: string) {
    return prisma.adminPasswordResetToken.findUnique({
      where: { tokenHash },
    })
  }
}

