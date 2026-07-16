import { prisma } from '@/lib/db'

export class MemberRepository {
  findByUsername(username: string) {
    return prisma.member.findUnique({ where: { username } })
  }

  findByEmail(email: string) {
    return prisma.member.findUnique({ where: { email } })
  }

  findById(id: string) {
    return prisma.member.findUnique({ where: { id } })
  }

  create(data: {
    name: string
    email?: string
    username?: string
    password?: string
    isActive?: boolean
  }) {
    return prisma.member.create({ data })
  }

  updateByEmail(email: string, data: { 
    name?: string; 
    phone?: string; 
    password?: string; 
    username?: string;
    height?: number;
    weight?: number;
    gymExperienceMonths?: number;
    experienceLevel?: 'PEMULA' | 'MENENGAH' | 'ADVANCED';
    gender?: 'PRIA' | 'WANITA' | 'LAINNYA';
    dateOfBirth?: Date;
  }) {
    return prisma.member.update({
      where: { email },
      data,
    })
  }

  updateById(id: string, data: { password?: string; username?: string }) {
    return prisma.member.update({
      where: { id },
      data,
    })
  }

  findProfileByEmailOrUsername(email?: string | null, username?: string | null) {
    return prisma.member.findUnique({
      where: email ? { email } : { username: username! },
      include: {
        visits: true,
        payments: { where: { status: 'PAID' } },
      },
    })
  }

  cleanupPasswordResetTokens(memberId: string) {
    return prisma.passwordResetToken.deleteMany({
      where: {
        memberId,
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    })
  }

  createPasswordResetToken(memberId: string, tokenHash: string, expiresAt: Date) {
    return prisma.passwordResetToken.create({
      data: { memberId, tokenHash, expiresAt },
    })
  }

  findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, expiresAt: true, usedAt: true, memberId: true },
    })
  }

  markPasswordResetTokenUsed(id: string, usedAt: Date) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt },
    })
  }

  findUsername(username: string) {
    return prisma.member.findUnique({ where: { username }, select: { id: true } })
  }
}

