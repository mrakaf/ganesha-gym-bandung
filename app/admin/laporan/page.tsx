'use client'
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format as formatDf } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  FileSpreadsheet,
  FileDown,
  Printer,
  RefreshCw,
  CalendarRange,
  Receipt,
  Loader2,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useToast } from '@/components/ui/Toast'
import { formatMemberCardDisplay } from '@/lib/format-member-card'

type LaporanRow = {
  id: string
  type: string
  amount: number
  paymentMethod: string | null
  description: string | null
  orderId: string | null
  paidAt: string | null
  member: { name: string; email: string | null; memberCardId: string | null } | null
}

type Summary = {
  totalTransactions: number
  totalAmount: number
  byType: Record<string, { count: number; amount: number }>
}

function isoDateSlice(d: Date) {
  return d.toISOString().slice(0, 10)
}

function paymentTypeLabel(t: string) {
  const map: Record<string, string> = {
    VISIT: 'Visit',
    MEMBERSHIP_NEW: 'Member baru',
    MEMBERSHIP_RENEWAL: 'Perpanjangan member',
    PERSONAL_TRAINER: 'Personal trainer',
  }
  return map[t] || t
}

function methodLabel(m: string | null | undefined) {
  if (!m) return '-'
  const x = m.toLowerCase()
  if (x === 'cash') return 'Tunai'
  if (x === 'qris') return 'QRIS'
  return m
}

