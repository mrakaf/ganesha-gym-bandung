'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { 
  Bell, 
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Filter,
  RefreshCw,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
  link?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const lastNotificationIdRef = useRef<string | null>(null)

  // Fungsi untuk memainkan suara notifikasi
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Suara notifikasi (2 beeps)
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      
      // Beep kedua
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator()
        const gainNode2 = audioContext.createGain()
        
        oscillator2.connect(gainNode2)
        gainNode2.connect(audioContext.destination)
        
        oscillator2.frequency.value = 1000
        oscillator2.type = 'sine'
        
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
        
        oscillator2.start(audioContext.currentTime)
        oscillator2.stop(audioContext.currentTime + 0.15)
      }, 150)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }, [soundEnabled])

  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('filter', filter)
      
      const response = await fetch(`/api/admin/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        const newNotifications = data.notifications || []
        
        // Cek apakah ada notifikasi baru
        if (newNotifications.length > 0 && lastNotificationIdRef.current) {
          const latestNotification = newNotifications[0]
          if (latestNotification.id !== lastNotificationIdRef.current && !latestNotification.read) {
            playNotificationSound()
          }
        } else if (newNotifications.length > 0 && !lastNotificationIdRef.current) {
          // Pertama kali load, simpan ID notifikasi terakhir
          lastNotificationIdRef.current = newNotifications[0].id
        }
        
        setNotifications(newNotifications)
      } else {
        setNotifications([])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }, [filter, playNotificationSound])

  useEffect(() => {
    fetchNotifications()
    // Polling setiap 10 detik untuk notifikasi baru
    const interval = setInterval(() => {
      fetchNotifications()
    }, 10000)
    
    // Refresh unread count in sidebar after marking read/all read
    const event = new CustomEvent('notificationsChanged')
    window.dispatchEvent(event)
    
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
      await fetchNotifications()
      window.dispatchEvent(new CustomEvent('notificationsChanged'))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/admin/notifications/read-all', { method: 'POST' })
      await fetchNotifications()
      window.dispatchEvent(new CustomEvent('notificationsChanged'))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
      await fetchNotifications()
      window.dispatchEvent(new CustomEvent('notificationsChanged'))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const deleteAllNotifications = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('filter', filter)
      
      await fetch(`/api/admin/notifications/delete-all?${params}`, { method: 'POST' })
      await fetchNotifications()
      window.dispatchEvent(new CustomEvent('notificationsChanged'))
    } catch (error) {
      console.error('Error deleting all notifications:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins text-lg">Memuat notifikasi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-oswald font-bold text-white mb-2 drop-shadow-lg flex items-center gap-3">
              <Bell className="w-8 h-8" />
              Notifications
            </h1>
            <p className="text-white/90 font-poppins text-sm md:text-base">
              {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg border border-white/30 transition-all"
              title={soundEnabled ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-white" />
              ) : (
                <VolumeX className="w-5 h-5 text-white" />
              )}
            </button>
            {notifications.length > 0 && (
              <button
                onClick={deleteAllNotifications}
                className="px-4 py-2 bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 rounded-lg border border-red-400/30 transition-all text-white font-poppins text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Semua
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg border border-white/30 transition-all text-white font-poppins text-sm"
              >
                Tandai Semua Dibaca
              </button>
            )}
            <button
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg border border-white/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1 font-oswald">{notifications?.length || 0}</h3>
          <p className="text-gray-600 text-sm font-poppins font-medium">Total Notifikasi</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1 font-oswald">{unreadCount}</h3>
          <p className="text-gray-600 text-sm font-poppins font-medium">Belum Dibaca</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-1 font-oswald">{(notifications?.length || 0) - unreadCount}</h3>
          <p className="text-gray-600 text-sm font-poppins font-medium">Sudah Dibaca</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent font-poppins"
          >
            <option value="all">Semua</option>
            <option value="unread">Belum Dibaca</option>
            <option value="read">Sudah Dibaca</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {!notifications || notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-poppins text-lg">Tidak ada notifikasi</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all hover:shadow-xl ${
                notification.read ? 'opacity-75' : getNotificationColor(notification.type)
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-poppins font-bold text-gray-900">{notification.title}</h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-accent rounded-full"></span>
                      )}
                    </div>
                    <p className="text-gray-600 font-poppins text-sm mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500 font-poppins">
                      {format(new Date(notification.createdAt), 'dd MMMM yyyy HH:mm', { locale: id })}
                    </p>
                    {notification.link && (
                      <Link
                        href={notification.link}
                        className="text-sm text-accent hover:text-accent-light font-poppins font-medium mt-2 inline-block"
                      >
                        Lihat Detail →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Tandai sebagai dibaca"
                    >
                      <CheckCircle2 className="w-5 h-5 text-gray-400 hover:text-green-600" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

