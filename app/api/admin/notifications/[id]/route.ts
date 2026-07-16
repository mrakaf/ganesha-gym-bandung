export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminNotificationController } from '@/src/controllers/admin/notification-controller'

const adminNotificationController = new AdminNotificationController()

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return adminNotificationController.remove(params.id)
}
