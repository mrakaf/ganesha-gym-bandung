'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Zap,
  Send,
  Plus,
  X,
  MessageSquare,
  History,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'

import { formatMemberCardDisplay } from '@/lib/format-member-card'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  totalVisits: number
  visitsThisMonth: number
  totalPayments: number
  paymentsThisMonth: number
  pendingPayments: number
  expiredMembers: number
  overdueMembers: number
  revenueThisMonth: number
  chartData?: {
    labels: string[]
    revenue: number[]
    visits: number[]
    memberGrowth: number[]
  }
  insights?: {
    revenue: string
    visits: string
    memberGrowth: string
  }
}

interface OverdueMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  membershipEnd: Date | null
  memberCardId: string | null
}

interface Announcement {
  id: string
  title: string
  content: string
  sentAt: string
  expiresAt?: string
  recipientCount: number
}

const announcementTemplates = [
  {
    name: "Libur Hari Raya/Nasional",
    title: "📢 PENGUMUMAN PENTING - Libur Ganesha Gym",
    content: `📢 PENGUMUMAN PENTING 📢

Halo, Sahabat Ganesha Gym! 🏋️

Kami informasikan bahwa Ganesha Gym akan LIBUR pada:
📅 [Tanggal Libur]
Alasan: [Alasan Libur]

Kami akan kembali buka seperti biasa pada:
📅 [Tanggal Buka Kembali]
⏰ Jam Operasional: 10.00 - 21.30

Mohon maaf atas ketidaknyamanannya. Terima kasih atas pengertiannya! 🙏

Salam sehat selalu,
Tim Ganesha Gym`
  },
  {
    name: "Perubahan Jam Buka",
    title: "📢 PENGUMUMAN - Perubahan Jam Buka",
    content: `📢 PENGUMUMAN PERUBAHAN JAM BUKA 📢

Halo, Sahabat Ganesha Gym! 🏋️

Kami informasikan bahwa ada perubahan jam buka operasional Ganesha Gym:
🔹 Jam Buka Baru: [Jam Baru]
🔹 Jam Tutup Tetap: 21.30 WIB
📅 Berlaku mulai: [Tanggal Berlaku]

Sebelumnya terima kasih atas perhatiannya! Tetap semangat berolahraga! 💪

Salam sehat selalu,
Tim Ganesha Gym`
  },
  {
    name: "Perubahan Jam Tutup",
    title: "📢 PENGUMUMAN - Perubahan Jam Tutup",
    content: `📢 PENGUMUMAN PERUBAHAN JAM TUTUP 📢

Halo, Sahabat Ganesha Gym! 🏋️

Kami informasikan bahwa ada perubahan jam tutup operasional Ganesha Gym:
🔹 Jam Buka Tetap: 10.00 WIB
🔹 Jam Tutup Baru: [Jam Baru]
📅 Berlaku mulai: [Tanggal Berlaku]

Semoga dengan penambahan jam operasional ini, kamu bisa lebih fleksibel berolahraga! 💪

Salam sehat selalu,
Tim Ganesha Gym`
  },
  {
    name: "Pemeliharaan/Maintenance",
    title: "📢 PENGUMUMAN - Pemeliharaan Ganesha Gym",
    content: `📢 PENGUMUMAN PEMELIHARAAN 📢

Halo, Sahabat Ganesha Gym! 🏋️

Untuk menjaga kenyamanan dan keamanan bersama, Ganesha Gym akan melakukan PEMELIHARAAN pada:
📅 [Tanggal Pemeliharaan]
⏰ Waktu: [Waktu Pemeliharaan]

Selama periode ini, area gym tidak dapat digunakan. Mohon maaf atas ketidaknyamanannya!

Terima kasih atas pengertian dan dukungannya! 🙏

Salam sehat selalu,
Tim Ganesha Gym`
  }
]

