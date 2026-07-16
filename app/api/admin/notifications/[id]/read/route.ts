import { NextRequest } from 'next/server'
import { AdminNotificationController } from '@/src/controllers/admin/notification-controller'

const adminNotificationController = new AdminNotificationController()

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return adminNotificationController.markRead(params.id)
}
