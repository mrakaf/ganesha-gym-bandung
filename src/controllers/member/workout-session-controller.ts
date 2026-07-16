import { NextRequest } from 'next/server'
import { WorkoutSessionService } from '@/src/services/workout-session-service'
import { BaseController } from '@/src/controllers/base-controller'

export class WorkoutSessionController extends BaseController {
  constructor(private readonly service: WorkoutSessionService = new WorkoutSessionService()) {
    super()
  }

  async log(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const email = body?.email != null ? String(body.email) : ''
      const username = body?.username != null ? String(body.username) : ''
      const result = await this.service.logSession(email, username, {
        completedAt: body?.completedAt,
        durationMinutes: body?.durationMinutes,
        notes: body?.notes,
        exercises: body?.exercises,
        exerciseNames: body?.exerciseNames,
      })
      return this.json({ success: true, session: result })
    } catch (error) {
      return this.handleError(error, 'Error logging workout:', 'Gagal menyimpan riwayat latihan')
    }
  }

  async history(request: NextRequest) {
    try {
      const email = request.nextUrl.searchParams.get('email')
      const username = request.nextUrl.searchParams.get('username')
      const limitRaw = request.nextUrl.searchParams.get('limit')
      const limit = limitRaw ? parseInt(limitRaw, 10) : 50
      const sessions = await this.service.listHistory(
        email,
        username,
        Number.isFinite(limit) ? limit : 50
      )
      return this.json({ success: true, sessions })
    } catch (error) {
      return this.handleError(error, 'Error listing workout history:', 'Gagal mengambil riwayat latihan')
    }
  }
}
