import { Prisma } from '@prisma/client'
import { hasPremiumAccess } from '@/src/helpers/premium-access'
import { AppError } from '@/src/models/app-error'
import { MemberRepository } from '@/src/repositories/member-repository'
import { WorkoutSessionRepository } from '@/src/repositories/workout-session-repository'

export type WorkoutExerciseSnapshot = { name: string; muscle?: string }

export class WorkoutSessionService {
  constructor(
    private readonly memberRepo: MemberRepository = new MemberRepository(),
    private readonly workoutRepo: WorkoutSessionRepository = new WorkoutSessionRepository()
  ) {}

  private async requireMemberWithPremium(emailRaw: string | null | undefined, usernameRaw?: string | null) {
    const email = String(emailRaw || '').trim().toLowerCase()
    const username = String(usernameRaw || '').trim()
    if (!email && !username) throw new AppError('Email atau username wajib dikirim.', 400)

    const member = email
      ? await this.memberRepo.findByEmail(email)
      : await this.memberRepo.findByUsername(username)
    if (!member) throw new AppError('Member tidak ditemukan.', 404)
    if (!hasPremiumAccess(member)) {
      throw new AppError('Fitur ini hanya untuk member atau visit aktif.', 403)
    }
    return member
  }

  async logSession(
    emailRaw: string | null | undefined,
    usernameRaw: string | null | undefined,
    input: {
      completedAt?: string | null
      durationMinutes?: number | null
      notes?: string | null
      exercises?: WorkoutExerciseSnapshot[]
      exerciseNames?: string[]
    }
  ) {
    const member = await this.requireMemberWithPremium(emailRaw, usernameRaw)

    let exercises: WorkoutExerciseSnapshot[] = Array.isArray(input.exercises) ? input.exercises : []
    if (exercises.length === 0 && Array.isArray(input.exerciseNames)) {
      exercises = input.exerciseNames.map((n) => ({ name: String(n).trim() })).filter((e) => e.name.length > 0)
    }

    if (exercises.length === 0) {
      throw new AppError('Minimal satu nama gerakan (atau daftar exercises) wajib diisi.', 400)
    }

    let completedAt = new Date()
    if (input.completedAt) {
      const d = new Date(input.completedAt)
      if (!Number.isNaN(d.getTime())) completedAt = d
    }

    const duration =
      typeof input.durationMinutes === 'number' && input.durationMinutes > 0
        ? Math.min(Math.floor(input.durationMinutes), 24 * 60)
        : null
    const notes = input.notes != null ? String(input.notes).slice(0, 2000) : null

    const row = await this.workoutRepo.create(member.id, {
      completedAt,
      durationMinutes: duration,
      notes,
      exercises: exercises as unknown as Prisma.InputJsonValue,
    })

    return {
      id: row.id,
      completedAt: row.completedAt.toISOString(),
      durationMinutes: row.durationMinutes,
      notes: row.notes,
      exercises: row.exercises,
    }
  }

  async listHistory(emailRaw: string | null | undefined, usernameRaw: string | null | undefined, take = 50) {
    const member = await this.requireMemberWithPremium(emailRaw, usernameRaw)
    const rows = await this.workoutRepo.findByMemberId(member.id, Math.min(take, 100))
    return rows.map((r) => ({
      id: r.id,
      completedAt: r.completedAt.toISOString(),
      durationMinutes: r.durationMinutes,
      notes: r.notes,
      exercises: r.exercises,
      createdAt: r.createdAt.toISOString(),
    }))
  }
}
