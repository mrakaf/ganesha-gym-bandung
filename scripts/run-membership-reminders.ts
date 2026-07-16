/**
 * Jalankan job reminder membership (sama dengan GET /api/cron/membership-reminders).
 * Berguna untuk lokal, VPS, atau Task Scheduler Windows tanpa HTTP.
 *
 * Pastikan .env / .env.local berisi DATABASE_URL, SMTP_*, APP_BASE_URL, dll.
 *   npx tsx scripts/run-membership-reminders.ts
 */

import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

import { runMembershipReminderJob } from '../lib/membership-reminder-job'

async function main() {
  const result = await runMembershipReminderJob('EXPIRED')
  console.log(JSON.stringify(result, null, 2))
  if (!result.success) {
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
