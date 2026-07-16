export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminNotificationController } from '@/src/controllers/admin/notification-controller'

const adminNotificationController = new AdminNotificationController()

export async function GET(request: NextRequest) {
  return adminNotificationController.list(request)
}

export async function POST(request: NextRequest) {
  return adminNotificationController.create(request)
}
