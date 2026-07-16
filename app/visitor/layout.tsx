'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Dumbbell,
  Calendar,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { clearMemberSession, getMemberSession, type MemberSession } from '@/lib/member-session'
import { VisitorProfileProvider, useVisitorProfile } from '@/contexts/visitor-profile-context'
import PremiumBackground from '@/components/visitor/PremiumBackground'

function VisitorLayoutChrome({
  children,
  user,
  signOut,
  setMemberSession,
}: {
  children: React.ReactNode
  user: ReturnType<typeof useAuth>['user']
  signOut: ReturnType<typeof useAuth>['signOut']
  setMemberSession: (v: MemberSession | null) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { toasts, success, warning, removeToast } = useToast()
  const { premiumAccess } = useVisitorProfile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleSignOut = async () => {
    try {
      if (user) {
        await signOut()
      }
      clearMemberSession()
      setMemberSession(null)
      success('Anda telah berhasil logout.')
      setTimeout(() => {
        router.push('/login')
      }, 500)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false)
    void handleSignOut()
  }

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false)
  }

  const handleLockedFeatureClick = (e: React.MouseEvent, itemLabel: string) => {
    e.preventDefault()
    warning(`${itemLabel} terkunci. Lakukan pembayaran Visit atau Membership terlebih dahulu untuk membuka fitur ini.`)
    setMobileMenuOpen(false)
    router.push('/visitor/payment')
  }

  const navItems = [
    { href: '/visitor/dashboard', icon: LayoutDashboard, label: 'Dashboard', requiresPremium: false },
    { href: '/visitor/workouts', icon: Dumbbell, label: 'Rekomendasi Latihan', requiresPremium: true },
    { href: '/visitor/schedule', icon: Calendar, label: 'Jadwal Latihan', requiresPremium: true },
    { href: '/visitor/payment', icon: CreditCard, label: 'Pembayaran', requiresPremium: false },
    { href: '/visitor/profile', icon: User, label: 'Profile', requiresPremium: false },
  ]

  return (
    <>
      <ToastContainer />
      <div className="visitor-area relative min-h-screen text-white" style={{ backgroundColor: '#111827' }}>
        <PremiumBackground />
        <nav className="bg-[#0f172a]/60 backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-50 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href="/visitor/dashboard"
                className="group flex items-center space-x-3 transition-all duration-300 ease-out hover:scale-[1.02]"
              >
                <div className="relative">
                  <Image
                    src="/images/logoganesha.jpeg"
                    alt="Ganesha Gym"
                    width={40}
                    height={40}
                    className="rounded-lg ring-1 ring-white/10 transition-all duration-300 ease-out group-hover:ring-cyan-400/50 group-hover:shadow-[0_0_20px_-2px_rgba(34,211,238,0.5)]"
                  />
                </div>
                <span className="text-white font-oswald text-xl font-bold tracking-wide bg-gradient-to-r from-white via-white to-cyan-200 bg-clip-text text-transparent transition-all duration-300">
                  GANESHA GYM
                </span>
              </Link>

              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const isLocked = item.requiresPremium && !premiumAccess
                  return (
                    <Link
                      key={item.href}
                      href={isLocked ? '/visitor/payment' : item.href}
                      onClick={(e) => {
                        if (isLocked) {
                          handleLockedFeatureClick(e, item.label)
                        }
                      }}
                      data-active={isActive ? 'true' : 'false'}
                      className={`nav-link-premium group flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5 ${
                        isActive
                          ? 'bg-gradient-to-br from-cyan-500/15 to-blue-500/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_30px_-5px_rgba(34,211,238,0.4)]'
                          : 'text-gray-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'group-hover:text-cyan-300'}`} />
                      <span className="font-poppins text-sm font-medium">{item.label}</span>
                      {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400/80" />}
                    </Link>
                  )
                })}
              </div>

              <div className="flex items-center space-x-4">
                {user?.photoURL && (
                  <div className="relative hidden md:block group">
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="rounded-full ring-2 ring-cyan-400/40 transition-all duration-300 ease-out group-hover:ring-cyan-300/80 group-hover:shadow-[0_0_18px_-2px_rgba(34,211,238,0.55)] group-hover:scale-105"
                    />
                  </div>
                )}

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden text-white p-2 rounded-lg hover:bg-white/[0.06] transition-all duration-300 ease-out"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                <button
                  onClick={handleLogoutClick}
                  className="hidden md:flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white rounded-lg border border-transparent hover:border-red-400/25 hover:bg-red-500/[0.08] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_25px_-5px_rgba(248,113,113,0.4)]"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-poppins text-sm font-medium">Keluar</span>
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/20 bg-white/10 backdrop-blur-xl">
              <div className="px-4 py-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const isLocked = item.requiresPremium && !premiumAccess
                  return (
                    <Link
                      key={item.href}
                      href={isLocked ? '/visitor/payment' : item.href}
                      onClick={(e) => {
                        if (isLocked) {
                          handleLockedFeatureClick(e, item.label)
                          return
                        }
                        setMobileMenuOpen(false)
                      }}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-accent text-white'
                          : 'text-gray-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-poppins">{item.label}</span>
                      {isLocked && <Lock className="w-4 h-4" />}
                    </Link>
                  )
                })}
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-200 hover:bg-white/10 hover:text-white w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-poppins">Keluar</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        <main className="pb-8">{children}</main>

        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-oswald font-bold text-white">Konfirmasi Logout</h3>
              </div>

              <p className="text-gray-200 font-poppins mb-6">
                Apakah Anda yakin ingin keluar dari akun Ganesha Gym?
              </p>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCancelLogout}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all font-poppins font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-xl hover:shadow-red-500/30 transition-all font-poppins font-semibold"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function VisitorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  const identityEmail = user?.email || memberSession?.email || null
  const identityUsername = !identityEmail ? memberSession?.username ?? null : null
  const isAuthenticated = !!user || !!memberSession

  useEffect(() => {
    setMemberSession(getMemberSession())
    setSessionReady(true)
  }, [])

  useEffect(() => {
    if (!loading && sessionReady && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, sessionReady, router])

  if (loading || !sessionReady) {
    return (
      <div className="relative min-h-screen flex items-center justify-center" style={{ backgroundColor: '#111827' }}>
        <PremiumBackground />
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-[0_0_40px_rgba(34,211,238,0.4)]"></div>
          <p className="text-white font-poppins tracking-wide">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <VisitorProfileProvider identityEmail={identityEmail} identityUsername={identityUsername}>
      <VisitorLayoutChrome user={user} signOut={signOut} setMemberSession={setMemberSession}>
        {children}
      </VisitorLayoutChrome>
    </VisitorProfileProvider>
  )
}
