'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getMemberSession, type MemberSession } from '@/lib/member-session'
import Image from 'next/image'
import Link from 'next/link'
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  X,
  Phone,
  CalendarDays,
  TrendingUp,
  Award,
  Shield,
  Clock,
  Sparkles,
  BadgeCheck,
  Crown,
  Activity,
  Scale,
  Ruler,
  Dumbbell,
  ChevronDown,
  Zap,
  Timer,
  Lock,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { formatMemberCardDisplay } from '@/lib/format-member-card'
import { useToast } from '@/components/ui/Toast'

const genderOptions = [
  { value: 'PRIA', label: 'Pria', icon: '👨' },
  { value: 'WANITA', label: 'Wanita', icon: '👩' },
  { value: 'LAINNYA', label: 'Lainnya', icon: '🧑' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null)
  const [memberData, setMemberData] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)
  const [now, setNow] = useState(Date.now())
  const genderDropdownRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    height: '' as string,
    weight: '' as string,
    gymExperienceMonths: '' as string,
    gender: undefined as 'PRIA' | 'WANITA' | 'LAINNYA' | undefined,
    age: '' as string,
  })

  const { success, error: showError } = useToast()

  const identityEmail = user?.email || memberSession?.email || null
  const identityName = user?.displayName || memberSession?.name || memberSession?.username || 'User'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target as Node)) {
        setShowGenderDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setMemberSession(getMemberSession())
  }, [])

  const loadProfile = async () => {
    if (!identityEmail) return
    try {
      const response = await fetch(`/api/members/profile?email=${encodeURIComponent(identityEmail)}`)
      if (!response.ok) throw new Error('Gagal memuat profile')

      const data = await response.json()
      const member = data.member
      console.log('DEBUG memberData:', member)
      console.log('DEBUG hasUnusedQrisVisitPayment:', member.hasUnusedQrisVisitPayment)
      console.log('DEBUG hasCheckedInToday:', member.hasCheckedInToday)
      console.log('DEBUG payments:', member.payments)
      setMemberData(member)
      setFormData({
        name: member.name || identityName,
        phone: member.phone || '',
        height: member.height?.toString() || '',
        weight: member.weight?.toString() || '',
        gymExperienceMonths: member.gymExperienceMonths?.toString() || '',
        gender: member.gender,
        age: member.dateOfBirth ? calculateAge(member.dateOfBirth)?.toString() || '' : '',
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  useEffect(() => {
    if (!identityEmail) return
    setLoading(true)
    loadProfile().finally(() => setLoading(false))
    
    // Polling untuk update check-in status (hanya ketika tidak sedang edit)
    const interval = setInterval(() => {
      if (!isEditing) {
        loadProfile()
      }
    }, 3000) // Refresh setiap 3 detik

    // Listener untuk pembayaran berhasil
    const handlePremiumAccessUpdated = () => {
      loadProfile()
    }
    window.addEventListener('premium-access-updated', handlePremiumAccessUpdated)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('premium-access-updated', handlePremiumAccessUpdated)
    }
  }, [identityEmail, isEditing])

  useEffect(() => {
    if (!memberData?.premiumAccessType || memberData.premiumAccessType !== 'VISIT' || !memberData.premiumAccessEnd) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [memberData?.premiumAccessType, memberData?.premiumAccessEnd])

  const visitRemainingLabel = (() => {
    if (!memberData || memberData.premiumAccessType !== 'VISIT' || !memberData.premiumAccessEnd) return null
    const diffMs = new Date(memberData.premiumAccessEnd).getTime() - now
    if (Number.isNaN(diffMs) || diffMs <= 0) return 'Akses visit berakhir'
    const totalSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })()

  const handleSave = async () => {
    if (!identityEmail) return
    if (!formData.name.trim()) {
      showError('Nama tidak boleh kosong')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/members/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identityEmail,
          name: formData.name,
          phone: formData.phone,
          height: formData.height ? Number(formData.height) : null,
          weight: formData.weight ? Number(formData.weight) : null,
          gymExperienceMonths: formData.gymExperienceMonths ? Number(formData.gymExperienceMonths) : null,
          gender: formData.gender,
          age: formData.age ? Number(formData.age) : null,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan profile')
      }

      await loadProfile()
      setIsEditing(false)
      success('Profile berhasil diperbarui')
    } catch (err) {
      console.error('Error saving profile:', err)
      showError(err instanceof Error ? err.message : 'Gagal menyimpan profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (memberData) {
      setFormData({
        name: memberData.name,
        phone: memberData.phone || '',
        height: memberData.height?.toString() || '',
        weight: memberData.weight?.toString() || '',
        gymExperienceMonths: memberData.gymExperienceMonths?.toString() || '',
        gender: memberData.gender,
        age: memberData.dateOfBirth ? calculateAge(memberData.dateOfBirth)?.toString() || '' : '',
      })
    }
    setIsEditing(false)
    setShowGenderDropdown(false)
  }

  const getLevelLabel = (level?: string) => {
    switch (level) {
      case 'PEMULA': return { label: 'Pemula', emoji: '🌱', color: 'from-emerald-400 to-teal-500' }
      case 'MENENGAH': return { label: 'Menengah', emoji: '💪', color: 'from-amber-400 to-orange-500' }
      case 'ADVANCED': return { label: 'Advanced', emoji: '🔥', color: 'from-orange-500 to-red-500' }
      default: return { label: 'Belum ditentukan', emoji: '📊', color: 'from-gray-400 to-gray-500' }
    }
  }

  const getWorkoutFrequencyTip = (level?: string) => {
    switch (level) {
      case 'PEMULA': return '2-3x/minggu'
      case 'MENENGAH': return '3-4x/minggu'
      case 'ADVANCED': return '4-5x/minggu'
      default: return 'Isi data!'
    }
  }

  const getGenderLabel = (gender?: string) => {
    const g = genderOptions.find(o => o.value === gender)
    return g ? { label: g.label, icon: g.icon } : { label: '-', icon: '🧑' }
  }

  const calculateAge = (dateOfBirth?: Date | string) => {
    if (!dateOfBirth) return undefined
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDifference = today.getMonth() - birthDate.getMonth()
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getSelectedGender = () => genderOptions.find(g => g.value === formData.gender)

  if ((!user && !memberSession) || !memberData || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-300 text-sm font-medium">Memuat Profile...</p>
        </div>
      </div>
    )
  }

  const membershipDaysLeft = memberData.membershipEnd
    ? Math.ceil((new Date(memberData.membershipEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0
  const isVisitAccess = memberData.accessType === 'VISIT'
  const levelInfo = getLevelLabel(memberData.experienceLevel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Profile</h1>
                <p className="text-slate-400 text-sm">Kelola informasi pribadi kamu</p>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-white/5 hover:-translate-y-0.5"
            >
              <Edit2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Edit Profile
            </button>
          )}
        </div>

      {/* Visit Timer Banner */}
      {memberData.premiumAccessType === 'VISIT' && (
        <div className="mb-6 bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-indigo-500/15 backdrop-blur-2xl rounded-3xl p-5 border border-cyan-400/20 shadow-xl shadow-cyan-500/10 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-2xl hover:shadow-cyan-500/15">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-2xl">
                <Timer className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Akses Visit 1x24 Jam Aktif! 🎉</p>
              </div>
            </div>
            <div className="bg-black/30 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10">
              <p className="text-cyan-100 font-oswald font-bold text-2xl sm:text-3xl tracking-wider">{visitRemainingLabel || '-'}</p>
            </div>
          </div>
        </div>
      )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - Profile & Data */}
          <div className="lg:col-span-2 space-y-5">
            {/* Profile Card */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 p-6 sm:p-7 shadow-xl shadow-black/25">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-white/10">
                <div className="relative flex-shrink-0">
                  {user?.photoURL ? (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-4 border-violet-500/30 shadow-xl shadow-violet-500/20">
                      <Image
                        src={user.photoURL}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-violet-500/25">
                      <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                  )}
                  {memberData.isActive && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-slate-900 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{memberData.name}</h2>
                    {memberData.premiumAccess && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-xs font-bold text-white shadow-md shadow-amber-500/25">
                        <Crown className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{memberData.email}</span>
                  </p>
                  {memberData.memberCardId && (
                    <p className="text-violet-300 text-xs font-semibold tracking-widest uppercase">
                      Member #{formatMemberCardDisplay(memberData.memberCardId)}
                    </p>
                  )}
                </div>
              </div>

              {/* Profile Info Grid */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="group">
                    <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Nama Lengkap
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Masukan nama"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all"
                      />
                    ) : (
                      <p className="text-white text-base font-medium">{memberData.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="group">
                    <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      Nomor Telepon
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all"
                      />
                    ) : (
                      <p className="text-white text-base font-medium">{memberData.phone || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fitness Data Card */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 p-6 sm:p-7 shadow-xl shadow-black/25">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2.5 bg-violet-500/20 rounded-xl">
                  <Dumbbell className="w-5 h-5 text-violet-300" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Data Kebugaran</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Height */}
                <div className="group">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" />
                    Tinggi Badan
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        placeholder="170"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">cm</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <p className="text-white text-base font-medium">{memberData.height ? `${memberData.height} cm` : '-'}</p>
                    </div>
                  )}
                </div>

                {/* Weight */}
                <div className="group">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    Berat Badan
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        placeholder="65"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">kg</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <p className="text-white text-base font-medium">{memberData.weight ? `${memberData.weight} kg` : '-'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Experience */}
                <div className="group">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Pengalaman Gym
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.gymExperienceMonths}
                        onChange={(e) => setFormData({ ...formData, gymExperienceMonths: e.target.value })}
                        placeholder="6"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all pr-14"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">bulan</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <p className="text-white text-base font-medium">{memberData.gymExperienceMonths ? `${memberData.gymExperienceMonths} bulan` : '-'}</p>
                    </div>
                  )}
                </div>

                {/* Gender */}
                <div className="group">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Gender
                  </label>
                  {isEditing ? (
                    <div className="relative" ref={genderDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all flex items-center justify-between"
                      >
                        {getSelectedGender() ? (
                          <span className="text-sm">{getSelectedGender()?.icon} {getSelectedGender()?.label}</span>
                        ) : (
                          <span className="text-slate-500 text-sm">Pilih Gender</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showGenderDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showGenderDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-200">
                          {genderOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, gender: option.value as any })
                                setShowGenderDropdown(false)
                              }}
                              className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-all flex items-center gap-3 ${formData.gender === option.value ? 'bg-violet-500/15 text-violet-300 border-l-4 border-violet-500' : 'text-white'}`}
                            >
                              <span className="text-xl">{option.icon}</span>
                              <span className="font-medium">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <p className="text-white text-base font-medium flex items-center gap-2">{getGenderLabel(memberData.gender).icon} {getGenderLabel(memberData.gender).label}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Age */}
              <div className="group mb-6">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Umur
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="25"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 transition-all pr-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">tahun</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <p className="text-white text-base font-medium">{memberData.dateOfBirth ? `${calculateAge(memberData.dateOfBirth)} tahun` : '-'}</p>
                  </div>
                )}
              </div>

              {/* Level Badge */}
              <div className={`p-5 rounded-2xl bg-gradient-to-r ${levelInfo.color}/10 border border-transparent bg-clip-padding`}
                   style={{ borderColor: `rgba(${levelInfo.color.includes('emerald') ? '16,185,129' : levelInfo.color.includes('amber') ? '245,158,11' : '248,113,113'},0.2)` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-black/20 rounded-xl">
                      <span className="text-2xl">{levelInfo.emoji}</span>
                    </div>
                    <div>
                      <p className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Level Kamu</p>
                      <p className="text-white text-lg font-bold tracking-tight">{levelInfo.label}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Rekomendasi Frekuensi</p>
                    <p className="text-white text-sm font-bold">{getWorkoutFrequencyTip(memberData.experienceLevel)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-2xl text-sm font-bold hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/10 hover:border-white/20 text-white rounded-2xl text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Membership */}
          <div className="space-y-5">
            {/* Membership Card */}
            <div className={`bg-gradient-to-br from-white/5 to-white/[0.03] backdrop-blur-2xl rounded-3xl border p-6 shadow-xl shadow-black/25 ${
              memberData.isActive
                ? 'border-emerald-500/20'
                : 'border-amber-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-5">
                <div className={`p-2.5 rounded-xl ${
                  memberData.isActive ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                }`}>
                  {memberData.isActive ? (
                    <Crown className="w-5 h-5 text-emerald-300" />
                  ) : (
                    <Shield className="w-5 h-5 text-amber-300" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Status Membership</h3>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-2xl ${
                  memberData.isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</span>
                    <span className={`text-sm font-bold ${memberData.isActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {memberData.isActive ? 'Aktif ✨' : 'Belum Aktif'}
                    </span>
                  </div>
                </div>

                {membershipDaysLeft > 0 && (
                  <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Sisa Hari</p>
                        <p className="text-3xl font-oswald font-bold text-violet-400 tracking-wider">{membershipDaysLeft}</p>
                      </div>
                      <div className="p-3 bg-violet-500/20 rounded-2xl">
                        <Sparkles className="w-6 h-6 text-violet-300" />
                      </div>
                    </div>
                  </div>
                )}

                {!memberData.isActive && (
                  <Link href="/visitor/payment" className="block">
                    <button className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-2xl text-sm font-bold hover:shadow-lg hover:shadow-violet-500/25 transition-all hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2">
                      Aktifkan Membership
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 p-5 shadow-xl shadow-black/25">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Menu Cepat</h3>
              <div className="space-y-2">
                <Link href="/visitor/schedule" className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4.5 h-4.5 text-violet-400" />
                    <span className="text-white text-sm font-medium group-hover:text-violet-200 transition-colors">Lihat Jadwal</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link href="/visitor/workouts" className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="w-4.5 h-4.5 text-violet-400" />
                    <span className="text-white text-sm font-medium group-hover:text-violet-200 transition-colors">Rekomendasi Latihan</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link href="/visitor/dashboard" className="group flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <Award className="w-4.5 h-4.5 text-violet-400" />
                    <span className="text-white text-sm font-medium group-hover:text-violet-200 transition-colors">Dashboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
