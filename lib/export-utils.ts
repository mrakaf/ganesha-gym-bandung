
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

// ─── Types ───────────────────────────────────────────────────
export interface ExportColumn {
  header: string
  key: string
  width?: number
}

export interface ExportConfig {
  title: string
  subtitle?: string
  filename: string
  columns: ExportColumn[]
  data: Record<string, unknown>[]
  orientation?: 'portrait' | 'landscape'
}

// ─── Helpers ───────────────────────────────────────────────
const now = () => format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: localeId })
const dateSuffix = () => format(new Date(), 'yyyy-MM-dd')

function cellValue(row: Record<string, unknown>, key: string): string {
  const val = row[key]
  if (val === null || val === undefined) return '-'
  return String(val)
}

// ─── PDF Export ───────────────────────────────────────────────
export function exportPDF(config: ExportConfig) {
  console.log('=== exportPDF START ===', config)
  try {
    console.log('Initializing jsPDF')
    const { title, subtitle, filename, columns, data, orientation = 'landscape' } = config
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

    const pageWidth = doc.internal.pageSize.getWidth()

    console.log('Adding header to PDF')
    // Header background
    doc.setFillColor(15, 23, 42) // slate-900
    doc.rect(0, 0, pageWidth, 38, 'F')

    // Accent line
    doc.setFillColor(34, 211, 238) // cyan-400
    doc.rect(0, 38, pageWidth, 1.5, 'F')

    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Smart Gym Ganesha Gym', 14, 16)

    // Subtitle / report name
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(title, 14, 24)

    // Meta info
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text(`Diekspor: ${now()}  ·  Total data: ${data.length}`, 14, 32)
    if (subtitle) {
      doc.text(subtitle, 14, 36)
    }

    console.log('Adding table with', data.length, 'rows')
    // Table
    const head = [columns.map((c) => c.header)]
    const body = data.map((row) => columns.map((c) => cellValue(row, c.key)))

    autoTable(doc, {
      startY: 44,
      head,
      body,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
        overflow: 'linebreak',
      },
      columnStyles: columns.reduce(
        (acc, col, i) => {
          if (col.width) acc[i] = { cellWidth: col.width }
          return acc
        },
        {} as Record<number, { cellWidth: number }>
      ),
      margin: { left: 14, right: 14 },
      didDrawPage: (hookData) => {
        // Footer on every page
        const pageH = doc.internal.pageSize.getHeight()
        const pageNum = (hookData as unknown as { pageNumber: number }).pageNumber
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(
          `Smart Gym Ganesha Gym  ·  Halaman ${pageNum}`,
          pageWidth / 2,
          pageH - 8,
          { align: 'center' }
        )
      },
    })

    console.log('Saving PDF')
    doc.save(`${filename}-${dateSuffix()}.pdf`)
    console.log('=== exportPDF SUCCESS ===')
  } catch (error) {
    console.error('=== exportPDF ERROR ===', error)
    throw error
  }
}

// ─── Excel Export ─────────────────────────────────────────────
export function exportExcel(config: ExportConfig) {
  console.log('=== exportExcel START ===', config)
  try {
    const { title, filename, columns, data } = config

    console.log('Building worksheet data')
    // Build header row + data rows
    const headerRow = columns.map((c) => c.header)
    const dataRows = data.map((row) => columns.map((c) => cellValue(row, c.key)))

    const wsData = [
      ['Smart Gym Ganesha Gym'],
      [title],
      [`Diekspor: ${now()}  ·  Total data: ${data.length}`],
      [], // empty row separator
      headerRow,
      ...dataRows,
    ]

    console.log('Creating worksheet')
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    ws['!cols'] = columns.map((col) => ({
      wch: col.width ? Math.round(col.width / 2.5) : Math.max(col.header.length + 4, 15),
    }))

    // Merge header cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: columns.length - 1 } },
    ]

    console.log('Creating workbook and saving')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan')

    XLSX.writeFile(wb, `${filename}-${dateSuffix()}.xlsx`)
    console.log('=== exportExcel SUCCESS ===')
  } catch (error) {
    console.error('=== exportExcel ERROR ===', error)
    throw error
  }
}

// ─── Print (Sama seperti menu laporan: Pakai iframe!) ────────────────────────────────────────────────────
function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function printData(config: ExportConfig) {
  console.log('=== printData START ===', config)
  try {
    const { title, columns, data } = config

    console.log('Creating print HTML')
    const tableRowsHtml = data
      .map(
        (row) => `
      <tr>
        ${columns.map((c) => `<td>${escapeHtml(cellValue(row, c.key))}</td>`).join('')}
      </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
  body{font-family:Poppins,Arial,sans-serif;padding:28px;color:#111;}
  h1{font-size:20px;margin:0 0 8px;font-weight:800;}
  .sub{font-size:13px;color:#64748b;margin-bottom:18px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;}
  th{background:#111827;color:#fff;text-align:left;}
  tbody tr:nth-child(even){background:#f8fafc;}
</style></head><body>
  <h1>Smart Gym Ganesha Gym</h1>
  <div class="sub">${escapeHtml(title)}</div>
  <div class="sub">Dicetak: ${escapeHtml(now())}  ·  Total data: ${data.length}</div>
  <table>
    <thead><tr>${columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('')}</tr></thead>
    <tbody>${tableRowsHtml}</tbody>
  </table>
</body></html>`

    // Iframe method: sama seperti menu laporan
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', `Cetak ${escapeHtml(title)}`)
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const w = iframe.contentWindow
    if (!doc || !w) {
      iframe.remove()
      throw new Error('Browser tidak mengizinkan mencetak dari halaman ini.')
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
        throw new Error('Gagal membuka dialog cetak.')
      } finally {
        setTimeout(cleanup, 800)
      }
    }

    setTimeout(runPrint, 150)
    console.log('=== printData SUCCESS ===')

  } catch (error) {
    console.error('=== printData ERROR ===', error)
    throw error
  }
}

