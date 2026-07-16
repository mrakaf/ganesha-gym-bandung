
'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, Printer, ChevronDown, Loader2 } from 'lucide-react'

interface ExportDropdownProps {
  onExportPDF: () => Promise<void> | void
  onExportExcel: () => Promise<void> | void
  onPrint: () => Promise<void> | void
}

type ExportAction = 'pdf' | 'excel' | 'print' | null

export default function ExportDropdown({ onExportPDF, onExportExcel, onPrint }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<ExportAction>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const run = async (action: ExportAction, fn: () => Promise<void> | void) => {
    console.log('Export action clicked:', action)
    setLoading(action)
    try {
      await fn()
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const items = [
    {
      key: 'pdf' as const,
      label: 'Export PDF',
      desc: 'Laporan format PDF',
      icon: FileText,
      color: 'text-red-500',
      bg: 'bg-red-50',
      fn: onExportPDF,
    },
    {
      key: 'excel' as const,
      label: 'Export Excel',
      desc: 'Spreadsheet .xlsx',
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bg: 'bg-green-50',
      fn: onExportExcel,
    },
    {
      key: 'print' as const,
      label: 'Print',
      desc: 'Cetak laporan A4',
      icon: Printer,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      fn: onPrint,
    },
  ]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          console.log('Export button clicked')
          setOpen(!open)
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2.5 text-sm font-poppins font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:bg-white/25 hover:scale-[1.03] active:scale-[0.97]"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-56 origin-top-left rounded-xl bg-white border border-gray-200 shadow-2xl z-[999999] overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[10px] font-poppins font-semibold text-gray-400 uppercase tracking-wider">Export & Print</p>
          </div>
          {items.map((item) => {
            const Icon = item.icon
            const isLoading = loading === item.key
            return (
              <button
                key={item.key}
                type="button"
                disabled={loading !== null}
                onClick={() => run(item.key, item.fn)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-gray-50 disabled:opacity-50 group"
              >
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  ) : (
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-poppins font-medium text-gray-900">{item.label}</p>
                  <p className="text-[11px] font-poppins text-gray-400">{item.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
