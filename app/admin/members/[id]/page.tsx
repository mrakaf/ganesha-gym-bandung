
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Mail, Send } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { formatMemberCardDisplay } from '@/lib/format-member-card'

interface MemberDetail {
  id: string
  name: string
  email: string | null
  username: string | null
  phone: string | null
  memberCardId: string | null
  isActive: boolean
  membershipStart: Date | null
  membershipEnd: Date | null
  createdAt: Date
  updatedAt: Date
  visitCount: number
  paymentCount: number
  recentVisits: any[]
  recentPayments: any[]
  lastVisitDate: Date | null
  retentionStatus: 'AMAN' | 'PERLU_DIPERHATIKAN' | 'RISIKO_TINGGI'
  retentionRecommendations: any[]
  emailReminders: any[]
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { success, error: showError, removeToast, toasts } = useToast()
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMemberDetail = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/members/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setMember(data.member)
      } else {
        const err = await response.json()
        showError(err.error || 'Gagal memuat member')
        console.error('Error fetching member detail:', err)
      }
    } catch (e) {
      console.error('Error fetching member detail:', e)
      showError('Terjadi kesalahan saat memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchMemberDetail()
    }
  }, [params.id])

  const getRetentionStatusLabel = (status: string) => {
    switch(status) {
      case 'AMAN': return { label: 'Aman', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' }
      case 'PERLU_DIPERHATIKAN': return { label: 'Perlu Diperhatikan', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-300' }
      case 'RISIKO_TINGGI': return { label: 'Risiko Tinggi', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' }
      default: return { label: 'Aman', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' }
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: id })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-accent" />
          <p className="text-gray-600 font-poppins">Memuat data member...</p>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-600 font-poppins">Member tidak ditemukan</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-oswald font-bold text-gray-900">{member.name}</h1>
          <p className="text-sm font-poppins text-gray-600">Detail Member</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/35 p-6">
            <h2 className="text-lg font-oswald font-semibold text-gray-900 mb-4">Informasi Member</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Email</p>
                <p className="text-gray-900 font-poppins">{member.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Telepon</p>
                <p className="text-gray-900 font-poppins">{member.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Username</p>
                <p className="text-gray-900 font-poppins">{member.username || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Kartu Member</p>
                <p className="text-gray-900 font-poppins">{formatMemberCardDisplay(member.memberCardId) || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Status</p>
                <span className={`inline-flex px-2 py-1 ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded-md text-xs font-poppins font-semibold`}>
                  {member.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Status Retensi</p>
                {(() => {
                  const statusLabel = getRetentionStatusLabel(member.retentionStatus)
                  return (
                    <span className={`inline-flex px-2 py-1 ${statusLabel.bgColor} ${statusLabel.textColor} rounded-md text-xs font-poppins font-semibold`}>
                      {statusLabel.label}
                    </span>
                  )
                })()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Mulai Membership</p>
                <p className="text-gray-900 font-poppins">{member.membershipStart ? format(new Date(member.membershipStart), 'dd MMM yyyy', { locale: id }) : '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Berakhir Membership</p>
                <p className="text-gray-900 font-poppins">{member.membershipEnd ? format(new Date(member.membershipEnd), 'dd MMM yyyy', { locale: id }) : '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Terakhir Kunjung</p>
                <p className="text-gray-900 font-poppins">{member.lastVisitDate ? format(new Date(member.lastVisitDate), 'dd MMM yyyy HH:mm', { locale: id }) : '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-poppins mb-1">Dibuat Pada</p>
                <p className="text-gray-900 font-poppins">{format(new Date(member.createdAt), 'dd MMM yyyy HH:mm', { locale: id })}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/35 p-6">
            <h2 className="text-lg font-oswald font-semibold text-gray-900 mb-4">Rekomendasi Retensi</h2>
            {member.retentionRecommendations.length > 0 ? (
              <div className="space-y-4">
                {member.retentionRecommendations.map((rec, index) => {
                  // Cek apakah email reminder untuk rekomendasi ini sudah pernah dikirim (sesuai enum ReminderType)
                  const emailSent = member.emailReminders?.some(
                    (reminder: any) => 
                      (rec.type === 'expiring' && (reminder.type === 'EXPIRING_H3' || reminder.type === 'EXPIRING_H1')) || 
                      reminder.type === 'EXPIRED' || reminder.type === 'OVERDUE_H3' || reminder.type === 'OVERDUE_H7'
                  );
                  
                  return (
                    <div key={index} className={`p-4 rounded-xl border ${
                      rec.type === 'RISIKO_TINGGI' ? 'border-red-200 bg-red-50' :
                      rec.type === 'PERLU_DIPERHATIKAN' ? 'border-yellow-200 bg-yellow-50' :
                      'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-poppins font-semibold text-gray-900">{rec.title}</h3>
                        {emailSent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-poppins font-semibold">
                            <Mail className="w-3 h-3" />
                            Sudah dikirim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-poppins font-semibold">
                            <Mail className="w-3 h-3" />
                            Belum dikirim
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-poppins text-gray-700 mb-2">{rec.message}</p>
                      <p className="text-sm font-poppins text-blue-600">
                        💡 Sistem akan otomatis mengirimkan email reminder kepada {member.name} ketika waktu yang ditentukan tiba. 
                        Anda bisa melihat riwayat email yang terkirim di bagian &quot;Riwayat Email Reminder&quot; di bawah ini.
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-600 font-poppins text-sm">Tidak ada rekomendasi retensi saat ini</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/35 p-6">
            <h2 className="text-lg font-oswald font-semibold text-gray-900 mb-4">Riwayat Kunjungan</h2>
            {member.recentVisits.length > 0 ? (
              <div className="space-y-2">
                {member.recentVisits.map((visit, index) => (
                  <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="text-sm font-poppins">
                      <p className="text-gray-900 font-medium">{visit.visitorName || member.name}</p>
                      <p className="text-gray-600 text-xs">{format(new Date(visit.visitDate), 'dd MMM yyyy HH:mm', { locale: id })}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-poppins font-semibold rounded-md ${
                      visit.checkInStatus === 'CHECKED_IN' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {visit.checkInStatus === 'CHECKED_IN' ? 'Sudah Check-in' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 font-poppins text-sm">Belum ada riwayat kunjungan</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/35 p-6">
            <h2 className="text-lg font-oswald font-semibold text-gray-900 mb-4">Riwayat Email Reminder</h2>
            {member.emailReminders.length > 0 ? (
              <div className="space-y-2">
                {member.emailReminders.map((reminder: any, index: number) => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="text-sm font-poppins">
                      <p className="text-gray-900 font-medium">Email Reminder ({reminder.type})</p>
                      <p className="text-gray-600 text-xs">{format(new Date(reminder.sentAt), 'dd MMM yyyy HH:mm', { locale: id })}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-poppins font-semibold rounded-md ${
                      reminder.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {reminder.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 font-poppins text-sm">Belum ada riwayat email reminder</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/35 p-6">
            <h2 className="text-lg font-oswald font-semibold text-gray-900 mb-4">Statistik</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-700 font-poppins text-sm">Total Kunjungan</p>
                <p className="text-xl font-oswald font-bold text-gray-900">{member.visitCount}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-700 font-poppins text-sm">Total Pembayaran</p>
                <p className="text-xl font-oswald font-bold text-gray-900">{member.paymentCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}

