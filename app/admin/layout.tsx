'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAdmin } from '@/contexts/AdminContext'
import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Shield,
  ChevronRight,
  ClipboardList,
  Bell,
  Dumbbell
} from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { admin, loading, logout } = useAdmin()
  const { success } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const lastUnreadCountRef = useRef(0)

  // Routes that do not require authentication
  const isPublicRoute = 
    pathname === '/admin/login' || 
    pathname === '/admin/forgot-password' || 
    pathname === '/admin/reset-password'

  // Fetch unread notifications count
  useEffect(() => {
    // Skip redirect untuk public pages
    if (isPublicRoute) {
      return
    }
    
    if (!loading && !admin) {
      router.push('/admin/login')
    }
  }, [admin, loading, router, pathname, isPublicRoute])

  // Fungsi untuk memainkan suara notifikasi
  const playNotificationSound = () => {
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
  }

  // Fetch unread notifications count
  useEffect(() => {
    if (!admin || isPublicRoute) return

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/admin/notifications/unread-count')
        if (res.ok) {
          const data = await res.json()
          const newCount = data.count || 0
          
          // Cek apakah ada penambahan notifikasi baru
          if (newCount > lastUnreadCountRef.current) {
            playNotificationSound()
          }
          
          lastUnreadCountRef.current = newCount
          setUnreadCount(newCount)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    // Pertama kali load, simpan count awal tanpa mainkan suara
    const initialLoad = async () => {
      try {
        const res = await fetch('/api/admin/notifications/unread-count')
        if (res.ok) {
          const data = await res.json()
          const initialCount = data.count || 0
          lastUnreadCountRef.current = initialCount
          setUnreadCount(initialCount)
        }
      } catch (error) {
        console.error('Error fetching initial unread count:', error)
      }
    }

    initialLoad()
    
    // Listen for custom event to refresh count
    window.addEventListener('notificationsChanged', fetchUnreadCount)
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationsChanged', fetchUnreadCount)
    }
  }, [admin, isPublicRoute])

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    try {
      await logout()
      success('Anda telah berhasil logout.')
      // Redirect setelah logout
      router.push('/admin/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Early return SETELAH semua hooks dipanggil
  // Skip layout untuk public pages
  if (isPublicRoute) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark via-primary to-primary-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-serif">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/members', icon: Users, label: 'Members' },
    { href: '/admin/visits', icon: CalendarCheck, label: 'Visits' },
    { href: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { href: '/admin/laporan', icon: ClipboardList, label: 'Laporan' },
    { href: '/admin/exercises', icon: Dumbbell, label: 'Data latihan' },
    { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* Top Navigation Bar - Glassmorphism */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-slate-300 p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
                <div className="relative">
                  <Image
                    src="/images/logoganesha.jpeg"
                    alt="Ganesha Gym"
                    width={36}
                    height={36}
                    className="rounded-lg ring-2 ring-cyan-500/30 group-hover:ring-cyan-400/50 transition-all duration-300"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-slate-900"></div>
                </div>
                <div className="hidden sm:block">
                  <span className="text-white font-oswald text-lg font-bold leading-tight block tracking-wide">
                    GANESHA GYM
                  </span>
                  <span className="text-cyan-400/70 font-poppins text-[10px] tracking-widest uppercase">
                    Admin Panel
                  </span>
                </div>
              </Link>
            </div>

            {/* Admin Info & Logout */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2.5 bg-white/[0.06] px-3.5 py-2 rounded-lg border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.1] hover:border-cyan-500/20">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center ring-1 ring-cyan-500/30">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-slate-200 font-poppins text-sm font-medium">{admin.name}</span>
              </div>
              <button
                onClick={handleLogoutConfirm}
                className="flex items-center space-x-2 px-3.5 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 border border-white/[0.06] hover:border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-poppins text-sm hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar - Desktop - Dark Navy Premium */}
        <aside className="hidden lg:flex lg:flex-col w-[260px] min-h-[calc(100vh-4rem)] sticky top-16" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
          <div className="p-4 space-y-1 flex-1">
            <div className="px-3 py-2.5 mb-1">
              <p className="text-[10px] font-poppins font-semibold text-slate-500 uppercase tracking-[0.2em]">Navigation</p>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 ease-out ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_-3px_rgba(34,211,238,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cyan-400 rounded-r-full animate-glow-pulse"></div>
                  )}
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-sm shadow-cyan-500/10'
                        : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-200 group-hover:scale-110'
                    }`}>
                      <Icon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-4deg]" />
                    </div>
                    <span className="font-poppins text-[13px] font-medium transition-all duration-300">{item.label}</span>
                  </div>
                  {item.href === '/admin/notifications' && unreadCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400/60" />}
                </Link>
              )
            })}
          </div>
          <div className="p-4 border-t border-white/[0.06]">
            <div className="px-3 py-3 rounded-lg bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/10 transition-all duration-300 hover:border-cyan-500/20 hover:from-cyan-500/8 hover:to-blue-500/8">
              <p className="text-[10px] font-poppins text-slate-500 uppercase tracking-wider">Powered by</p>
              <p className="text-xs font-poppins text-slate-400 font-medium mt-0.5">Ganesha Gym System v2</p>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div className="fixed left-0 top-0 bottom-0 w-72 shadow-2xl" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image
                    src="/images/logoganesha.jpeg"
                    alt="Ganesha Gym"
                    width={32}
                    height={32}
                    className="rounded-lg ring-2 ring-cyan-500/30"
                  />
                  <div>
                    <span className="font-oswald text-base font-bold text-white block leading-tight">GANESHA GYM</span>
                    <span className="text-[10px] font-poppins text-cyan-400/60 uppercase tracking-widest">Menu</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 p-2 hover:bg-white/10 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 ease-out ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cyan-400 rounded-r-full"></div>
                      )}
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-white/[0.04] text-slate-500 group-hover:bg-white/[0.08] group-hover:text-slate-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-poppins text-[13px] font-medium">{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400/60" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-100">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-red-100">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">Konfirmasi Logout</h3>
              <p className="text-gray-500 mb-6 font-poppins text-sm">Apakah Anda yakin ingin keluar dari dashboard admin?</p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-poppins text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 font-poppins text-sm font-medium shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
