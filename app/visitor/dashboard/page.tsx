'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getMemberSession, type MemberSession } from '@/lib/member-session'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Calendar, 
  CreditCard, 
  Dumbbell, 
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Timer,
  Megaphone,
  X
} from 'lucide-react'

export default function VisitorDashboard() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [memberData, setMemberData] = useState<any>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [stats, setStats] = useState({
    totalVisits: 0,
    thisMonthVisits: 0,
    membershipDaysLeft: 0,
    isActive: false,
    premiumAccess: false,
    premiumAccessType: null as string | null,
    premiumAccessEnd: null as string | null,
  })
  const [now, setNow] = useState(Date.now())
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null)
  const [showCheckInSuccess, setShowCheckInSuccess] = useState(false)

  const identityEmail = user?.email || memberSession?.email || null
  const identityUsername = !identityEmail ? memberSession?.username : null
  const displayName = user?.displayName || memberSession?.name || memberSession?.username || user?.email?.split('@')[0] || 'User'
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

  const loadMemberProfile = useCallback(async () => {
    if (!identityEmail && !identityUsername) return
    try {
      const query = identityEmail
        ? `email=${encodeURIComponent(identityEmail)}`
        : `username=${encodeURIComponent(identityUsername || '')}`
      const response = await fetch(`/api/members/profile?${query}`)
      if (!response.ok) {
        throw new Error('Gagal memuat data member')
      }
      const data = await response.json()
      const member = data.member

      setMemberData(member)
      setStats({
        totalVisits: member.totalVisits || 0,
        thisMonthVisits: member.thisMonthVisits || 0,
        membershipDaysLeft: member.membershipEnd
          ? Math.max(0, Math.ceil((new Date(member.membershipEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0,
        isActive: !!member.isActive,
        premiumAccess: !!member.premiumAccess,
        premiumAccessType: member.premiumAccessType || null,
        premiumAccessEnd: member.premiumAccessEnd || null,
      })
    } catch (error) {
      console.error('Error loading member profile:', error)
    } finally {
      setProfileLoaded(true)
    }
  }, [identityEmail, identityUsername])

  const prevHasCheckedInToday = useRef(false)
  
  useEffect(() => {
    loadMemberProfile()
    
    // Polling untuk update check-in status
    const interval = setInterval(() => {
      loadMemberProfile()
    }, 3000) // Refresh setiap 3 detik
    
    return () => clearInterval(interval)
  }, [loadMemberProfile])

  useEffect(() => {
    // Deteksi perubahan status check-in
    if (memberData?.hasCheckedInToday && !prevHasCheckedInToday.current) {
      setShowCheckInSuccess(true)
      // Auto hide after 10 detik
      setTimeout(() => setShowCheckInSuccess(false), 10000)
    }
    prevHasCheckedInToday.current = memberData?.hasCheckedInToday
  }, [memberData?.hasCheckedInToday])

  useEffect(() => {
    const handlePremiumAccessUpdated = () => {
      loadMemberProfile()
    }
    window.addEventListener('premium-access-updated', handlePremiumAccessUpdated)
    return () => {
      window.removeEventListener('premium-access-updated', handlePremiumAccessUpdated)
    }
  }, [loadMemberProfile])

  useEffect(() => {
    if (stats.premiumAccessType !== 'VISIT' || !stats.premiumAccessEnd) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [stats.premiumAccessType, stats.premiumAccessEnd])

  const loadLatestAnnouncement = useCallback(async () => {
    try {
      const response = await fetch('/api/announcements')
      if (response.ok) {
        const data = await response.json()
        setLatestAnnouncement(data.announcement)
      }
    } catch (error) {
      console.error('Error loading announcement:', error)
    }
  }, [])

  useEffect(() => {
    loadLatestAnnouncement()
  }, [loadLatestAnnouncement])

  if (loading || !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-serif">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const visitRemainingLabel = (() => {
    if (stats.premiumAccessType !== 'VISIT' || !stats.premiumAccessEnd) return null
    const diffMs = new Date(stats.premiumAccessEnd).getTime() - now
    if (Number.isNaN(diffMs) || diffMs <= 0) return 'Akses visit berakhir'
    const totalSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })()

  const handleLockedMenuClick = (e: React.MouseEvent, featureName: string) => {
    e.preventDefault()
    if (!profileLoaded) return
    if (stats.premiumAccess) return
    alert(`${featureName} masih terkunci. Silakan lakukan pembayaran Visit atau Membership terlebih dahulu untuk membuka fitur ini.`)
    router.push('/visitor/payment')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Announcement Banner */}
      {latestAnnouncement && (
        <div className="mb-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-xl rounded-2xl p-5 border border-amber-400/40 shadow-xl animate-fade-in">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-amber-500/30 rounded-xl flex-shrink-0">
              <Megaphone className="w-7 h-7 text-amber-200" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-oswald font-bold text-amber-100 mb-2">
                📢 {latestAnnouncement.title}
              </h3>
              <p className="text-amber-50/90 font-poppins text-sm leading-relaxed whitespace-pre-wrap">
                {latestAnnouncement.content}
              </p>
              <p className="text-amber-200/70 text-xs font-poppins mt-3">
                Dibagikan pada {new Date(latestAnnouncement.sentAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Success Banner */}
      {showCheckInSuccess && (
        <div className="mb-8 bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl p-5 border border-emerald-400/30 shadow-xl shadow-emerald-500/20 transition-all duration-300 ease-out hover:-translate-y-1 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/30 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-lg">Selamat Berolahraga! 🔥</p>
              <p className="text-emerald-100/80 text-xs sm:text-sm">Anda berhasil check-in hari ini! Semangat latihan!</p>
            </div>
            <button
              onClick={() => setShowCheckInSuccess(false)}
              className="text-emerald-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-oswald font-bold text-white mb-2">
          Selamat Datang, {displayName}!
        </h1>
        <p className="text-gray-300 font-poppins">Dashboard Ganesha Gym</p>
      </div>

      {/* Membership Status Card */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20 mb-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5),0_0_40px_-10px_rgba(34,211,238,0.25)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {user?.photoURL && (
              <Image
                src={user.photoURL}
                alt="Profile"
                width={64}
                height={64}
                className="rounded-full border-2 border-accent"
              />
            )}
            <div>
              <h2 className="text-xl font-oswald font-bold text-white mb-1">
                {displayName}
              </h2>
              <p className="text-gray-300 text-sm font-poppins">{identityEmail || memberSession?.username || '-'}</p>
            </div>
          </div>
          <div className="text-right">
            {stats.premiumAccess ? (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-poppins font-semibold">Premium Aktif</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-400">
                <Lock className="w-5 h-5" />
                <span className="font-poppins font-semibold">Premium Terkunci</span>
              </div>
            )}
            {stats.membershipDaysLeft > 0 && (
              <p className="text-gray-300 text-sm font-poppins mt-1">
                {stats.membershipDaysLeft} hari tersisa
              </p>
            )}
          </div>
        </div>
      </div>

      {stats.premiumAccessType === 'VISIT' && (
        <div className="bg-gradient-to-r from-sky-500/20 to-cyan-500/20 backdrop-blur-xl rounded-xl p-4 border border-sky-400/40 mb-6 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_15px_40px_-12px_rgba(34,211,238,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500/30 rounded-lg">
                <Timer className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <p className="text-white font-poppins font-semibold">Akses Visit 1 x 24 Jam Aktif</p>
                <p className="text-sky-100/90 text-xs font-poppins">
                  {memberData?.hasCheckedInToday ? 'Anda telah check-in hari ini' : 'Dihitung sejak pembayaran sukses. Perpanjang jika ingin akses tetap terbuka.'}
                </p>
              </div>
            </div>
            <p className="text-sky-100 font-oswald text-xl font-bold">{visitRemainingLabel || '-'}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Visits */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-cyan-400/30 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5),0_0_30px_-8px_rgba(34,211,238,0.25)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
          </div>
          <h3 className="text-2xl font-oswald font-bold text-white mb-1">
            {stats.totalVisits}
          </h3>
          <p className="text-gray-300 text-sm font-poppins">Total Kunjungan</p>
        </div>

        {/* This Month Visits */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-rose-400/30 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5),0_0_30px_-8px_rgba(244,63,94,0.22)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary/20 rounded-lg">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <h3 className="text-2xl font-oswald font-bold text-white mb-1">
            {stats.thisMonthVisits}
          </h3>
          <p className="text-gray-300 text-sm font-poppins">Kunjungan Bulan Ini</p>
        </div>

        {/* Membership Days */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-amber-400/30 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5),0_0_30px_-8px_rgba(245,158,11,0.25)]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-light/20 rounded-lg">
              <Clock className="w-6 h-6 text-accent-light" />
            </div>
          </div>
          <h3 className="text-2xl font-oswald font-bold text-white mb-1">
            {stats.membershipDaysLeft || '-'}
          </h3>
          <p className="text-gray-300 text-sm font-poppins">Hari Tersisa</p>
        </div>

        {/* Quick Action */}
        <Link
          href="/visitor/payment"
          className="bg-gradient-to-r from-accent to-accent-light rounded-xl p-6 border border-white/20 hover:shadow-xl hover:shadow-accent/30 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-oswald font-bold text-white mb-1 group-hover:scale-105 transition-transform">
            Bayar Sekarang
          </h3>
          <p className="text-white/80 text-sm font-poppins">Lanjutkan membership</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workout Recommendations */}
        <Link
          href={profileLoaded && stats.premiumAccess ? '/visitor/workouts' : '/visitor/payment'}
          className={`bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 transition-all duration-300 ease-out group ${
            profileLoaded ? 'hover:bg-white/15 hover:-translate-y-1 hover:scale-[1.01] hover:border-amber-400/40 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5),0_0_30px_-8px_rgba(217,119,6,0.3)]' : 'opacity-70'
          }`}
          onClick={(e) => {
            if (!profileLoaded) e.preventDefault()
            else if (!stats.premiumAccess) handleLockedMenuClick(e, 'Rekomendasi Latihan')
          }}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
              <Dumbbell className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-oswald font-bold text-white">
              Rekomendasi Latihan
            </h3>
          </div>
          <p className="text-gray-300 text-sm font-poppins">
            {stats.premiumAccess
              ? 'Dapatkan rekomendasi latihan sesuai target Anda'
              : 'Terkunci. Aktifkan Visit 24 jam atau Membership 1 bulan'}
          </p>
        </Link>

        {/* Workout Schedule */}
        <Link
          href={profileLoaded && stats.premiumAccess ? '/visitor/schedule' : '/visitor/payment'}
          className={`bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 transition-all duration-300 ease-out group ${
            profileLoaded ? 'hover:bg-white/15 hover:-translate-y-1 hover:scale-[1.01] hover:border-rose-400/40 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5),0_0_30px_-8px_rgba(244,63,94,0.3)]' : 'opacity-70'
          }`}
          onClick={(e) => {
            if (!profileLoaded) e.preventDefault()
            else if (!stats.premiumAccess) handleLockedMenuClick(e, 'Jadwal Latihan')
          }}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-secondary/20 rounded-lg group-hover:bg-secondary/30 transition-colors">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-oswald font-bold text-white">
              Jadwal Latihan
            </h3>
          </div>
          <p className="text-gray-300 text-sm font-poppins">
            {stats.premiumAccess
              ? 'Atur jadwal latihan Anda'
              : 'Terkunci. Aktifkan Visit 24 jam atau Membership 1 bulan'}
          </p>
        </Link>

        {/* Payment */}
        <Link
          href="/visitor/payment"
          className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 transition-all duration-300 ease-out group hover:bg-white/15 hover:-translate-y-1 hover:scale-[1.01] hover:border-cyan-400/40 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5),0_0_30px_-8px_rgba(34,211,238,0.3)]"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-accent-light/20 rounded-lg group-hover:bg-accent-light/30 transition-colors">
              <CreditCard className="w-6 h-6 text-accent-light" />
            </div>
            <h3 className="text-xl font-oswald font-bold text-white">
              Pembayaran
            </h3>
          </div>
          <p className="text-gray-300 text-sm font-poppins">
            Bayar visit, member baru, atau perpanjangan
          </p>
        </Link>
      </div>
    </div>
  )
}
