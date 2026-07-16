import { NextRequest } from 'next/server'
import { BaseController } from '@/src/controllers/base-controller'
import { MembershipReminderService } from '@/src/services/membership-reminder-service'

export class MembershipReminderCronController extends BaseController {
  constructor(private readonly reminderService: MembershipReminderService = new MembershipReminderService()) {
    super()
  }

  async runExpiredJob(request: NextRequest) {
    const auth = this.reminderService.authorizeCron({
      authorizationHeader: request.headers.get('authorization'),
    })
    if (!auth.ok) {
      const isServerError = auth.reason?.includes('CRON_SECRET')
      return this.json({ error: auth.reason }, { status: isServerError ? 500 : 401 })
    }

    const result = await this.reminderService.runExpiredReminderJob()
    if (!result.success) return this.json(result, { status: 500 })
    return this.json(result)
  }
}

