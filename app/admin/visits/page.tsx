
'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, X, CalendarDays, User, Edit, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useToast } from '@/components/ui/Toast'
import ExportDropdown from '@/components/ui/ExportDropdown'
import { exportPDF, exportExcel, printData, type ExportConfig } from '@/lib/export-utils'

interface Visit {
  id: string
  memberId: string | null
  visitorName: string | null
  visitDate: Date
  notes: string | null
  checkInStatus: 'PENDING' | 'CHECKED_IN'
  createdAt: Date
  member: {
    id: string
    name: string
    email: string | null
    memberCardId: string | null
    phone: string | null
  } | null
}

interface Member {
  id: string
  name: string
  isActive: boolean
}

export default function VisitsPage() {
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const { success, error: showError } = useToast()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Edit state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null)
  const [editName, setEditName] = useState('')
  const [editVisitDate, setEditVisitDate] = useState('')
  const [editVisitTime, setEditVisitTime] = useState('')
  const [editNotes, setEditNotes] = useState('')
  
  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingVisit, setDeletingVisit] = useState<Visit | null>(null)
  
  // Create state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createVisitDate, setCreateVisitDate] = useState(getTodayDate())
  const [createVisitTime, setCreateVisitTime] = useState('')
  const [createNotes, setCreateNotes] = useState('')

  // Submitting state
  const [submitting, setSubmitting] = useState(false)

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.append('name', search)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/admin/visits?${params}`)
      if (response.ok) {
        const data = await response.json()
        setVisits(data.visits)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching visits:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Build export config with current visits (for now)
  const buildExportConfig = (data: Visit[]): ExportConfig => {
    console.log('Building export config with data:', data)
    const rows = data.map((v) => ({
      name: v.visitorName || v.member?.name || '-',
      tanggal: formatDate(v.visitDate),
      waktuKunjungan: formatDate(v.createdAt, true),
      catatan: v.notes || '-',
    }))
    console.log('Export rows:', rows)
    return {
      title: 'Laporan Data Kunjungan',
      subtitle: search ? `Pencarian: ${search}` : undefined,
      filename: 'kunjungan-report',
      columns: [
        { header: 'Nama', key: 'name', width: 45 },
        { header: 'Tanggal Kunjungan', key: 'tanggal', width: 30 },
        { header: 'Waktu Kunjungan', key: 'waktuKunjungan', width: 35 },
        { header: 'Catatan', key: 'catatan', width: 40 },
      ],
      data: rows,
    }
  }
  
  // Export handlers
  const handleExportPDF = async () => {
    console.log('handleExportPDF called with current visits:', visits)
    try {
      exportPDF(buildExportConfig(visits))
    } catch (error) {
      console.error('Error in handleExportPDF:', error)
    }
  }
  
  const handleExportExcel = async () => {
    console.log('handleExportExcel called with current visits:', visits)
    try {
      exportExcel(buildExportConfig(visits))
    } catch (error) {
      console.error('Error in handleExportExcel:', error)
    }
  }
  
  const handlePrint = async () => {
    console.log('handlePrint called with current visits:', visits)
    try {
      printData(buildExportConfig(visits))
    } catch (error) {
      console.error('Error in handlePrint:', error)
    }
  }

  useEffect(() => {
    fetchVisits()
  }, [search, startDate, endDate, page])

  const formatDate = (date: Date | string, includeTime: boolean = false) => {
    if (includeTime) {
      return format(new Date(date), 'HH:mm', { locale: id })
    }
    return format(new Date(date), 'dd MMM yyyy', { locale: id })
  }

  const applyTodayFilter = () => {
    const today = getTodayDate()
    setStartDate(today)
    setEndDate(today)
    setPage(1)
  }

  const clearDateFilters = () => {
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Edit functions
  const openEditModal = (visit: Visit) => {
    setEditingVisit(visit)
    setEditName(visit.visitorName || visit.member?.name || '')
    // Extract date and time from visitDate
    const dateObj = new Date(visit.visitDate)
    setEditVisitDate(dateObj.toISOString().split('T')[0])
    setEditVisitTime(format(dateObj, 'HH:mm'))
    setEditNotes(visit.notes || '')
    setShowEditModal(true)
  }
  
  const saveEdit = async () => {
    if (!editingVisit) return
    setSubmitting(true)
    try {
      // Combine date and time
      const [year, month, day] = editVisitDate.split('-').map(Number)
      let hours, minutes
      if (editVisitTime) {
        [hours, minutes] = editVisitTime.split(':').map(Number)
      } else {
        const originalDate = new Date(editingVisit.visitDate)
        hours = originalDate.getHours()
        minutes = originalDate.getMinutes()
      }
      const combinedDate = new Date(year, month - 1, day, hours, minutes)
      
      const data: any = {
        visitDate: combinedDate.toISOString(),
        notes: editNotes,
      }
      
      const response = await fetch(`/api/admin/visits/${editingVisit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        success('Kunjungan berhasil diperbarui')
        setShowEditModal(false)
        setEditingVisit(null)
        fetchVisits()
      } else {
        const err = await response.json()
        showError(err.error || 'Gagal memperbarui kunjungan')
      }
    } catch (error) {
      console.error('Error updating visit:', error)
      showError('Terjadi kesalahan saat memperbarui kunjungan')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete functions
  const openDeleteModal = (visit: Visit) => {
    setDeletingVisit(visit)
    setShowDeleteModal(true)
  }
  
  const executeDelete = async () => {
    if (!deletingVisit) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/admin/visits/${deletingVisit.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        success('Kunjungan berhasil dihapus')
        setShowDeleteModal(false)
        setDeletingVisit(null)
        fetchVisits()
      } else {
        const err = await response.json()
        showError(err.error || 'Gagal menghapus kunjungan')
      }
    } catch (error) {
      console.error('Error deleting visit:', error)
      showError('Terjadi kesalahan saat menghapus kunjungan')
    } finally {
      setSubmitting(false)
    }
  }

  // Create function
  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      showError('Nama pengunjung wajib diisi')
      return
    }
    
    setSubmitting(true)
    try {
      // Combine date and time
      const [year, month, day] = createVisitDate.split('-').map(Number)
      let hours, minutes
      if (createVisitTime) {
        [hours, minutes] = createVisitTime.split(':').map(Number)
      } else {
        const now = new Date()
        hours = now.getHours()
        minutes = now.getMinutes()
      }
      const combinedDate = new Date(year, month - 1, day, hours, minutes)
      
      const response = await fetch('/api/admin/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          visitDate: combinedDate.toISOString(),
          notes: createNotes,
        }),
      })

      if (response.ok) {
        success('Kunjungan berhasil dicatat')
        setShowCreateModal(false)
        setCreateName('')
        setCreateVisitDate(new Date().toISOString().split('T')[0])
        setCreateVisitTime('')
        setCreateNotes('')
        fetchVisits()
      } else {
        const err = await response.json()
        showError(err.error || 'Gagal mencatat kunjungan')
      }
    } catch (error) {
      console.error('Error creating visit:', error)
      showError('Terjadi kesalahan saat mencatat kunjungan')
    } finally {
      setSubmitting(false)
    }
  }





  return (
    <div className="space-y-6 animate-fade-in rounded-3xl border border-sky-100/80 bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 p-3 sm:p-4 md:p-5">
      
      <div className="relative rounded-2xl border border-slate-200/80 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 shadow-md">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_45%)]" />
        <div className="p-5 md:p-6 relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-oswald font-bold text-white drop-shadow-sm">Data Kunjungan</h1>
              <p className="mt-1 text-sm md:text-base text-white/90 font-poppins">
                Kelola dan catat semua kunjungan member dan pengunjung gym.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportDropdown
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
                onPrint={handlePrint}
              />
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2.5 text-sm font-poppins font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:bg-white/25 hover:scale-[1.03] active:scale-[0.97]"
              >
                <Plus className="w-4 h-4" />
                Tambah Kunjungan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl shadow-sm border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Cari nama pengunjung..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent font-poppins text-gray-900 bg-gray-50/80 placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wide mb-2">Tanggal Mulai</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent font-poppins text-gray-900 bg-gray-50/80"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-poppins font-semibold text-gray-500 uppercase tracking-wide mb-2">Tanggal Akhir</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent font-poppins text-gray-900 bg-gray-50/80"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyTodayFilter}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-light text-white text-sm font-poppins font-semibold shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            <CalendarDays className="w-4 h-4" />
            Hari Ini
          </button>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={clearDateFilters}
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-poppins font-semibold transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-poppins">Memuat data...</p>
            </div>
          </div>
        ) : visits.length === 0 ? (
          <div className="flex items-center justify-center py-14 px-4">
            <div className="text-center max-w-sm">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-800 font-poppins font-medium">Tidak ada kunjungan</p>
              <p className="text-gray-500 text-sm font-poppins mt-1">
                Catat kunjungan pertama dengan tombol di atas.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">Nama</th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">Tanggal Kunjungan</th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">Waktu Kunjungan</th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">Catatan</th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700 min-w-[9rem]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-poppins text-sm text-gray-900">
                          {visit.visitorName || visit.member?.name || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-poppins text-sm text-gray-600">
                          {formatDate(visit.visitDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-poppins text-sm text-gray-600">
                          {formatDate(visit.createdAt, true)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className="font-poppins text-sm text-gray-600">
                          {visit.notes || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(visit)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-poppins font-semibold px-3 py-2 transition-colors w-full"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(visit)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 text-xs font-poppins font-semibold px-3 py-2 transition-colors w-full"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-600 font-poppins">
                  Halaman {page} dari {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-poppins text-sm"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-poppins text-sm"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingVisit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-oswald font-bold text-gray-900">
                Edit Kunjungan
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingVisit(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Nama Pengunjung
                </label>
                <input
                  type="text"
                  value={editName}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Tanggal Kunjungan
                </label>
                <input
                  type="date"
                  value={editVisitDate}
                  onChange={(e) => setEditVisitDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Waktu Kunjungan
                </label>
                <input
                  type="time"
                  value={editVisitTime}
                  onChange={(e) => setEditVisitTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Masukkan catatan tambahan..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingVisit(null)
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-poppins text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-light text-white rounded-xl hover:shadow-md disabled:opacity-60 font-poppins text-sm font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deletingVisit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-oswald font-bold text-gray-900 mb-3">Hapus Kunjungan?</h3>
              <p className="text-gray-600 mb-6 font-poppins">
                Apakah Anda yakin ingin menghapus kunjungan dari{" "}
                <strong>{deletingVisit.visitorName || deletingVisit.member?.name}</strong>?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingVisit(null)
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-poppins text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={executeDelete}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-colors font-poppins text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  {submitting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Visit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-oswald font-bold text-gray-900">
                Catat Kunjungan Manual
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setCreateName('')
                  setCreateVisitDate(getTodayDate())
                  setCreateVisitTime('')
                  setCreateNotes('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Nama Pengunjung
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Masukkan nama pengunjung"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Tanggal Kunjungan
                </label>
                <input
                  type="date"
                  value={createVisitDate}
                  onChange={(e) => setCreateVisitDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Waktu Kunjungan
                </label>
                <input
                  type="time"
                  value={createVisitTime}
                  onChange={(e) => setCreateVisitTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Masukkan catatan tambahan..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-gray-900 bg-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateName('')
                    setCreateVisitDate(new Date().toISOString().split('T')[0])
                    setCreateVisitTime('')
                    setCreateNotes('')
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-poppins text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-light text-white rounded-xl hover:shadow-md disabled:opacity-60 font-poppins text-sm font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kunjungan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
