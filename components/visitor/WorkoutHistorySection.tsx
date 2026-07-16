'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Loader2,
  CheckCircle2,
  Clock,
  Dumbbell,
  History,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

type SessionRow = {
  id: string
  completedAt: string
  durationMinutes: number | null
  notes: string | null
  exercises: unknown
  createdAt: string
}

function localDayKeyFromIso(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayHeading(dayKey: string): string {
  const [y, mo, d] = dayKey.split('-').map((x) => parseInt(x, 10))
  if (!y || !mo || !d) return dayKey
  const dt = new Date(y, mo - 1, d)
  return dt.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function groupSessionsByLocalDay(sessions: SessionRow[]): { dayKey: string; rows: SessionRow[] }[] {
  const map = new Map<string, SessionRow[]>()
  for (const s of sessions) {
    const k = localDayKeyFromIso(s.completedAt)
    const arr = map.get(k) ?? []
    arr.push(s)
    map.set(k, arr)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dayKey, rows]) => ({ dayKey, rows }))
}

function parseExercises(raw: unknown): { name: string; muscle?: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((x) => {
      if (x && typeof x === 'object' && 'name' in x && typeof (x as { name: unknown }).name === 'string') {
        const o = x as { name: string; muscle?: string }
        return { name: o.name, muscle: o.muscle }
      }
      return null
    })
    .filter(Boolean) as { name: string; muscle?: string }[]
}

type Props = {
  identityEmail: string | null
  identityUsername: string | null
}

/**
 * Riwayat latihan (server). Dipakai di halaman rekomendasi; parent sudah membatasi akses premium.
 */
export function WorkoutHistorySection({ identityEmail, identityUsername }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => groupSessionsByLocalDay(sessions), [sessions])

  const [completedAtLocal, setCompletedAtLocal] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [exerciseLines, setExerciseLines] = useState('')

  useEffect(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    setCompletedAtLocal(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    )
  }, [])

  const fetchHistory = useCallback(async () => {
    if (!identityEmail && !identityUsername) return
    setLoadingList(true)
    setError('')
    try {
      const q = identityEmail
        ? `email=${encodeURIComponent(identityEmail)}`
        : `username=${encodeURIComponent(identityUsername || '')}`
      const response = await fetch(`/api/members/workouts/history?${q}&limit=50`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal memuat riwayat')
      setSessions(Array.isArray(data.sessions) ? data.sessions : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal memuat riwayat')
      setSessions([])
    } finally {
      setLoadingList(false)
    }
  }, [identityEmail, identityUsername])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    if (grouped.length === 0) return
    setExpandedDays((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const first = grouped[0]?.dayKey
      if (!first) return prev
      return { [first]: true }
    })
  }, [grouped])

  useEffect(() => {
    const onHistoryUpdated = () => fetchHistory()
    window.addEventListener('workout-history-updated', onHistoryUpdated)
    return () => window.removeEventListener('workout-history-updated', onHistoryUpdated)
  }, [fetchHistory])

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identityEmail && !identityUsername) return
    const names = exerciseLines
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (names.length === 0) {
      setError('Isi minimal satu nama gerakan (satu baris satu nama).')
      return
    }
    setSaving(true)
    setError('')
    setSaveOk(false)
    try {
      const payload: Record<string, unknown> = {
        exerciseNames: names,
        notes: notes.trim() || undefined,
        completedAt: completedAtLocal ? new Date(completedAtLocal).toISOString() : undefined,
      }
      if (identityEmail) payload.email = identityEmail
      if (identityUsername) payload.username = identityUsername
      const dm = parseInt(durationMinutes, 10)
      if (!Number.isNaN(dm) && dm > 0) payload.durationMinutes = dm

      const response = await fetch('/api/members/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan')

      setSaveOk(true)
      setNotes('')
      setExerciseLines('')
      setDurationMinutes('')
      fetchHistory()
      window.dispatchEvent(new CustomEvent('premium-access-updated'))
      window.dispatchEvent(new CustomEvent('workout-history-updated'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const cardClass =
    'rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6 md:p-8'

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/15 to-accent/15 border border-cyan-400/35">
          <History className="w-7 h-7 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl md:text-3xl font-oswald font-bold text-white tracking-tight">
            Riwayat latihan
          </h2>
          <p className="text-gray-400 font-poppins text-sm mt-1">
            Aktivitas dari tombol &quot;Saya melakukan latihan ini&quot; di rekomendasi tercatat otomatis. Di bawah dikelompokkan per tanggal, ketuk hari untuk membuka detail.
          </p>
        </div>
      </div>

      <div className={`${cardClass} bg-white/5`}>
        <h3 className="text-xl font-oswald font-bold text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400 shrink-0" />
          Riwayat per hari
        </h3>

        {loadingList ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-400 font-poppins text-center py-8">
            Belum ada aktivitas. Gunakan tombol di tab Rekomendasi.
          </p>
        ) : (
          <div className="space-y-2">
            {grouped.map(({ dayKey, rows }) => {
              const open = expandedDays[dayKey] ?? false
              const totalMoves = rows.reduce((acc, s) => acc + parseExercises(s.exercises).length, 0)
              return (
                <div key={dayKey} className="rounded-xl border border-white/15 bg-black/25 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDays((p) => ({ ...p, [dayKey]: !open }))}
                    className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-oswald font-semibold text-lg capitalize">
                        {formatDayHeading(dayKey)}
                      </p>
                      <p className="text-gray-400 font-poppins text-xs mt-0.5">
                        {rows.length} catatan · {totalMoves} gerakan
                      </p>
                    </div>
                    {open ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-white/10 px-4 py-3 space-y-4 bg-black/20">
                      {rows.map((s) => {
                        const ex = parseExercises(s.exercises)
                        return (
                          <div
                            key={s.id}
                            className="rounded-lg border border-white/10 bg-black/30 p-3 md:p-4"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                              <span className="text-cyan-200/95 font-poppins text-sm font-semibold">
                                {new Date(s.completedAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {s.durationMinutes != null && (
                                <span className="text-xs font-poppins text-gray-500">
                                  ± {s.durationMinutes} menit
                                </span>
                              )}
                            </div>
                            {ex.length > 0 && (
                              <ul className="text-sm text-gray-200 font-poppins list-disc list-inside space-y-0.5 mb-2">
                                {ex.map((x, i) => (
                                  <li key={i}>
                                    {x.name}
                                    {x.muscle ? (
                                      <span className="text-gray-500 text-xs"> · {x.muscle}</span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {s.notes && (
                              <p className="text-xs text-gray-500 font-poppins whitespace-pre-line border-t border-white/10 pt-2 mt-1">
                                {s.notes}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
