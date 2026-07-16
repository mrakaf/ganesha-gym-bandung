export const dynamic = 'force-dynamic';
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Edit,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  CalendarDays,
  Mail,
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useToast } from '@/components/ui/Toast'
import { formatMemberCardDisplay } from '@/lib/format-member-card'
import ExportDropdown from '@/components/ui/ExportDropdown'
import { exportPDF, exportExcel, printData, type ExportConfig } from '@/lib/export-utils'

interface Member {
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
  visitCount: number
  paymentCount: number
  lastVisitDate: Date | null
  retentionStatus: 'AMAN' | 'PERLU_DIPERHATIKAN' | 'RISIKO_TINGGI'
}



const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Tidak aktif' },
  { value: 'expired', label: 'Kedaluwarsa' },
]

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'nameAsc' | 'nameDesc' | 'endSoonest' | 'endLatest'>('nameAsc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { success, error: showError } = useToast()
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    memberCardId: '',
    isActive: true,
    membershipStart: '',
    membershipEnd: '',
  })



  const fetchMembers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        filter,
        page: page.toString(),
        limit: '20',
      })
      const response = await fetch(`/api/admin/members?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  // Debounce search untuk mengurangi request
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMembers()
    }, search ? 500 : 0) // Debounce 500ms jika ada search, langsung fetch jika kosong

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, page]) // fetchMembers tidak perlu di dependency karena tidak berubah

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return format(new Date(date), 'dd MMM yyyy', { locale: id })
  }

  const formatDateInput = (date: Date | null) => {
    if (!date) return ''
    return format(new Date(date), 'yyyy-MM-dd')
  }

  const getRetentionStatusLabel = (status: string) => {
    switch(status) {
      case 'AMAN': return { label: 'Aman', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' }
      case 'PERLU_DIPERHATIKAN': return { label: 'Perlu Diperhatikan', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-300' }
      case 'RISIKO_TINGGI': return { label: 'Risiko Tinggi', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' }
      default: return { label: 'Aman', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' }
    }
  }

  const openCreateModal = () => {
    setEditingMember(null)
    setFormData({
      name: '',
      email: '',
      username: '',
      phone: '',
      memberCardId: '',
      isActive: true,
      membershipStart: '',
      membershipEnd: '',
    })
    setShowModal(true)
  }

  const openEditModal = (member: Member) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email || '',
      username: member.username || '',
      phone: member.phone || '',
      memberCardId: member.memberCardId || '',
      isActive: member.isActive,
      membershipStart: formatDateInput(member.membershipStart),
      membershipEnd: formatDateInput(member.membershipEnd),
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showError('Nama wajib diisi')
      return
    }

    setSaving(true)
    try {
      const url = editingMember 
        ? `/api/admin/members/${editingMember.id}`
        : '/api/admin/members'
      
      const method = editingMember ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          username: formData.username.trim() || null,
          phone: formData.phone.trim() || null,
          memberCardId: formData.memberCardId.trim() || null,
          isActive: formData.isActive,
          membershipStart: formData.membershipStart || null,
          membershipEnd: formData.membershipEnd || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        success(editingMember ? 'Member berhasil diupdate' : 'Member berhasil dibuat')
        setShowModal(false)
        fetchMembers()
      } else {
        showError(data.error || 'Gagal menyimpan member')
      }
    } catch (error) {
      console.error('Error saving member:', error)
      showError('Terjadi kesalahan saat menyimpan member')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingMember) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/members/${deletingMember.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        success('Member berhasil dihapus')
        setShowDeleteModal(false)
        setDeletingMember(null)
        fetchMembers()
      } else {
        showError(data.error || 'Gagal menghapus member')
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      showError('Terjadi kesalahan saat menghapus member')
    } finally {
      setSaving(false)
    }
  }

  const openDeleteModal = (member: Member) => {
    setDeletingMember(member)
    setShowDeleteModal(true)
  }



  const buildExportConfig = (): ExportConfig => {
    const rows = sortedMembers.map((m) => ({
      name: m.name,
      email: m.email || '-',
      phone: m.phone || '-',
      memberCardId: formatMemberCardDisplay(m.memberCardId) || '-',
      status: m.isActive ? 'Aktif' : 'Nonaktif',
      membershipStart: m.membershipStart ? format(new Date(m.membershipStart), 'dd/MM/yyyy') : '-',
      membershipEnd: m.membershipEnd ? format(new Date(m.membershipEnd), 'dd/MM/yyyy') : '-',
      visits: String(m.visitCount),
      payments: String(m.paymentCount),
    }))
    return {
      title: 'Laporan Data Member',
      subtitle: filter !== 'all' ? `Filter: ${FILTER_OPTIONS.find((o) => o.value === filter)?.label || filter}` : undefined,
      filename: 'members-report',
      columns: [
        { header: 'Nama', key: 'name', width: 45 },
        { header: 'Email', key: 'email', width: 50 },
        { header: 'Telepon', key: 'phone', width: 30 },
        { header: 'Kartu', key: 'memberCardId', width: 25 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Mulai', key: 'membershipStart', width: 25 },
        { header: 'Berakhir', key: 'membershipEnd', width: 25 },
        { header: 'Kunj.', key: 'visits', width: 15 },
        { header: 'Bayar', key: 'payments', width: 15 },
      ],
      data: rows,
    }
  }

  const activeOnPage = members.filter((member) => member.isActive).length
  const expiredOnPage = members.filter(
    (member) => member.membershipEnd && new Date(member.membershipEnd) < new Date()
  ).length

  const membershipExpired = (member: Member) =>
    Boolean(member.membershipEnd && new Date(member.membershipEnd) < new Date())

  const sortedMembers = useMemo(() => {
    const data = [...members]
    data.sort((a, b) => {
      if (sortBy === 'nameAsc') {
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
      }
      if (sortBy === 'nameDesc') {
        return b.name.localeCompare(a.name, 'id', { sensitivity: 'base' })
      }

      const aTs = a.membershipEnd ? new Date(a.membershipEnd).getTime() : Number.POSITIVE_INFINITY
      const bTs = b.membershipEnd ? new Date(b.membershipEnd).getTime() : Number.POSITIVE_INFINITY
      if (sortBy === 'endSoonest') {
        return aTs - bTs
      }
      return bTs - aTs
    })
    return data
  }, [members, sortBy])

  return (
    <div className="space-y-6 animate-fade-in rounded-3xl border border-sky-100/80 bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 p-3 sm:p-4 md:p-5">
      <div className="relative rounded-2xl border border-slate-200/80 bg-gradient-to-r from-primary-dark via-primary to-accent shadow-md">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="p-5 md:p-6 relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-oswald font-bold text-white drop-shadow-sm">Data member</h1>
              <p className="mt-1 text-sm md:text-base text-white/90 font-poppins">
                Kelola profil member, status membership, dan histori aktivitas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                onExportPDF={() => exportPDF(buildExportConfig())}
                onExportExcel={() => exportExcel(buildExportConfig())}
                onPrint={() => printData(buildExportConfig())}
              />
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2.5 text-sm font-poppins font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:bg-white/25 hover:scale-[1.03] active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" />
                Tambah member
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/25 bg-white/12 backdrop-blur-sm px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-white/80 font-poppins">Total member</p>
              <p className="mt-1 text-2xl font-oswald font-bold text-white">{total}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/35 bg-emerald-400/10 backdrop-blur-sm px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-emerald-100 font-poppins">Aktif</p>
              <p className="mt-1 text-2xl font-oswald font-bold text-white">{activeOnPage}</p>
            </div>
            <div className="rounded-xl border border-amber-300/35 bg-amber-400/10 backdrop-blur-sm px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-100 font-poppins">Expired</p>
              <p className="mt-1 text-2xl font-oswald font-bold text-white">{expiredOnPage}</p>
            </div>
          </div>
        </div>
      </div>



        <div className="rounded-xl shadow-sm border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  autoComplete="off"
                  placeholder="Cari nama, email, username, telepon, atau kartu member..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent font-poppins text-gray-900 bg-gray-50/80 placeholder:text-gray-400"
                />
              </div>

              <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" aria-hidden />
                    Filter cepat
                  </p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status member">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={filter === opt.value}
                        onClick={() => {
                          setFilter(opt.value)
                          setPage(1)
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-poppins font-medium transition-all ${
                          filter === opt.value
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/90 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-poppins mb-1">Urutkan</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as 'nameAsc' | 'nameDesc' | 'endSoonest' | 'endLatest')
                      }
                      className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white font-poppins text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="nameAsc">Nama (A-Z)</option>
                      <option value="nameDesc">Nama (Z-A)</option>
                      <option value="endSoonest">Berakhir paling dekat</option>
                      <option value="endLatest">Berakhir paling lama</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl shadow-sm border border-gray-200 overflow-hidden bg-white">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 font-poppins">Memuat data...</p>
                </div>
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center py-14 px-4">
                <div className="text-center max-w-sm">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-800 font-poppins font-medium">Tidak ada member yang cocok</p>
                  <p className="text-gray-500 text-sm font-poppins mt-1">
                    Ubah filter, kosongkan pencarian, atau tambah member baru.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-sm font-poppins text-gray-600">
                    Menampilkan{' '}
                    <span className="font-semibold text-gray-900">{members.length}</span> member di halaman ini
                    {total > 0 && (
                      <>
                        {' '}
                        · Total data: <span className="font-semibold text-gray-900">{total}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Mobile: kartu */}
                <ul className="md:hidden divide-y divide-gray-100">
                  {sortedMembers.map((member) => {
                    const isExpired = membershipExpired(member)
                    return (
                      <li key={member.id} className="p-4 space-y-3 odd:bg-white even:bg-slate-50/45">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {member.isActive ? (
                                <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <UserX className="w-4 h-4 text-red-500 shrink-0" />
                              )}
                              <button
                                onClick={() => router.push(`/admin/members/${member.id}`)}
                                className="font-oswald font-bold text-gray-900 truncate hover:text-accent transition-colors"
                              >
                                {member.name}
                              </button>
                            </div>
                            <div className="mt-1 flex items-start gap-1.5 text-sm text-gray-700 font-poppins">
                              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span className="break-all">{member.email || member.username || '—'}</span>
                            </div>
                            {member.phone && (
                              <p className="text-xs text-gray-500 font-poppins mt-1">{member.phone}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {member.isActive ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-md text-xs font-poppins font-semibold">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-poppins font-semibold">
                                Nonaktif
                              </span>
                            )}
                            {(() => {
                              const statusLabel = getRetentionStatusLabel(member.retentionStatus)
                              return (
                                <span className={`px-2 py-0.5 ${statusLabel.bgColor} ${statusLabel.textColor} rounded-md text-xs font-poppins font-semibold`}>
                                  {statusLabel.label}
                                </span>
                              )
                            })()}
                            {isExpired && member.isActive && (
                              <span className="text-[10px] font-poppins text-red-600 font-medium">Jatuh tempo</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-poppins">
                          <span className="rounded-lg bg-gray-100 text-gray-700 px-2 py-1">
                            Kartu: {formatMemberCardDisplay(member.memberCardId) || '—'}
                          </span>
                          <span className="rounded-lg bg-slate-100 text-slate-700 px-2 py-1">
                            {member.visitCount} kunj. · {member.paymentCount} bayar
                          </span>
                        </div>
                        <div className="text-sm font-poppins text-gray-700">
                          {member.membershipStart ? (
                            <div className="flex items-start gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <span>
                                {formatDate(member.membershipStart)} – {formatDate(member.membershipEnd)}
                                {isExpired && (
                                  <span className="block text-red-600 text-xs mt-0.5">Masa berlaku habis</span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Belum ada periode membership</span>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-blue-50 py-2.5 text-blue-800 font-poppins text-sm font-semibold hover:bg-blue-100"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(member)}
                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-red-50 py-2.5 text-red-800 font-poppins text-sm font-semibold hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                            Hapus
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {/* Desktop: tabel */}
                <div className="hidden md:block overflow-x-hidden bg-gradient-to-b from-white to-slate-50/35">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-poppins font-bold text-gray-500 uppercase tracking-wide w-[30%]">
                          Member
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-poppins font-bold text-gray-500 uppercase tracking-wide w-[12%]">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-poppins font-bold text-gray-500 uppercase tracking-wide w-[18%]">
                          Retensi
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-poppins font-bold text-gray-500 uppercase tracking-wide w-[20%]">
                          Membership
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-poppins font-bold text-gray-500 uppercase tracking-wide w-[20%]">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMembers.map((member) => {
                        const isExpired = membershipExpired(member)
                        return (
                          <tr key={member.id} className="border-b border-gray-100 odd:bg-white even:bg-slate-50/45 hover:bg-amber-50/40 transition-colors">
                            <td className="py-3 px-4 align-top">
                              <div className="space-y-1.5 font-poppins text-sm min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  {member.isActive ? (
                                    <UserCheck className="w-4 h-4 text-green-500 shrink-0" />
                                  ) : (
                                    <UserX className="w-4 h-4 text-red-500 shrink-0" />
                                  )}
                                  <button
                                    onClick={() => router.push(`/admin/members/${member.id}`)}
                                    className="font-medium text-gray-900 truncate hover:text-accent transition-colors"
                                  >
                                    {member.name}
                                  </button>
                                </div>
                                <div className="text-gray-900 flex items-center gap-1.5 min-w-0">
                                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="truncate">{member.email || member.username || '-'}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  {member.phone && <span className="text-gray-500">{member.phone}</span>}
                                  <span className="rounded-md bg-gray-100 text-gray-700 px-2 py-0.5">
                                    Kartu: {formatMemberCardDisplay(member.memberCardId) || '-'}
                                  </span>
                                  <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5">
                                    {member.visitCount} kunj. · {member.paymentCount} bayar
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-col gap-1">
                                {member.isActive ? (
                                  <span className="inline-flex w-fit px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-poppins font-semibold">
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex w-fit px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-poppins font-semibold">
                                    Nonaktif
                                  </span>
                                )}
                                {isExpired && member.isActive && (
                                  <span className="inline-flex items-center gap-1 text-xs font-poppins text-red-600">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    Jatuh tempo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              {(() => {
                                const statusLabel = getRetentionStatusLabel(member.retentionStatus)
                                return (
                                  <span className={`inline-flex w-fit px-2 py-1 ${statusLabel.bgColor} ${statusLabel.textColor} rounded-md text-xs font-poppins font-semibold`}>
                                    {statusLabel.label}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="text-sm font-poppins">
                                {member.membershipStart ? (
                                  <>
                                    <div className="text-gray-900 flex items-start gap-1.5">
                                      <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                      <span className="leading-snug">
                                        {formatDate(member.membershipStart)} – {formatDate(member.membershipEnd)}
                                      </span>
                                    </div>
                                    {isExpired && (
                                      <p className="text-red-600 text-xs mt-1">Masa berlaku habis</p>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(member)}
                                  className="inline-flex w-full justify-center items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-blue-800 hover:bg-blue-100 font-poppins text-sm font-semibold transition-colors"
                                  title="Edit member"
                                >
                                  <Edit className="w-4 h-4 shrink-0" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(member)}
                                  className="inline-flex w-full justify-center items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-2 text-red-800 hover:bg-red-100 font-poppins text-sm font-semibold transition-colors"
                                  title="Hapus member"
                                >
                                  <Trash2 className="w-4 h-4 shrink-0" />
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - Enhanced Design */}
                {totalPages > 1 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700 font-poppins font-medium">
                      Halaman <span className="font-bold text-gray-900">{page}</span> dari <span className="font-bold text-gray-900">{totalPages}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-poppins text-sm font-medium transition-all"
                      >
                        Sebelumnya
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-poppins text-sm font-medium transition-all"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>





      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-oswald font-bold text-gray-900">
                {editingMember ? 'Edit data member' : 'Tambah member baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!editingMember}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingMember}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!!editingMember}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="username (opsional)"
                  />
                  <p className="text-xs text-gray-500 font-poppins mt-1">Opsional. Format: huruf, angka, underscore.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!!editingMember}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="081234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                    Member Card ID
                  </label>
                  <input
                    type="text"
                    value={formData.memberCardId}
                    onChange={(e) => setFormData({ ...formData, memberCardId: e.target.value })}
                    disabled={!!editingMember}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    placeholder="MC-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                    Tanggal Mulai Membership
                  </label>
                  <input
                    type="date"
                    value={formData.membershipStart}
                    onChange={(e) => setFormData({ ...formData, membershipStart: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                    Tanggal Akhir Membership
                  </label>
                  <input
                    type="date"
                    value={formData.membershipEnd}
                    onChange={(e) => setFormData({ ...formData, membershipEnd: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                  />
                  <span className="text-sm font-poppins text-gray-700">Status member aktif</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-poppins text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent-light text-white rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-poppins text-sm font-medium transition-all"
              >
                {saving ? 'Menyimpan...' : editingMember ? 'Simpan perubahan' : 'Simpan member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-oswald font-bold text-gray-900 mb-3">Hapus Member?</h3>
              <p className="text-gray-600 mb-6 font-poppins">
                Apakah Anda yakin ingin menghapus member <strong>{deletingMember.name}</strong>? 
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingMember(null)
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-poppins text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all font-poppins text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

