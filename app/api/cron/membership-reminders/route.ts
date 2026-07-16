import { NextRequest } from 'next/server'
import { MembershipReminderCronController } from '@/src/controllers/membership-reminder-cron-controller'

/** Batas eksekusi di Vercel (detik). Naikkan di plan yang mendukung jika batch email besar. */
export const maxDuration = 60

const membershipReminderCronController = new MembershipReminderCronController()

/**
 * Jadwalkan panggilan GET (atau POST) harian lewat Vercel Cron / cron eksternal.
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  return membershipReminderCronController.runExpiredJob(request)
}

export async function POST(request: NextRequest) {
  return GET(request)
}