export default function AdminDashboard() {
  const { success, error } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [overdueMembers, setOverdueMembers] = useState<OverdueMember[]>([])
  const [atRiskMembers, setAtRiskMembers] = useState<OverdueMember[]>([])
  const [smartTasks, setSmartTasks] = useState<Array<{ priority: 'high' | 'medium' | 'low'; type: string; title: string; description: string; items: string[]; link: string }>>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  
  // Announcement state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'announcements'>('dashboard')
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    expiresAt: ''
  })
  // Delete confirmation modals
  const [showDeleteSingleModal, setShowDeleteSingleModal] = useState<string | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  


  const fetchStats = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout
      
      const response = await fetch('/api/admin/dashboard/stats', {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setOverdueMembers(data.overdueMembersList || [])
        setAtRiskMembers(data.atRiskMembers || [])
        setSmartTasks(data.smartTasks || [])
        setLastUpdate(new Date())
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({}))
        console.error('Error fetching stats:', errorData.error || 'Unknown error')
        // Set loading to false on error
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      if (error.name === 'AbortError') {
        console.error('Request timeout - API took too long to respond')
      }
      // Set loading to false even on error
      setLoading(false)
    } finally {
      setLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Polling setiap 30 detik
    const interval = setInterval(() => {
      fetchStats()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true)
    try {
      const response = await fetch('/api/admin/announcements')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoadingAnnouncements(false)
    }
  }

  const handleSendAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      error('Judul dan isi pengumuman wajib diisi')
      return
    }

    setSendingAnnouncement(true)
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementForm),
      })

      if (response.ok) {
        const data = await response.json()
        success(data.message)
        setShowAnnouncementModal(false)
        setAnnouncementForm({ title: '', content: '', expiresAt: '' })
        setSelectedTemplate("")
        fetchAnnouncements() // Refresh history
      } else {
        const data = await response.json()
        error(data.error || 'Gagal mengirim pengumuman')
      }
    } catch (err) {
      console.error('Error sending announcement:', err)
      error('Terjadi kesalahan saat mengirim pengumuman')
    } finally {
      setSendingAnnouncement(false)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        success(data.message)
        setShowDeleteSingleModal(null)
        fetchAnnouncements() // Refresh history
      } else {
        const data = await response.json()
        error(data.error || 'Gagal menghapus pengumuman')
      }
    } catch (err) {
      console.error('Error deleting announcement:', err)
      error('Terjadi kesalahan saat menghapus pengumuman')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAllAnnouncements = async () => {
    setDeleting(true)
    try {
      const response = await fetch('/api/admin/announcements?all=true', {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        success(data.message)
        setShowDeleteAllModal(false)
        fetchAnnouncements() // Refresh history
      } else {
        const data = await response.json()
        error(data.error || 'Gagal menghapus semua pengumuman')
      }
    } catch (err) {
      console.error('Error deleting all announcements:', err)
      error('Terjadi kesalahan saat menghapus semua pengumuman')
    } finally {
      setDeleting(false)
    }
  }

  // Fetch announcements when tab changes to announcements
  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAnnouncements()
    }
  }, [activeTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins text-lg">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header dengan gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-dark via-primary to-accent rounded-2xl shadow-xl p-6 md:p-8">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-oswald font-bold text-white mb-2 drop-shadow-lg">
              Dashboard Admin
            </h1>
            <p className="text-white/90 font-poppins text-sm md:text-base">
              Selamat datang kembali! Monitor aktivitas gym Anda di sini.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
              <p className="text-white/80 text-xs font-poppins">Last update</p>
              <p className="text-white font-poppins font-semibold text-sm">
                {format(lastUpdate, 'HH:mm:ss', { locale: id })}
              </p>
            </div>
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg border border-white/30 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs & Send Announcement Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-lg font-medium font-poppins text-sm transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Dashboard
            </div>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-6 py-2 rounded-lg font-medium font-poppins text-sm transition-all ${
              activeTab === 'announcements'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat Pengumuman
            </div>
          </button>
        </div>

        <button
          onClick={() => {
            setAnnouncementForm({ title: '', content: '', expiresAt: '' })
            setSelectedTemplate("")
            setShowAnnouncementModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent to-accent-light text-white rounded-xl hover:shadow-lg hover:shadow-accent/20 transition-all font-poppins font-medium"
        >
          <Send className="w-5 h-5" />
          Kirim Pengumuman
        </button>
      </div>


          {activeTab === 'dashboard' && (
          <>
          {/* Smart To-Do Widget */}
            <div className="mb-6">
              <h2 className="text-2xl font-oswald font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                Tugas Cerdas Hari Ini
              </h2>
              {smartTasks.length > 0 ? (
                <div className="space-y-4">
                  {smartTasks.map((task, index) => {
                    let borderColor = ''
                    let bgColor = ''
                    let icon = null

                    if (task.priority === 'high') {
                      borderColor = 'border-red-200'
                      bgColor = 'bg-gradient-to-r from-red-50 to-orange-50'
                      icon = <AlertTriangle className="w-6 h-6 text-red-500" />
                    } else if (task.priority === 'medium') {
                      borderColor = 'border-yellow-200'
                      bgColor = 'bg-gradient-to-r from-yellow-50 to-amber-50'
                      icon = <Clock className="w-6 h-6 text-yellow-500" />
                    } else {
                      borderColor = 'border-green-200'
                      bgColor = 'bg-gradient-to-r from-green-50 to-emerald-50'
                      icon = <CheckCircle2 className="w-6 h-6 text-green-500" />
                    }

                    return (
                      <Link href={task.link} key={index} className="block">
                        <div className={`rounded-2xl shadow-lg border-2 ${borderColor} ${bgColor} p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}>
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm">
                              {icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-oswald font-bold text-gray-900 mb-2">
                                {task.title}
                              </h3>
                              <p className="text-sm text-gray-600 font-poppins mb-3">
                                {task.description}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {task.items.map((item, i) => (
                                  <span
                                    key={i}
                                    className="px-3 py-1 bg-white rounded-full text-xs font-poppins font-medium text-gray-700 shadow-sm"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0 self-center" />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-2xl p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-oswald font-bold text-gray-800 mb-2">
                    Bagus! Tidak Ada Tugas Hari Ini!
                  </h3>
                  <p className="text-gray-600 font-poppins">
                    Semua tugas sudah selesai, atau belum ada yang perlu ditangani hari ini.
                  </p>
                </div>
              )}
            </div>

          {/* Stats Cards - Modern Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" style={{ animationDelay: '0.1s' }}>
            {/* Total Members */}
            <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100/80 p-6 hover:shadow-xl hover:shadow-blue-500/[0.06] hover:border-blue-200/50 transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-md shadow-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-poppins font-semibold">+12%</span>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1 font-oswald">{stats?.totalMembers || 0}</h3>
                <p className="text-gray-600 text-sm font-poppins font-medium">Total Members</p>
                <p className="text-xs text-gray-500 font-poppins mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  {stats?.activeMembers || 0} aktif
                </p>
              </div>
            </div>

            {/* Revenue This Month */}
            <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100/80 p-6 hover:shadow-xl hover:shadow-green-500/[0.06] hover:border-green-200/50 transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-md shadow-green-500/20 group-hover:shadow-lg group-hover:shadow-green-500/30 transition-all duration-300 group-hover:scale-105">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-poppins font-semibold">+8%</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1 font-oswald">
                  {formatCurrency(stats?.revenueThisMonth || 0)}
                </h3>
                <p className="text-gray-600 text-sm font-poppins font-medium">Revenue Bulan Ini</p>
                <p className="text-xs text-gray-500 font-poppins mt-2 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  {stats?.paymentsThisMonth || 0} transaksi
                </p>
              </div>
            </div>

            {/* Visits This Month */}
            <div className="group relative bg-white rounded-xl shadow-sm border border-gray-100/80 p-6 hover:shadow-xl hover:shadow-purple-500/[0.06] hover:border-purple-200/50 transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-md shadow-purple-500/20 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300 group-hover:scale-105">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-poppins font-semibold">+15%</span>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-1 font-oswald">{stats?.visitsThisMonth || 0}</h3>
                <p className="text-gray-600 text-sm font-poppins font-medium">Kunjungan Bulan Ini</p>
                <p className="text-xs text-gray-500 font-poppins mt-2 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-500" />
                  {stats?.totalVisits || 0} total
                </p>
              </div>
            </div>
          </div>

          {/* Smart Widgets: At Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* At Risk Members */}
            {atRiskMembers.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg border-2 border-yellow-200 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-yellow-500 p-3 rounded-xl shadow-md">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-oswald font-bold text-gray-900">
                        Member Berisiko Keluar
                      </h2>
                      <p className="text-sm text-gray-600 font-poppins mt-1">
                        {atRiskMembers.length} member akan expired dalam 3 hari
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/members?filter=atrisk"
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all font-poppins font-medium text-sm shadow-md hover:shadow-lg"
                  >
                    Lihat Semua
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-yellow-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                            Nama
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                            Expired
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {atRiskMembers.slice(0, 5).map((member) => (
                          <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-all duration-200 ease-out">
                            <td className="py-3 px-4 text-sm font-poppins font-medium text-gray-900">
                              {member.name}
                            </td>
                            <td className="py-3 px-4 text-sm font-poppins font-semibold text-yellow-600">
                              {member.membershipEnd
                                ? format(new Date(member.membershipEnd), 'dd MMM yyyy', { locale: id })
                                : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href="/admin/members"
                                className="text-sm text-accent hover:text-accent-light font-poppins font-medium hover:underline"
                              >
                                Detail
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Overdue Members Section - Enhanced Design */}
          {overdueMembers.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-lg border-2 border-red-200 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-red-500 p-3 rounded-xl shadow-md">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-oswald font-bold text-gray-900">
                      Member Telat Bayar
                    </h2>
                    <p className="text-sm text-gray-600 font-poppins mt-1">
                      {overdueMembers.length} member perlu perpanjangan segera
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/members?filter=overdue"
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-poppins font-medium text-sm shadow-md hover:shadow-lg"
                >
                  Lihat Semua
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-poppins font-semibold text-gray-700">
                          Nama
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-poppins font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-poppins font-semibold text-gray-700">
                          Member Card ID
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-poppins font-semibold text-gray-700">
                          Expired
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-poppins font-semibold text-gray-700">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueMembers.slice(0, 5).map((member) => (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-all duration-200 ease-out">
                          <td className="py-4 px-6 text-sm font-poppins font-medium text-gray-900">
                            {member.name}
                          </td>
                          <td className="py-4 px-6 text-sm font-poppins text-gray-600">
                            {member.email || '-'}
                          </td>
                          <td className="py-4 px-6 text-sm font-poppins text-gray-600">
                            {formatMemberCardDisplay(member.memberCardId) || '-'}
                          </td>
                          <td className="py-4 px-6 text-sm font-poppins font-semibold text-red-600">
                            {member.membershipEnd
                              ? format(new Date(member.membershipEnd), 'dd MMM yyyy', { locale: id })
                              : '-'}
                          </td>
                          <td className="py-4 px-6">
                            <Link
                              href="/admin/members"
                              className="text-sm text-accent hover:text-accent-light font-poppins font-medium hover:underline"
                            >
                              Detail
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section - Professional Design */}
        {stats?.chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-oswald font-bold text-gray-900">Revenue Trend</h2>
                  <p className="text-sm text-gray-600 font-poppins mt-1">Pendapatan 6 bulan terakhir</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-md">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={stats.chartData.labels.map((label, index) => ({
                    month: label,
                    revenue: stats.chartData!.revenue[index],
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontFamily: 'Poppins' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontFamily: 'Poppins' }}
                    tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontFamily: 'Poppins',
                    }}
                    formatter={(value) => [
                      formatCurrency(typeof value === 'number' ? value : 0),
                      'Revenue',
                    ]}
                  />
                  <Legend 
                    wrapperStyle={{ fontFamily: 'Poppins', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
              
              {/* Insight for Revenue */}
              {stats?.insights?.revenue && (
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    <p className="text-sm font-poppins text-gray-700">{stats.insights.revenue}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Visits Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-oswald font-bold text-gray-900">Visits Trend</h2>
                  <p className="text-sm text-gray-600 font-poppins mt-1">Kunjungan 6 bulan terakhir</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-md">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.chartData.labels.map((label, index) => ({
                    month: label,
                    visits: stats.chartData!.visits[index],
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontFamily: 'Poppins' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontFamily: 'Poppins' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontFamily: 'Poppins',
                    }}
                    formatter={(value) => [typeof value === 'number' ? value : 0, 'Kunjungan']}
                  />
                  <Legend 
                    wrapperStyle={{ fontFamily: 'Poppins', fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="visits"
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                    name="Kunjungan"
                  />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Insight for Visits */}
              {stats?.insights?.visits && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                    <p className="text-sm font-poppins text-gray-700">{stats.insights.visits}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Member Growth Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-oswald font-bold text-gray-900">Member Growth Trends</h2>
                  <p className="text-sm text-gray-600 font-poppins mt-1">Member baru 6 bulan terakhir</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats.chartData.labels.map((label, index) => ({
                    month: label,
                    memberGrowth: stats.chartData!.memberGrowth[index],
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontFamily: 'Poppins' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontFamily: 'Poppins' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontFamily: 'Poppins',
                    }}
                    formatter={(value) => [typeof value === 'number' ? value : 0, 'Member Baru']}
                  />
                  <Legend 
                    wrapperStyle={{ fontFamily: 'Poppins', fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="memberGrowth"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    name="Member Baru"
                  />
                </BarChart>
              </ResponsiveContainer>
              
              {/* Insight for Member Growth */}
              {stats?.insights?.memberGrowth && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                    <p className="text-sm font-poppins text-gray-700">{stats.insights.memberGrowth}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          {/* Quick Actions - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-2xl font-oswald font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              <Link
                href="/admin/members"
                className="group relative overflow-hidden bg-gradient-to-br from-accent to-accent-light text-white p-6 rounded-xl hover:shadow-2xl hover:shadow-accent/20 transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                <div className="relative z-10">
                  <Users className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-lg mb-2 font-poppins">Kelola Member</h4>
                  <p className="text-sm opacity-90 font-poppins">Lihat dan kelola data member</p>
                  <ArrowRight className="w-5 h-5 mt-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>

              <Link
                href="/admin/visits"
                className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                <div className="relative z-10">
                  <Calendar className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-lg mb-2 font-poppins">Tracking Kunjungan</h4>
                  <p className="text-sm opacity-90 font-poppins">Catat kunjungan member</p>
                  <ArrowRight className="w-5 h-5 mt-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>

              <Link
                href="/admin/payments"
                className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                <div className="relative z-10">
                  <DollarSign className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-lg mb-2 font-poppins">Kelola Pembayaran</h4>
                  <p className="text-sm opacity-90 font-poppins">Lihat transaksi pembayaran</p>
                  <ArrowRight className="w-5 h-5 mt-4 group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
          </>
          )}

          {/* Announcements Tab Content */}
          {activeTab === 'announcements' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-oswald font-bold text-gray-900">Riwayat Pengumuman</h2>
                  <p className="text-sm text-gray-600 font-poppins mt-1">Pengumuman yang telah dikirim</p>
                </div>
                <div className="flex items-center gap-3">
                  {announcements.length > 0 && (
                    <button
                      onClick={() => setShowDeleteAllModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-poppins text-sm font-medium shadow-md hover:shadow-lg hover:shadow-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Semua
                    </button>
                  )}
                  <div className="bg-gradient-to-br from-accent to-accent-light p-3 rounded-xl shadow-md">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {loadingAnnouncements ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-poppins">Memuat riwayat pengumuman...</p>
                  </div>
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-poppins text-lg">Belum ada pengumuman yang dikirim</p>
                  <p className="text-gray-500 font-poppins text-sm mt-2">Klik &quot;Kirim Pengumuman&quot; untuk membuat pengumuman pertama</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-6 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 font-poppins">{announcement.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <p className="text-sm text-gray-500 font-poppins">
                              {format(new Date(announcement.sentAt), 'dd MMM yyyy HH:mm', { locale: id })}
                            </p>
                            {announcement.expiresAt && (
                              <p className="text-sm text-amber-600 font-poppins">
                                Berlaku sampai: {format(new Date(announcement.expiresAt), 'dd MMM yyyy HH:mm', { locale: id })}
                              </p>
                            )}
                            <span className="text-sm text-accent font-poppins font-medium">
                              Dikirim ke {announcement.recipientCount} member aktif
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDeleteSingleModal(announcement.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus pengumuman"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-gray-700 font-poppins whitespace-pre-wrap">{announcement.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Announcement Modal */}
          {showAnnouncementModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h2 className="text-xl font-oswald font-bold text-gray-900">Kirim Pengumuman</h2>
                  <button
                    onClick={() => {
                      setShowAnnouncementModal(false)
                      setAnnouncementForm({ title: '', content: '', expiresAt: '' })
                      setSelectedTemplate("")
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-poppins font-semibold text-gray-700 mb-1.5">Pilih Template (Opsional)</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        const templateName = e.target.value
                        setSelectedTemplate(templateName)
                        const template = announcementTemplates.find(t => t.name === templateName)
                        if (template) {
                          setAnnouncementForm({
                            title: template.title,
                            content: template.content,
                            expiresAt: ''
                          })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-poppins text-sm"
                    >
                      <option value="">-- Pilih Template --</option>
                      {announcementTemplates.map((template, index) => (
                        <option key={index} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-poppins font-semibold text-gray-700 mb-1.5">Judul Pengumuman</label>
                    <input
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      placeholder="Masukkan judul..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-poppins text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-poppins font-semibold text-gray-700 mb-1.5">Isi Pengumuman</label>
                    <textarea
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                      placeholder="Tulis isi pengumuman..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-poppins text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-poppins font-semibold text-gray-700 mb-1.5">Berlaku Sampai (Opsional)</label>
                    <input
                      type="datetime-local"
                      value={announcementForm.expiresAt}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, expiresAt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-poppins text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowAnnouncementModal(false)
                      setAnnouncementForm({ title: '', content: '', expiresAt: '' })
                      setSelectedTemplate("")
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-poppins text-sm font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSendAnnouncement}
                    disabled={sendingAnnouncement}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg hover:shadow-lg hover:shadow-accent/20 font-poppins text-sm font-medium disabled:opacity-50"
                  >
                    {sendingAnnouncement ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Single Announcement Confirmation Modal */}
          {showDeleteSingleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-oswald font-bold text-gray-900 text-center mb-2">Hapus Pengumuman?</h3>
                  <p className="text-gray-600 font-poppins text-center mb-6">
                    Pengumuman ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowDeleteSingleModal(null)}
                      disabled={deleting}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-poppins text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(showDeleteSingleModal)}
                      disabled={deleting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-poppins text-sm font-medium transition-colors shadow-md hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-50"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete All Announcements Confirmation Modal */}
          {showDeleteAllModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-oswald font-bold text-gray-900 text-center mb-2">Hapus Semua Pengumuman?</h3>
                  <p className="text-gray-600 font-poppins text-center mb-6">
                    Semua pengumuman di riwayat akan dihapus secara permanen dan tidak dapat dikembalikan.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowDeleteAllModal(false)}
                      disabled={deleting}
                      className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-poppins text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleDeleteAllAnnouncements}
                      disabled={deleting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-poppins text-sm font-medium transition-colors shadow-md hover:shadow-lg hover:shadow-red-500/20 disabled:opacity-50"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Hapus Semua
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  )
}
