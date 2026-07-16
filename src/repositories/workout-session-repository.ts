import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export class WorkoutSessionRepository {
  create(memberId: string, data: { completedAt: Date; durationMinutes?: number | null; notes?: string | null; exercises: Prisma.InputJsonValue }) {
    return prisma.workoutSession.create({
      data: {
        memberId,
        completedAt: data.completedAt,
        durationMinutes: data.durationMinutes ?? null,
        notes: data.notes ?? null,
        exercises: data.exercises,
      },
    })
  }

  findByMemberId(memberId: string, take = 50) {
    return prisma.workoutSession.findMany({
      where: { memberId },
      orderBy: { completedAt: 'desc' },
      take,
      select: {
        id: true,
        completedAt: true,
        durationMinutes: true,
        notes: true,
        exercises: true,
        createdAt: true,
      },
    })
  }
}
