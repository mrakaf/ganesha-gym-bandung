export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminReminderController } from '@/src/controllers/admin/reminder-controller'

const adminReminderController = new AdminReminderController()

export async function POST(request: NextRequest) {
  return adminReminderController.testEmail(request)
}
