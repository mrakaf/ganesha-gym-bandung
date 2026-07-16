import { runMembershipReminderJob } from '@/lib/membership-reminder-job'
import { CronAuthInput } from '@/src/models/membership-reminder'

export class MembershipReminderService {
  authorizeCron(input: CronAuthInput): { ok: boolean; reason?: string } {
    const secret = process.env.CRON_SECRET
    if (!secret) return { ok: false, reason: 'CRON_SECRET belum di-set di environment' }
    const raw = input.authorizationHeader?.trim()
    const token = raw ? /^Bearer\s+(\S+)/i.exec(raw)?.[1] : null
    return token === secret ? { ok: true } : { ok: false, reason: 'Unauthorized' }
  }

  async runExpiredReminderJob() {
    return runMembershipReminderJob('EXPIRED')
  }
}

