import { NextRequest } from 'next/server'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminNotificationController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async list(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const filter = new URL(request.url).searchParams.get('filter') || 'all'
      return this.json({ notifications: await this.adminService.listNotifications(filter) })
    } catch (error) {
      return this.handleError(error, 'Error fetching notifications:', 'Gagal memuat notifications')
    }
  }

  async unreadCount() {
    try {
      await this.requireCurrentAdmin()
      return this.json({ count: await this.adminService.getUnreadNotificationsCount() })
    } catch (error) {
      return this.handleError(error, 'Error fetching unread count:', 'Gagal memuat count')
    }
  }

  async create(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const body = await request.json()
      const notification = await this.adminService.createNotification(body)
      return this.json({ success: true, notification })
    } catch (error) {
      return this.handleError(error, 'Error creating notification:', 'Gagal membuat notification')
    }
  }

  async markAllRead() {
    try {
      await this.requireCurrentAdmin()
      await this.adminService.markAllNotificationsRead()
      return this.json({ success: true })
    } catch (error) {
      return this.handleError(error, 'Error marking all notifications as read:', 'Gagal update notifications')
    }
  }

  async remove(id: string) {
    try {
      await this.requireCurrentAdmin()
      const ok = await this.adminService.deleteNotification(id)
      return this.json({ success: true, deleted: ok })
    } catch (error) {
      return this.handleError(error, 'Error deleting notification:', 'Gagal menghapus notification')
    }
  }

  async removeAll(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const searchParams = new URL(request.url).searchParams
      const filter = searchParams.get('filter') || 'all'
      const ok = await this.adminService.deleteAllNotifications(filter)
      return this.json({ success: true, deleted: ok })
    } catch (error) {
      return this.handleError(error, 'Error deleting all notifications:', 'Gagal menghapus semua notification')
    }
  }

  async markRead(id: string) {
    try {
      await this.requireCurrentAdmin()
      const ok = await this.adminService.markNotificationRead(id)
      return this.json({ success: true, updated: ok })
    } catch (error) {
      return this.handleError(error, 'Error marking notification as read:', 'Gagal update notification')
    }
  }
}