export default function LaporanPage() {
  const { error: showError, warning } = useToast()
  const [startDate, setStartDate] = useState<string>(() =>
    isoDateSlice(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  )
  const [endDate, setEndDate] = useState<string>(() => isoDateSlice(new Date()))

  const [rows, setRows] = useState<LaporanRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rangeLabel, setRangeLabel] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [loading, setLoading] = useState(true)

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const fetchLaporan = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      const response = await fetch(`/api/admin/laporan/keuangan?${params}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        showError(typeof data?.error === 'string' ? data.error : 'Gagal memuat laporan keuangan')
        setRows([])
        setSummary(null)
        return
      }
      setRows(data.payments || [])
      setSummary(data.summary || null)
      setRangeLabel({ start: data.startDate || '', end: data.endDate || '' })
    } catch {
      showError('Terjadi kesalahan saat memuat laporan')
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchLaporan()
  }, [fetchLaporan])

  const periodText = useMemo(() => {
    if (!rangeLabel.start || !rangeLabel.end) return '—'
    try {
      const a = formatDf(new Date(rangeLabel.start), 'd MMMM yyyy', { locale: id })
      const b = formatDf(new Date(rangeLabel.end), 'd MMMM yyyy', { locale: id })
      return `${a} – ${b}`
    } catch {
      return `${startDate} – ${endDate}`
    }
  }, [rangeLabel, startDate, endDate])

  const downloadPdf = () => {
    if (!rows.length) {
      warning('Tidak ada data untuk diekspor PDF.')
      return
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    doc.setFontSize(14)
    doc.text('Laporan keuangan — Ganesha Gym Bandung', 40, 44)
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(`Periode pembayaran (lunas): ${periodText}`, 40, 62)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    if (summary) {
      doc.text(
        `Total transaksi: ${summary.totalTransactions}  |  Jumlah bersih: ${formatCurrency(summary.totalAmount)}`,
        40,
        78
      )
    }

    const head = [['Tanggal lunas', 'Member', 'Tipe', 'Metode', 'Jumlah (IDR)', 'Referensi']]
    const body = rows.map((r) => [
      r.paidAt ? formatDf(new Date(r.paidAt), 'dd/MM/yyyy HH:mm', { locale: id }) : '-',
      r.member?.name || '-',
      paymentTypeLabel(r.type),
      methodLabel(r.paymentMethod),
      formatCurrency(r.amount),
      r.orderId || r.id.slice(0, 12),
    ])

    autoTable(doc, {
      head,
      body,
      startY: summary ? 90 : 82,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [17, 24, 39], textColor: 255 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 40, right: 40 },
    })

    doc.save(`laporan-keuangan-${startDate}_${endDate}.pdf`)
  }

  const downloadExcel = () => {
    if (!rows.length) {
      warning('Tidak ada data untuk diekspor Excel.')
      return
    }

    const title = [['Laporan keuangan — Ganesha Gym Bandung'], [`Periode: ${periodText}`], []]
    const header = [['Tanggal lunas', 'Member', 'Email member', 'ID kartu', 'Tipe', 'Metode', 'Jumlah', 'Deskripsi', 'Referensi']]
    const dataRows = rows.map((r) => [
      r.paidAt ? formatDf(new Date(r.paidAt), 'yyyy-MM-dd HH:mm', { locale: id }) : '',
      r.member?.name || '',
      r.member?.email || '',
      formatMemberCardDisplay(r.member?.memberCardId) || '',
      paymentTypeLabel(r.type),
      methodLabel(r.paymentMethod),
      r.amount,
      r.description || '',
      r.orderId || '',
    ])

    let summaryRows: (string | number)[][] = []
    if (summary) {
      summaryRows = [
        [],
        ['Ringkasan'],
        ['Total transaksi', summary.totalTransactions],
        ['Jumlah bersih (IDR)', summary.totalAmount],
        [],
        ['Per jenis pembayaran', 'Jumlah trx', 'Subtotal'],
        ...Object.entries(summary.byType).map(([k, v]) => [paymentTypeLabel(k), v.count, v.amount]),
      ]
    }

    const aoa = [...title, ...header, ...dataRows, ...summaryRows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 36 }, { wch: 32 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan keuangan')

    XLSX.writeFile(wb, `laporan-keuangan-${startDate}_${endDate}.xlsx`)
  }

  const printReport = () => {
    if (!rows.length) {
      warning('Tidak ada data untuk dicetak.')
      return
    }

    const tableRowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td>${r.paidAt ? formatDf(new Date(r.paidAt), 'dd/MM/yyyy HH:mm', { locale: id }) : '-'}</td>
        <td>${escapeHtml(r.member?.name || '—')}</td>
        <td>${escapeHtml(paymentTypeLabel(r.type))}</td>
        <td>${escapeHtml(methodLabel(r.paymentMethod))}</td>
        <td style="text-align:right">${formatCurrency(r.amount)}</td>
        <td>${escapeHtml(r.orderId || '')}</td>
      </tr>`
      )
      .join('')

    const summaryHtml = summary
      ? `<p style="margin:12px 0"><strong>Total transaksi:</strong> ${summary.totalTransactions} ·
         <strong>Jumlah bersih:</strong> ${formatCurrency(summary.totalAmount)}</p>`
      : ''

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Laporan keuangan</title>
<style>
  body{font-family:Poppins,Arial,sans-serif;padding:28px;color:#111;}
  h1{font-size:20px;margin:0 0 8px;font-weight:800;}
  .sub{font-size:13px;color:#64748b;margin-bottom:18px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;}
  th{background:#111827;color:#fff;text-align:left;}
  tbody tr:nth-child(even){background:#f8fafc;}
</style></head><body>
  <h1>Laporan keuangan — Ganesha Gym Bandung</h1>
  <div class="sub">Periode pembayaran (lunas): ${escapeHtml(periodText)}</div>
  ${summaryHtml}
  <table>
    <thead><tr><th>Tanggal lunas</th><th>Member</th><th>Tipe</th><th>Metode</th><th>Jumlah</th><th>Referensi</th></tr></thead>
    <tbody>${tableRowsHtml}</tbody>
  </table>
</body></html>`

    // Iframe + delay: window.open + document.write sering berakhir about:blank (popup/noopener/timing).
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Cetak laporan keuangan')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const w = iframe.contentWindow
    if (!doc || !w) {
      iframe.remove()
      showError('Browser tidak mengizinkan mencetak dari halaman ini.')
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    const cleanup = () => {
      iframe.parentNode?.removeChild(iframe)
    }

    const runPrint = () => {
      try {
        w.focus()
        w.print()
      } catch {
        showError('Gagal membuka dialog cetak.')
      } finally {
        setTimeout(cleanup, 800)
      }
    }

    setTimeout(runPrint, 150)
  }

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-800 via-slate-900 to-emerald-900 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 mb-3">
                <Receipt className="w-4 h-4 text-emerald-300" />
                <span className="text-xs uppercase tracking-wide text-emerald-200 font-poppins">Admin</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-oswald font-bold text-white mb-2 drop-shadow-lg">Laporan</h1>
              <p className="text-white/85 font-poppins text-sm md:text-base max-w-2xl">
                Laporan keuangan transaksi lunas bisa diunduh (PDF / Excel) atau dicetak.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="laporan-keuangan-heading" className="space-y-4">
        <h2 id="laporan-keuangan-heading" className="text-2xl font-oswald font-bold text-gray-900">
          Laporan keuangan
        </h2>
        <p className="text-gray-600 font-poppins text-sm max-w-3xl">
          Menampilkan pembayaran berstatus lunas dalam rentang tanggal pembayaran (paid). Sesuaikan periode lalu ekspor atau
          cetak.
        </p>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6">
          <div className="flex flex-col xl:flex-row xl:flex-wrap xl:items-end gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <span className="text-xs font-poppins font-medium text-gray-500 flex items-center gap-1">
                  <CalendarRange className="w-3.5 h-3.5" /> Mulai (dibayar)
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg font-poppins text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </label>
              <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <span className="text-xs font-poppins font-medium text-gray-500">Selesai (dibayar)</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg font-poppins text-gray-900 focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => fetchLaporan()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-poppins text-sm font-medium disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Muat ulang
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={loading || rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-poppins text-sm font-semibold disabled:opacity-50 shadow-sm"
              >
                <FileDown className="w-4 h-4" /> PDF
              </button>
              <button
                type="button"
                onClick={downloadExcel}
                disabled={loading || rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-poppins text-sm font-semibold disabled:opacity-50 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button
                type="button"
                onClick={printReport}
                disabled={loading || rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-poppins text-sm font-semibold disabled:opacity-50 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak
              </button>
            </div>
          </div>

          {summary && !loading && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs text-gray-500 font-poppins uppercase tracking-wide">Periode dipilih</p>
                <p className="font-poppins font-semibold text-gray-900 mt-1 text-sm">{periodText}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs text-emerald-800 font-poppins uppercase tracking-wide">Jumlah bersih</p>
                <p className="font-oswald text-xl text-emerald-900 mt-1">{formatCurrency(summary.totalAmount)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-xs text-slate-500 font-poppins uppercase tracking-wide">Transaksi lunas</p>
                <p className="font-oswald text-xl text-slate-900 mt-1">{summary.totalTransactions}</p>
              </div>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-500 font-poppins gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat data…
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-gray-500 font-poppins text-sm">Tidak ada transaksi lunas di periode ini.</div>
            ) : (
              <table className="w-full text-sm font-poppins">
                <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal lunas</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Member</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipe</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Metode</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Jumlah</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        {r.paidAt ? formatDf(new Date(r.paidAt), 'dd MMM yyyy HH:mm', { locale: id }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        <span className="font-medium">{r.member?.name || '—'}</span>
                        {r.member?.memberCardId && (
                          <span className="block text-xs text-gray-400">
                            ID kartu {formatMemberCardDisplay(r.member.memberCardId)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{paymentTypeLabel(r.type)}</td>
                      <td className="py-3 px-4 text-gray-700">{methodLabel(r.paymentMethod)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 font-mono max-w-[12rem] truncate" title={r.orderId || ''}>
                        {r.orderId || r.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
