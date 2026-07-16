'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, DollarSign, Loader2, Banknote, Search } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useToast } from '@/components/ui/Toast'
import { formatMemberCardDisplay } from '@/lib/format-member-card'

interface Payment {
  id: string
  memberId: string | null
  member: {
    id: string
    name: string
    email: string | null
    phone: string | null
    memberCardId: string | null
  } | null
  type: string
  amount: number
  status: string
  paymentMethod: string | null
  description: string | null
  paidAt: Date | null
  createdAt: Date
}

export default function PaymentsPage() {
  const { success, error: showError } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [cashConfirmPayment, setCashConfirmPayment] = useState<Payment | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (status) params.append('status', status)
      if (search) params.append('search', search)
      if (type) params.append('type', type)
      if (paymentMethod) params.append('paymentMethod', paymentMethod)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/admin/payments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [status, search, type, paymentMethod, startDate, endDate, page])

  const executeCashConfirmation = async () => {
    if (!cashConfirmPayment) return
    const paymentId = cashConfirmPayment.id
    setCashConfirmPayment(null)
    setConfirmingId(paymentId)
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/confirm`, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        showError(typeof data?.error === 'string' ? data.error : 'Gagal mengonfirmasi pembayaran')
        return
      }
      success('Pembayaran tunai berhasil dikonfirmasi.')
      fetchPayments()
    } catch {
      showError('Terjadi kesalahan saat mengonfirmasi pembayaran')
    } finally {
      setConfirmingId(null)
    }
  }

  const methodLabel = (m: string | null) => {
    if (!m) return '-'
    const x = m.toLowerCase()
    if (x === 'qris') return 'QRIS'
    if (x === 'cash') return 'Tunai'
    return m
  }

  const paymentTypeLabel = (typeValue: string) => {
    if (typeValue === 'MEMBERSHIP_NEW' || typeValue === 'MEMBERSHIP_RENEWAL') return 'Member'
    if (typeValue === 'VISIT') return 'Visit'
    return typeValue
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: id })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700'
      case 'FAILED':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header dengan gradient background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-oswald font-bold text-white mb-2 drop-shadow-lg">
            Payments Management
          </h1>
          <p className="text-white/90 font-poppins text-sm md:text-base">
            Kelola transaksi pembayaran
          </p>
        </div>
      </div>

      {/* Filters - Enhanced Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
              Pencarian
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nama atau Email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
              Tipe Pembayaran
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
            >
              <option value="">Semua Tipe</option>
              <option value="VISIT">Visit</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
              Metode
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
            >
              <option value="">Semua Metode</option>
              <option value="qris">QRIS</option>
              <option value="cash">Tunai</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-poppins font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-poppins text-gray-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Payments Table - Enhanced Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-poppins">Memuat data...</p>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-poppins">Tidak ada pembayaran ditemukan</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Nama
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Tipe
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Payment Method
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Paid At
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700">
                      Created At
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-poppins font-semibold text-gray-700 min-w-[9rem]">
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-poppins text-sm text-gray-900">
                          {payment.member?.name || payment.member?.email || '-'}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {payment.member?.email && payment.member?.name && (
                            <div className="text-[10px] text-gray-500 font-poppins">
                              {payment.member.email}
                            </div>
                          )}
                          {payment.member?.phone && (
                            <div className="text-[10px] text-gray-500 font-poppins">
                              Telp: {payment.member.phone}
                            </div>
                          )}
                          {payment.member?.memberCardId && (
                            <div className="text-[10px] text-gray-500 font-poppins">
                              ID: {formatMemberCardDisplay(payment.member.memberCardId)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-poppins text-sm text-gray-600">{paymentTypeLabel(payment.type)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-poppins text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          <span className={`px-2 py-1 rounded text-xs font-poppins font-medium ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-poppins font-medium ${payment.paymentMethod?.toLowerCase() === 'cash'
                              ? 'bg-amber-100 text-amber-900'
                              : payment.paymentMethod?.toLowerCase() === 'qris'
                                ? 'bg-cyan-100 text-cyan-900'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {methodLabel(payment.paymentMethod)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-poppins text-sm text-gray-600">
                          {formatDate(payment.paidAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-poppins text-sm text-gray-500">
                          {formatDate(payment.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-col gap-2">
                          {payment.status === 'PENDING' &&
                          payment.paymentMethod?.toLowerCase() === 'cash' ? (
                            <button
                              type="button"
                              disabled={confirmingId === payment.id}
                              onClick={() => setCashConfirmPayment(payment)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-poppins font-semibold px-3 py-2 transition-colors shadow-sm w-full"
                            >
                              {confirmingId === payment.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  Memproses
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  Konfirmasi tunai
                                </>
                              )}
                            </button>
                          ) : payment.status === 'PENDING' &&
                            payment.paymentMethod?.toLowerCase() === 'qris' ? (
                            <span className="font-poppins text-xs text-gray-500 leading-snug">
                              Menunggu QRIS dari gateway
                            </span>
                          ) : null}

                          {payment.description && (
                            <span className="font-poppins text-[10px] text-gray-500 leading-snug italic">
                              {payment.description}
                            </span>
                          )}

                          {!payment.description &&
                            payment.status !== 'PENDING' && (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
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

      {cashConfirmPayment && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cash-confirm-title"
          onClick={() => setCashConfirmPayment(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="cash-confirm-title" className="text-lg font-oswald font-bold">
                    Konfirmasi pembayaran tunai
                  </h3>
                  <p className="text-sm text-white/90 font-poppins mt-0.5">
                    Pastikan uang tunai telah diterima di kasir
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 font-poppins text-sm text-gray-700 space-y-1.5">
                <p>
                  <span className="text-gray-500">Nama:</span>{' '}
                  <strong className="text-gray-900">{cashConfirmPayment.member?.name ?? '—'}</strong>
                </p>
                <p>
                  <span className="text-gray-500">Paket:</span>{' '}
                  <strong className="text-gray-900">{paymentTypeLabel(cashConfirmPayment.type)}</strong>
                </p>
                <p>
                  <span className="text-gray-500">Nominal:</span>{' '}
                  <strong className="text-emerald-700">{formatCurrency(cashConfirmPayment.amount)}</strong>
                </p>
              </div>
              <p className="text-gray-600 text-sm font-poppins leading-relaxed">
                Setelah Anda menekan Ya, pembayaran ini akan ditandai lunas dan benefit member langsung aktif di
                sistem.
              </p>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCashConfirmPayment(null)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors font-poppins text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={confirmingId !== null}
                  onClick={executeCashConfirmation}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-60 text-white rounded-xl transition-all font-poppins text-sm font-semibold shadow-md"
                >
                  Ya, pembayaran diterima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

