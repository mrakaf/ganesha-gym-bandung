import { toRelativeAdminPath } from '@/lib/to-relative-admin-path'

export type AdminNotificationRecord = {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
  link?: string
}

const notifications: AdminNotificationRecord[] = []

export function getAdminNotifications(): AdminNotificationRecord[] {
  return notifications
}

export function addAdminNotification(payload: {
  type?: AdminNotificationRecord['type']
  title: string
  message: string
  link?: string | null
}): AdminNotificationRecord {
  const link = toRelativeAdminPath(payload.link ?? undefined)
  const record: AdminNotificationRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: payload.type || 'info',
    title: payload.title,
    message: payload.message,
    read: false,
    createdAt: new Date(),
    link,
  }
  notifications.unshift(record)
  return record
}

export function markAdminNotificationRead(id: string): boolean {
  const n = notifications.find((x) => x.id === id)
  if (!n) return false
  n.read = true
  return true
}

export function removeAdminNotification(id: string): boolean {
  const i = notifications.findIndex((x) => x.id === id)
  if (i === -1) return false
  notifications.splice(i, 1)
  return true
}

export function sanitizeNotificationForApi<N extends { link?: string | null }>(n: N): N {
  const link = toRelativeAdminPath(n.link ?? undefined)
  return { ...n, link }
}
