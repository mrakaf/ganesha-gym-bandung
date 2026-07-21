'use client'
export const dynamic = 'force-dynamic';

import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { Calendar, Clock, Plus, Trash2, Edit2, Dumbbell, Loader2, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink, RefreshCw, CalendarDays, TrendingUp, Bell, MapPin, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getMemberSession, type MemberSession } from '@/lib/member-session'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import {
  loadSchedulesJsonForUser,
  loadTemplatePrefsJsonForUser,
  scheduleTemplatePrefsStorageKey,
  workoutSchedulesStorageKey,
} from '@/lib/workout-schedule-storage'

interface WorkoutSchedule {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  time: string
  exercise: string
  target: string
  duration: number // in minutes
  status?: 'PENDING' | 'DONE' | 'SKIPPED'
  completedAt?: string
  completionNote?: string
  syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED'
  googleEventId?: string // ID event di Google Calendar (jika sudah di-sync)
  isGoogleEvent?: boolean // Flag untuk event dari Google Calendar (bukan dari aplikasi)
}

interface GoogleCalendarEvent {
  id: string
  title: string
  description: string
  start: string
  end: string
  location: string
  htmlLink: string
}

interface UndoActionState {
  previousSchedules: WorkoutSchedule[]
  label: string
}

const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export default function SchedulePage() {
  const { user } = useAuth()
  const [memberSession, setMemberSession] = useState<MemberSession | null>(null)
  const [schedules, setSchedules] = useState<WorkoutSchedule[]>([])
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [premiumAccess, setPremiumAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [generatingTemplate, setGeneratingTemplate] = useState(false)
  const [templateDefaultTime, setTemplateDefaultTime] = useState('18:00')
  const [templateDurationWeeks, setTemplateDurationWeeks] = useState<1 | 4>(1)
  const [templateAutoSyncGoogle, setTemplateAutoSyncGoogle] = useState(false)
  const [syncingTemplate, setSyncingTemplate] = useState(false)
  const [lastUndoAction, setLastUndoAction] = useState<UndoActionState | null>(null)
  const inFlightSyncKeysRef = useRef<Set<string>>(new Set())
  /** Hindari menulis preferensi template akun B dengan state sisa dari akun A saat ganti user. */
  const templatePrefsLoadedForEmailRef = useRef<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [doneScheduleTarget, setDoneScheduleTarget] = useState<WorkoutSchedule | null>(null)
  const [doneNoteDraft, setDoneNoteDraft] = useState('')
  const [editingSchedule, setEditingSchedule] = useState<WorkoutSchedule | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null) // Untuk menu dropdown
  const { toasts, success, error, warning, info, removeToast } = useToast()
  const [formData, setFormData] = useState({
    date: '', // YYYY-MM-DD format
    time: '',
    exercise: '',
    target: '',
    duration: 30,
    syncToGoogle: false, // Checkbox untuk sync ke Google Calendar
  })
  const quickDoneNotes = [
    'Latihan selesai sesuai rencana',
    'Beban naik dari sesi sebelumnya',
    'Fokus teknik dan form gerakan',
    'Cardio selesai sesuai target',
  ]

  const identityEmail = user?.email || memberSession?.email || null

  useEffect(() => {
    setMemberSession(getMemberSession())
  }, [])

  const loadAccess = useCallback(async () => {
    if (!identityEmail) {
      setCheckingAccess(false)
      return
    }
    try {
      const response = await fetch(`/api/members/profile?email=${encodeURIComponent(identityEmail)}`)
      if (!response.ok) throw new Error('failed')
      const data = await response.json()
      setPremiumAccess(!!data?.member?.premiumAccess)
    } catch (error) {
      setPremiumAccess(false)
    } finally {
      setCheckingAccess(false)
    }
  }, [identityEmail])

  useEffect(() => {
    loadAccess()
  }, [loadAccess])

  useEffect(() => {
    const handlePremiumAccessUpdated = () => {
      loadAccess()
    }
    window.addEventListener('premium-access-updated', handlePremiumAccessUpdated)
    return () => {
      window.removeEventListener('premium-access-updated', handlePremiumAccessUpdated)
    }
  }, [loadAccess])

  // Load schedules dari localStorage per akun (email). Tanpa email → kosongkan agar tidak tertukar antar akun.
  useEffect(() => {
    if (!identityEmail) {
      setSchedules([])
      return
    }
    const savedSchedules = loadSchedulesJsonForUser(identityEmail)
    if (!savedSchedules) {
      setSchedules([])
      return
    }
    try {
      const parsed = JSON.parse(savedSchedules)
      const normalized = Array.isArray(parsed)
        ? parsed.map((item: WorkoutSchedule) => ({
            ...item,
            status: item.status || 'PENDING',
            completedAt: item.completedAt,
            completionNote: item.completionNote,
            syncStatus: item.syncStatus || (item.googleEventId ? 'SYNCED' : 'PENDING'),
          }))
        : []
      setSchedules(normalized)
    } catch (error) {
      console.error('Error loading schedules from localStorage:', error)
      setSchedules([])
    }
  }, [identityEmail])

  useEffect(() => {
    if (!identityEmail) {
      templatePrefsLoadedForEmailRef.current = null
      return
    }
    setTemplateDefaultTime('18:00')
    setTemplateDurationWeeks(1)
    setTemplateAutoSyncGoogle(false)
    templatePrefsLoadedForEmailRef.current = null
    const savedTemplatePref = loadTemplatePrefsJsonForUser(identityEmail)
    if (!savedTemplatePref) {
      templatePrefsLoadedForEmailRef.current = identityEmail
      return
    }
    try {
      const parsed = JSON.parse(savedTemplatePref) as {
        defaultTime?: string
        durationWeeks?: 1 | 4
        autoSyncGoogle?: boolean
      }
      if (parsed.defaultTime) {
        setTemplateDefaultTime(parsed.defaultTime)
      }
      if (parsed.durationWeeks === 1 || parsed.durationWeeks === 4) {
        setTemplateDurationWeeks(parsed.durationWeeks)
      }
      if (typeof parsed.autoSyncGoogle === 'boolean') {
        setTemplateAutoSyncGoogle(parsed.autoSyncGoogle)
      }
      templatePrefsLoadedForEmailRef.current = identityEmail
    } catch (prefError) {
      console.error('Error loading template preferences:', prefError)
      templatePrefsLoadedForEmailRef.current = identityEmail
    }
  }, [identityEmail])

  // Save schedules ke key per-akun
  useEffect(() => {
    if (!identityEmail) return
    const key = workoutSchedulesStorageKey(identityEmail)
    if (schedules.length > 0 || localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(schedules))
    }
  }, [schedules, identityEmail])

  useEffect(() => {
    if (!identityEmail) return
    if (templatePrefsLoadedForEmailRef.current !== identityEmail) return
    localStorage.setItem(
      scheduleTemplatePrefsStorageKey(identityEmail),
      JSON.stringify({
        defaultTime: templateDefaultTime,
        durationWeeks: templateDurationWeeks,
        autoSyncGoogle: templateAutoSyncGoogle,
      })
    )
  }, [templateDefaultTime, templateDurationWeeks, templateAutoSyncGoogle, identityEmail])

  // Fetch events from Google Calendar
  const fetchGoogleEvents = async () => {
    try {
      setLoadingEvents(true)
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      if (!identityEmail) return
      const response = await fetch(
        `/api/calendar/events?email=${encodeURIComponent(identityEmail)}&timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        setGoogleEvents(data.events || [])
      } else if (response.status === 401) {
        setIsConnected(false)
        setGoogleEvents([])
      }
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      setIsConnected(false)
    } finally {
      setLoadingEvents(false)
    }
  }

  // Check if user is connected to Google Calendar
  const checkConnection = async () => {
    try {
      if (!identityEmail) return
      const response = await fetch(`/api/calendar/events?action=check&email=${encodeURIComponent(identityEmail)}`)
      if (response.ok) {
        const data = await response.json()
        setIsConnected(data.connected)
        if (data.connected) {
          fetchGoogleEvents()
        }
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      setIsConnected(false)
    }
  }

  // Check connection status dan handle URL params
  useEffect(() => {
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')

    if (success === 'connected') {
      setIsConnected(true)
      fetchGoogleEvents()
      // Clear URL params
      window.history.replaceState({}, '', '/visitor/schedule')
    } else if (error) {
      console.error('Google Calendar connection error:', error)
      // Clear URL params
      window.history.replaceState({}, '', '/visitor/schedule')
    } else {
      // Check if already connected
      checkConnection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityEmail])

  // Connect to Google Calendar
  const handleConnectGoogle = () => {
    if (!identityEmail) {
      error('Silakan login terlebih dahulu')
      return
    }
    window.location.href = `/api/auth/google?email=${encodeURIComponent(identityEmail)}`
  }

  // Disconnect Google Calendar
  const handleDisconnectGoogle = async () => {
    try {
      if (!identityEmail) {
        error('Silakan login terlebih dahulu')
        return
      }
      const response = await fetch(`/api/auth/google/disconnect?email=${encodeURIComponent(identityEmail)}`)
      if (response.ok) {
        setIsConnected(false)
        setGoogleEvents([])
        success('Berhasil memutuskan hubungan dengan Google Calendar')
      } else {
        error('Gagal memutuskan hubungan dengan Google Calendar')
      }
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      error('Gagal memutuskan hubungan dengan Google Calendar')
    }
  }

  // Format date untuk display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Format time untuk display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get day name dari date
  const getDayName = (dateString: string) => {
    const date = new Date(dateString)
    const dayIndex = date.getDay()
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return dayNames[dayIndex]
  }

  // Format date untuk display (short)
  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    })
  }

  const isTimeConflict = (
    candidateDate: string,
    candidateTime: string,
    candidateDuration: number,
    excludeScheduleId?: string
  ) => {
    const [candidateHour, candidateMinute] = candidateTime.split(':').map(Number)
    const candidateStart = new Date(candidateDate)
    candidateStart.setHours(candidateHour || 0, candidateMinute || 0, 0, 0)
    const candidateEnd = new Date(candidateStart.getTime() + candidateDuration * 60 * 1000)

    return schedules.some((schedule) => {
      if (excludeScheduleId && schedule.id === excludeScheduleId) return false
      const [hour, minute] = schedule.time.split(':').map(Number)
      const start = new Date(schedule.date)
      start.setHours(hour || 0, minute || 0, 0, 0)
      const end = new Date(start.getTime() + schedule.duration * 60 * 1000)

      return candidateStart < end && candidateEnd > start
    })
  }

  const buildDateTimeFromSchedule = (date: string, time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const start = new Date(date)
    start.setHours(hours || 0, minutes || 0, 0, 0)
    return start
  }

  const buildScheduleFingerprint = (input: {
    date: string
    time: string
    exercise: string
    target: string
    duration: number
  }) => {
    const normalizedExercise = input.exercise.trim().toLowerCase()
    const normalizedTarget = input.target.trim().toLowerCase()
    return `${input.date}|${input.time}|${normalizedExercise}|${normalizedTarget}|${input.duration}`
  }

  const buildGoogleIdempotencyKey = (input: {
    email?: string
    date: string
    time: string
    exercise: string
    target: string
    duration: number
  }) => {
    const owner = (input.email || 'unknown').trim().toLowerCase()
    const fingerprint = buildScheduleFingerprint({
      date: input.date,
      time: input.time,
      exercise: input.exercise,
      target: input.target,
      duration: input.duration,
    })
    return `ganesha-v1|${owner}|${fingerprint}`
  }

  const hasSyncedDuplicate = (
    input: { date: string; time: string; exercise: string; target: string; duration: number },
    excludeScheduleId?: string
  ) => {
    const key = buildScheduleFingerprint(input)
    return schedules.some((item) => {
      if (excludeScheduleId && item.id === excludeScheduleId) return false
      if (!item.googleEventId) return false
      return (
        buildScheduleFingerprint({
          date: item.date,
          time: item.time,
          exercise: item.exercise,
          target: item.target,
          duration: item.duration,
        }) === key
      )
    })
  }

  const findNextAvailableDate = (
    baseDate: string,
    time: string,
    duration: number,
    excludeScheduleId?: string
  ) => {
    const start = new Date(baseDate)
    start.setHours(0, 0, 0, 0)
    for (let i = 1; i <= 14; i++) {
      const candidate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      const candidateDate = candidate.toISOString().split('T')[0]
      if (!isTimeConflict(candidateDate, time, duration, excludeScheduleId)) {
        return candidateDate
      }
    }
    return null
  }

  // Note: Google events are now combined with local schedules in combinedSchedules

  const handleAddSchedule = async () => {
    if (!formData.date || !formData.time || !formData.exercise) {
      warning('Harap isi tanggal, waktu, dan latihan terlebih dahulu.')
      return
    }

    // Validate duration
    if (formData.duration < 10 || formData.duration > 180) {
      warning('Durasi harus antara 10-180 menit.')
      return
    }

    try {
      if (!identityEmail) {
        error('User belum login.')
        return
      }

      let googleEventId: string | undefined = undefined
      let duplicateSyncPrevented = false

      // Calculate start and end datetime
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + formData.duration * 60 * 1000)
      const eventTitle = `${formData.exercise}${formData.target ? ` - ${formData.target}` : ''}`
      const eventDescription = `Latihan: ${formData.exercise}\nTarget: ${formData.target || 'Umum'}\nDurasi: ${formData.duration} menit`

      if (isTimeConflict(formData.date, formData.time, formData.duration, editingSchedule?.id)) {
        warning('Jadwal bentrok. Silakan pilih jam atau tanggal yang berbeda.')
        return
      }

      if (editingSchedule) {
        // EDIT MODE: Update existing schedule
        const oldGoogleEventId = editingSchedule.googleEventId

        // Update Google Calendar event if it exists and sync is enabled
        if (oldGoogleEventId && formData.syncToGoogle && isConnected) {
          try {
            const response = await fetch('/api/calendar/events/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventId: oldGoogleEventId,
                email: identityEmail,
                title: eventTitle,
                description: eventDescription,
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                location: 'Ganesha Gym',
              }),
            })

            if (response.ok) {
              googleEventId = oldGoogleEventId
              fetchGoogleEvents()
            } else {
              const errorData = await response.json()
              console.error('Error updating Google Calendar event:', errorData)
              warning('Jadwal diupdate, tapi gagal update Google Calendar.')
            }
          } catch (error) {
            console.error('Error updating Google Calendar event:', error)
            warning('Jadwal diupdate, tapi gagal update Google Calendar.')
          }
        } else if (formData.syncToGoogle && isConnected && !oldGoogleEventId) {
          // Create new Google Calendar event if sync is enabled but didn't exist before
          const syncPayload = {
            date: formData.date,
            time: formData.time,
            exercise: formData.exercise,
            target: formData.target,
            duration: formData.duration,
          }
          const scheduleKey = buildScheduleFingerprint(syncPayload)
          if (inFlightSyncKeysRef.current.has(scheduleKey) || hasSyncedDuplicate(syncPayload, editingSchedule.id)) {
            duplicateSyncPrevented = true
            warning('Event serupa sudah tersinkron di Google Calendar. Duplikasi dicegah.')
          } else {
            inFlightSyncKeysRef.current.add(scheduleKey)
            try {
              const response = await fetch('/api/calendar/events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: eventTitle,
                  email: identityEmail,
                  description: eventDescription,
                  start: startDateTime.toISOString(),
                  end: endDateTime.toISOString(),
                  location: 'Ganesha Gym',
                  idempotencyKey: buildGoogleIdempotencyKey({
                    email: identityEmail,
                    date: formData.date,
                    time: formData.time,
                    exercise: formData.exercise,
                    target: formData.target,
                    duration: formData.duration,
                  }),
                }),
              })

              if (response.ok) {
                const data = await response.json()
                googleEventId = data.event.id
                if (data?.duplicate) {
                  info('Event sudah ada di Google Calendar, tidak dibuat ulang.')
                }
                fetchGoogleEvents()
              } else {
                const errorData = await response.json()
                console.error('Error creating Google Calendar event:', errorData)
              }
            } catch (error) {
              console.error('Error creating Google Calendar event:', error)
            } finally {
              inFlightSyncKeysRef.current.delete(scheduleKey)
            }
          }
        } else if (!formData.syncToGoogle && oldGoogleEventId) {
          // Delete Google Calendar event if sync is disabled but existed before
          try {
            await fetch(`/api/calendar/events/delete?eventId=${oldGoogleEventId}&email=${encodeURIComponent(identityEmail)}`, {
              method: 'DELETE',
            })
            fetchGoogleEvents()
          } catch (error) {
            console.error('Error deleting Google Calendar event:', error)
          }
        }

        // Update local schedule
        setSchedules(schedules.map(s => 
          s.id === editingSchedule.id 
            ? {
                ...editingSchedule,
                ...formData,
                googleEventId: googleEventId !== undefined ? googleEventId : (formData.syncToGoogle ? oldGoogleEventId : undefined),
                syncStatus:
                  googleEventId !== undefined || (formData.syncToGoogle && oldGoogleEventId)
                    ? 'SYNCED'
                    : formData.syncToGoogle && isConnected && !duplicateSyncPrevented
                    ? 'FAILED'
                    : 'PENDING',
              }
            : s
        ))
        setEditingSchedule(null)
        success('Jadwal berhasil diperbarui.')
      } else {
        // ADD MODE: Create new schedule
        // Sync ke Google Calendar jika checkbox dicentang dan sudah terhubung
        if (formData.syncToGoogle && isConnected) {
          const syncPayload = {
            date: formData.date,
            time: formData.time,
            exercise: formData.exercise,
            target: formData.target,
            duration: formData.duration,
          }
          const scheduleKey = buildScheduleFingerprint(syncPayload)
          if (inFlightSyncKeysRef.current.has(scheduleKey) || hasSyncedDuplicate(syncPayload)) {
            duplicateSyncPrevented = true
            warning('Event serupa sudah tersinkron di Google Calendar. Jadwal tetap disimpan tanpa duplikasi event.')
          } else {
            inFlightSyncKeysRef.current.add(scheduleKey)
            try {
              const response = await fetch('/api/calendar/events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: eventTitle,
                  email: identityEmail,
                  description: eventDescription,
                  start: startDateTime.toISOString(),
                  end: endDateTime.toISOString(),
                  location: 'Ganesha Gym',
                  idempotencyKey: buildGoogleIdempotencyKey({
                    email: identityEmail,
                    date: formData.date,
                    time: formData.time,
                    exercise: formData.exercise,
                    target: formData.target,
                    duration: formData.duration,
                  }),
                }),
              })

              if (response.ok) {
                const data = await response.json()
                googleEventId = data.event.id
                if (data?.duplicate) {
                  info('Event sudah ada di Google Calendar, tidak dibuat ulang.')
                }
                fetchGoogleEvents()
              } else {
                const errorData = await response.json()
                console.error('Error creating Google Calendar event:', errorData)
                warning('Jadwal ditambahkan, tapi gagal sync Google Calendar.')
              }
            } catch (error) {
              console.error('Error syncing to Google Calendar:', error)
              warning('Jadwal ditambahkan, tapi gagal sync Google Calendar.')
            } finally {
              inFlightSyncKeysRef.current.delete(scheduleKey)
            }
          }
        }

        // Add new schedule
        const newSchedule: WorkoutSchedule = {
          id: Date.now().toString(),
          date: formData.date,
          time: formData.time,
          exercise: formData.exercise,
          target: formData.target,
          duration: formData.duration,
          status: 'PENDING',
          syncStatus: googleEventId
            ? 'SYNCED'
            : formData.syncToGoogle && isConnected && !duplicateSyncPrevented
            ? 'FAILED'
            : 'PENDING',
          googleEventId,
        }
        setSchedules([...schedules, newSchedule])
        success('Jadwal berhasil ditambahkan.')
      }

      setFormData({
        date: '',
        time: '',
        exercise: '',
        target: '',
        duration: 30,
        syncToGoogle: false,
      })
      setShowAddModal(false)
    } catch (e) {
      console.error('Error saving schedule:', e)
      error('Gagal menyimpan jadwal. Silakan coba lagi.')
    }
  }

  const handleDelete = async (schedule: WorkoutSchedule) => {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) {
      return
    }

    // Delete from Google Calendar if exists
    if (schedule.googleEventId && isConnected) {
      try {
        const response = await fetch(`/api/calendar/events/delete?eventId=${schedule.googleEventId}&email=${encodeURIComponent(identityEmail || '')}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          fetchGoogleEvents()
        } else {
          console.error('Error deleting Google Calendar event')
        }
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error)
      }
    }

    // Delete from local schedules
    setSchedules(schedules.filter(s => s.id !== schedule.id))
  }

  const handleStatusUpdate = (
    scheduleId: string,
    status: 'PENDING' | 'DONE' | 'SKIPPED',
    completionNote?: string
  ) => {
    setSchedules((prev) =>
      prev.map((schedule) =>
        schedule.id === scheduleId
          ? {
              ...schedule,
              status,
              completedAt: status === 'DONE' ? (schedule.completedAt || new Date().toISOString()) : undefined,
              completionNote: status === 'DONE' ? completionNote : undefined,
            }
          : schedule
      )
    )
  }

  const handleMarkDoneWithNote = (schedule: WorkoutSchedule) => {
    setDoneScheduleTarget(schedule)
    setDoneNoteDraft(schedule.completionNote || '')
    setShowDoneModal(true)
  }

  const handleEditDoneNote = (schedule: WorkoutSchedule) => {
    setDoneScheduleTarget(schedule)
    setDoneNoteDraft(schedule.completionNote || '')
    setShowDoneModal(true)
  }

  const handleSubmitDoneNote = () => {
    if (!doneScheduleTarget) return
    const note = doneNoteDraft.trim()
    if (!note) {
      warning('Catatan selesai wajib diisi agar progres latihan lebih terukur.')
      return
    }
    handleStatusUpdate(doneScheduleTarget.id, 'DONE', note)
    setShowDoneModal(false)
    setDoneScheduleTarget(null)
    setDoneNoteDraft('')
    success(
      doneScheduleTarget.status === 'DONE'
        ? 'Catatan latihan berhasil diperbarui.'
        : 'Latihan ditandai selesai dan catatan tersimpan.'
    )
  }

  const handleQuickReschedule = async (
    schedule: WorkoutSchedule,
    mode: 'plus_one_day' | 'next_available'
  ) => {
    try {
      const previousSchedulesSnapshot = [...schedules]
      const currentDate = new Date(schedule.date)
      currentDate.setHours(0, 0, 0, 0)
      let newDate: string | null = null

      if (mode === 'plus_one_day') {
        const candidate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
        const candidateDate = candidate.toISOString().split('T')[0]
        if (isTimeConflict(candidateDate, schedule.time, schedule.duration, schedule.id)) {
          warning('Jadwal +1 hari bentrok. Coba tombol "Cari Slot".')
          return
        }
        newDate = candidateDate
      } else {
        newDate = findNextAvailableDate(schedule.date, schedule.time, schedule.duration, schedule.id)
        if (!newDate) {
          warning('Tidak ditemukan slot kosong dalam 14 hari ke depan.')
          return
        }
      }

      if (!newDate) return

      // Update Google Calendar event if connected and schedule already synced
      let googleSyncFailed = false
      if (schedule.googleEventId && isConnected && identityEmail) {
        try {
          const startDateTime = buildDateTimeFromSchedule(newDate, schedule.time)
          const endDateTime = new Date(startDateTime.getTime() + schedule.duration * 60 * 1000)
          const eventTitle = `${schedule.exercise}${schedule.target ? ` - ${schedule.target}` : ''}`
          const eventDescription = `Latihan: ${schedule.exercise}\nTarget: ${schedule.target || 'Umum'}\nDurasi: ${schedule.duration} menit`
          await fetch('/api/calendar/events/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: schedule.googleEventId,
              email: identityEmail,
              title: eventTitle,
              description: eventDescription,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              location: 'Ganesha Gym',
            }),
          })
          fetchGoogleEvents()
        } catch (error) {
          console.error('Gagal update Google Calendar saat reschedule cepat:', error)
          googleSyncFailed = true
        }
      }

      setSchedules((prev) =>
        prev.map((item) =>
          item.id === schedule.id
            ? {
                ...item,
                date: newDate,
                status: 'PENDING',
                completedAt: undefined,
                syncStatus: item.googleEventId ? (googleSyncFailed ? 'FAILED' : 'SYNCED') : 'PENDING',
              }
            : item
        )
      )
      setLastUndoAction({
        previousSchedules: previousSchedulesSnapshot,
        label: `Reschedule "${schedule.exercise}"`,
      })
      success('Reschedule cepat berhasil.')
    } catch (err) {
      console.error('Error quick reschedule:', err)
      error('Gagal melakukan reschedule cepat.')
    }
  }

  const syncSchedulesToGoogle = async (items: WorkoutSchedule[]) => {
    if (!isConnected || !identityEmail) {
      warning('Google Calendar belum terhubung.')
      return { synced: 0, failed: items.length }
    }

    let synced = 0
    let failed = 0
    const idMap = new Map<string, string>()
    const failedIds = new Set<string>()
    const processedKeys = new Set<string>()

    for (const schedule of items) {
      if (schedule.googleEventId) {
        continue
      }
      const scheduleKey = buildScheduleFingerprint({
        date: schedule.date,
        time: schedule.time,
        exercise: schedule.exercise,
        target: schedule.target,
        duration: schedule.duration,
      })

      if (processedKeys.has(scheduleKey)) {
        continue
      }
      processedKeys.add(scheduleKey)

      if (inFlightSyncKeysRef.current.has(scheduleKey) || hasSyncedDuplicate({
        date: schedule.date,
        time: schedule.time,
        exercise: schedule.exercise,
        target: schedule.target,
        duration: schedule.duration,
      }, schedule.id)) {
        continue
      }
      inFlightSyncKeysRef.current.add(scheduleKey)
      try {
        const startDateTime = buildDateTimeFromSchedule(schedule.date, schedule.time)
        const endDateTime = new Date(startDateTime.getTime() + schedule.duration * 60 * 1000)
        const title = `${schedule.exercise}${schedule.target ? ` - ${schedule.target}` : ''}`
        const description = `Latihan: ${schedule.exercise}\nTarget: ${schedule.target || 'Umum'}\nDurasi: ${schedule.duration} menit`

        const response = await fetch('/api/calendar/events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            email: identityEmail,
            description,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            location: 'Ganesha Gym',
            idempotencyKey: buildGoogleIdempotencyKey({
              email: identityEmail,
              date: schedule.date,
              time: schedule.time,
              exercise: schedule.exercise,
              target: schedule.target,
              duration: schedule.duration,
            }),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const eventId = data?.event?.id
          if (eventId) {
            idMap.set(schedule.id, eventId)
          }
          synced += 1
        } else {
          failed += 1
          failedIds.add(schedule.id)
        }
      } catch (syncError) {
        console.error('Error sync schedule to Google:', syncError)
        failed += 1
        failedIds.add(schedule.id)
      } finally {
        inFlightSyncKeysRef.current.delete(scheduleKey)
      }
    }

    if (idMap.size > 0 || failedIds.size > 0) {
      setSchedules((prev) =>
        prev.map((item) => {
          if (idMap.has(item.id)) {
            return { ...item, googleEventId: idMap.get(item.id), syncStatus: 'SYNCED' as const }
          }
          if (failedIds.has(item.id)) {
            return { ...item, syncStatus: 'FAILED' as const }
          }
          return item
        })
      )
      fetchGoogleEvents()
    }

    return { synced, failed }
  }

  const handleGenerateTemplate = async (goal: 'bulking' | 'cutting' | 'maintain') => {
    try {
      setGeneratingTemplate(true)
      const previousSchedulesSnapshot = [...schedules]
      const base = new Date()
      base.setHours(0, 0, 0, 0)

      const templates: Record<
        'bulking' | 'cutting' | 'maintain',
        Array<{ offsetDay: number; time: string; exercise: string; target: string; duration: number }>
      > = {
        bulking: [
          { offsetDay: 0, time: '18:00', exercise: 'Push Strength Session', target: 'Dada/Bahu/Triceps', duration: 70 },
          { offsetDay: 1, time: '18:00', exercise: 'Pull Strength Session', target: 'Punggung/Biceps', duration: 70 },
          { offsetDay: 3, time: '18:00', exercise: 'Leg Day Session', target: 'Kaki', duration: 75 },
          { offsetDay: 4, time: '18:00', exercise: 'Upper Hypertrophy', target: 'Upper Body', duration: 65 },
          { offsetDay: 6, time: '08:00', exercise: 'Recovery Cardio', target: 'Cardio', duration: 30 },
        ],
        cutting: [
          { offsetDay: 0, time: '07:00', exercise: 'Cardio + Core', target: 'Cardio/Perut', duration: 45 },
          { offsetDay: 1, time: '18:00', exercise: 'Upper Circuit', target: 'Upper Body', duration: 50 },
          { offsetDay: 3, time: '07:00', exercise: 'Lower Circuit', target: 'Kaki', duration: 50 },
          { offsetDay: 4, time: '18:00', exercise: 'HIIT Session', target: 'Cardio', duration: 40 },
          { offsetDay: 6, time: '07:00', exercise: 'LISS Cardio', target: 'Cardio', duration: 35 },
        ],
        maintain: [
          { offsetDay: 0, time: '17:00', exercise: 'Full Body Strength', target: 'Full Body', duration: 55 },
          { offsetDay: 2, time: '17:00', exercise: 'Upper Focus', target: 'Upper Body', duration: 50 },
          { offsetDay: 4, time: '17:00', exercise: 'Lower Focus', target: 'Kaki/Core', duration: 50 },
          { offsetDay: 6, time: '08:00', exercise: 'Cardio Maintenance', target: 'Cardio', duration: 30 },
        ],
      }

      const generatedSchedules: WorkoutSchedule[] = []
      for (let week = 0; week < templateDurationWeeks; week++) {
        templates[goal].forEach((item, index) => {
          const date = new Date(base.getTime() + (item.offsetDay + week * 7) * 24 * 60 * 60 * 1000)
          const dateString = date.toISOString().split('T')[0]
          generatedSchedules.push({
            id: `${Date.now()}-${goal}-${week}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            date: dateString,
            time: templateDefaultTime || item.time,
            exercise: item.exercise,
            target: item.target,
            duration: item.duration,
            status: 'PENDING',
            syncStatus: 'PENDING',
          })
        })
      }

      const nonConflict = generatedSchedules.filter(
        (schedule) =>
          !isTimeConflict(schedule.date, schedule.time, schedule.duration)
      )

      if (nonConflict.length === 0) {
        warning('Template bentrok dengan jadwal yang ada. Geser/hapus jadwal lama dulu.')
        return
      }

      const skippedCount = generatedSchedules.length - nonConflict.length
      setSchedules((prev) => [...prev, ...nonConflict])
      setLastUndoAction({
        previousSchedules: previousSchedulesSnapshot,
        label: `Generate template ${goal}`,
      })
      success(
        `Template ${goal} (${templateDurationWeeks} minggu) ditambahkan: ${nonConflict.length} sesi${skippedCount > 0 ? `, bentrok: ${skippedCount}` : ''}.`
      )
      if (skippedCount > 0) {
        info('Sebagian sesi tidak ditambahkan karena bentrok jadwal.')
      }

      if (templateAutoSyncGoogle) {
        setSyncingTemplate(true)
        const syncResult = await syncSchedulesToGoogle(nonConflict)
        if (syncResult.synced > 0) {
          success(`Google Calendar: ${syncResult.synced} sesi berhasil disinkronkan.`)
        }
        if (syncResult.failed > 0) {
          warning(`Google Calendar: ${syncResult.failed} sesi gagal disinkronkan.`)
        }
      }
    } catch (templateError) {
      console.error('Error generating template:', templateError)
      error('Gagal membuat template jadwal otomatis.')
    } finally {
      setGeneratingTemplate(false)
      setSyncingTemplate(false)
    }
  }

  const handleTemplateDurationChange = (weeks: 1 | 4) => {
    setTemplateDurationWeeks(weeks)
    info(`Template akan dibuat untuk ${weeks} minggu.`)
  }

  const pendingOrFailedSchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) => !schedule.googleEventId && (schedule.syncStatus === 'PENDING' || schedule.syncStatus === 'FAILED')
      ),
    [schedules]
  )

  const handleSyncUnsyncedSchedules = async () => {
    if (pendingOrFailedSchedules.length === 0) {
      info('Tidak ada jadwal yang perlu disinkronkan.')
      return
    }
    setSyncingTemplate(true)
    try {
      const syncResult = await syncSchedulesToGoogle(pendingOrFailedSchedules)
      if (syncResult.synced > 0) {
        success(`Bulk sync berhasil: ${syncResult.synced} jadwal tersinkron.`)
      }
      if (syncResult.failed > 0) {
        warning(`Bulk sync: ${syncResult.failed} jadwal gagal. Coba lagi nanti.`)
      }
    } finally {
      setSyncingTemplate(false)
    }
  }

  const handleUndoLastAction = () => {
    if (!lastUndoAction) return
    setSchedules(lastUndoAction.previousSchedules)
    setLastUndoAction(null)
    info(`Undo berhasil: ${lastUndoAction.label}.`)
  }

  const handleEdit = (schedule: WorkoutSchedule) => {
    // If it's a Google Calendar event (not created by app), can't edit
    if (schedule.isGoogleEvent) {
      warning('Event ini dari Google Calendar. Edit langsung dari Google Calendar.')
      setSelectedScheduleId(null)
      return
    }

    setEditingSchedule(schedule)
    setFormData({
      date: schedule.date,
      time: schedule.time,
      exercise: schedule.exercise,
      target: schedule.target,
      duration: schedule.duration,
      syncToGoogle: !!schedule.googleEventId, // Check jika sudah ada Google event
    })
    setShowAddModal(true)
    setSelectedScheduleId(null)
  }

  // Combine local schedules and Google Calendar events, then group by day
  const combinedSchedules = useMemo(() => {
    // Convert Google Calendar events to WorkoutSchedule format
    const googleSchedules: WorkoutSchedule[] = googleEvents.map(event => ({
      id: `google_${event.id}`,
      date: event.start.split('T')[0], // Extract date from ISO string
      time: formatTime(event.start),
      exercise: event.title,
      target: '',
      duration: Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60)), // Calculate duration
      syncStatus: 'SYNCED',
      googleEventId: event.id, // Mark as Google Calendar event
      isGoogleEvent: true, // Flag to identify Google Calendar events
    }))

    // Combine local schedules and Google events
    const allSchedules = [...schedules, ...googleSchedules]

    // Group by day of week
    return daysOfWeek.map(day => {
      const daySchedules = allSchedules.filter(s => {
        const scheduleDay = getDayName(s.date)
        return scheduleDay === day
      })
      // Sort by time
      daySchedules.sort((a, b) => {
        const timeA = a.time.replace(':', '')
        const timeB = b.time.replace(':', '')
        return parseInt(timeA) - parseInt(timeB)
      })
      return { day, schedules: daySchedules }
    })
  }, [schedules, googleEvents])

  // Calculate statistics from combined schedules
  const allSchedulesForStats = useMemo(() => {
    const googleSchedules: WorkoutSchedule[] = googleEvents.map(event => ({
      id: `google_${event.id}`,
      date: event.start.split('T')[0],
      time: formatTime(event.start),
      exercise: event.title,
      target: '',
      duration: Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60)),
      syncStatus: 'SYNCED',
      googleEventId: event.id,
      isGoogleEvent: true,
    }))
    return [...schedules, ...googleSchedules]
  }, [schedules, googleEvents])

  const totalSchedules = allSchedulesForStats.length
  
  // Calculate upcoming schedules (jadwal yang belum lewat)
  const upcomingSchedules = useMemo(() => {
    const now = new Date()
    return allSchedulesForStats.filter(s => {
      try {
        // Parse date and time
        const [hours, minutes] = s.time.split(':').map(Number)
        const scheduleDate = new Date(s.date)
        scheduleDate.setHours(hours || 0, minutes || 0, 0, 0)
        
        // Check if schedule is in the future
        return scheduleDate >= now
      } catch (error) {
        console.error('Error parsing schedule date:', s, error)
        return false
      }
    }).length
  }, [allSchedulesForStats])
  
  // Calculate schedules for this week (7 days ahead)
  const thisWeekSchedules = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    return allSchedulesForStats.filter(s => {
      try {
        const [hours, minutes] = s.time.split(':').map(Number)
        const scheduleDate = new Date(s.date)
        scheduleDate.setHours(hours || 0, minutes || 0, 0, 0)
        
        return scheduleDate >= now && scheduleDate <= nextWeek
      } catch (error) {
        return false
      }
    }).length
  }, [allSchedulesForStats])

  const weeklyCompletionRate = useMemo(() => {
    const now = new Date()
    const day = now.getDay() // Minggu=0, Senin=1, ...
    const diffToMonday = day === 0 ? -6 : 1 - day
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    const weekLocalSchedules = schedules.filter((schedule) => {
      try {
        const scheduleDate = new Date(schedule.date)
        scheduleDate.setHours(12, 0, 0, 0)
        return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek
      } catch {
        return false
      }
    })

    if (weekLocalSchedules.length === 0) return 0
    const doneCount = weekLocalSchedules.filter((s) => s.status === 'DONE').length
    return Math.round((doneCount / weekLocalSchedules.length) * 100)
  }, [schedules])

  if (checkingAccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!premiumAccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
          <h1 className="text-3xl font-oswald font-bold text-white mb-3">Fitur Terkunci</h1>
          <p className="text-gray-300 font-poppins">
            Jadwal latihan dan integrasi Google Calendar hanya tersedia untuk visit aktif (24 jam)
            atau membership aktif (1 bulan). Silakan lakukan pembayaran untuk membuka akses.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-oswald font-bold text-white mb-3 tracking-tight">
              Jadwal Latihan
            </h1>
            <p className="text-gray-300 font-poppins text-lg">
              Atur jadwal latihan Anda dan sinkronkan dengan Google Calendar
            </p>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null)
              setFormData({
                date: '',
                time: '',
                exercise: '',
                target: '',
                duration: 30,
                syncToGoogle: false,
              })
              setShowAddModal(true)
            }}
            className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-accent via-accent to-accent-light text-white px-6 py-3 rounded-xl hover:shadow-2xl hover:shadow-accent/40 transition-all font-poppins font-semibold transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Jadwal</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-poppins text-sm mb-1">Total Jadwal</p>
                <p className="text-3xl font-oswald font-bold text-white">{totalSchedules}</p>
                <p className="text-gray-500 font-poppins text-xs mt-1">Semua jadwal (lokal + Google Calendar)</p>
              </div>
              <div className="p-3 bg-accent/20 rounded-lg">
                <CalendarDays className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-poppins text-sm mb-1">Minggu Ini</p>
                <p className="text-3xl font-oswald font-bold text-white">{thisWeekSchedules}</p>
                <p className="text-gray-500 font-poppins text-xs mt-1">Jadwal untuk 7 hari ke depan</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 font-poppins text-sm mb-1">Completion Rate</p>
                <p className="text-3xl font-oswald font-bold text-white">{weeklyCompletionRate}%</p>
                <p className="text-gray-500 font-poppins text-xs mt-1">Persentase jadwal selesai minggu ini</p>
              </div>
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Add Button */}
        <button
          onClick={() => {
            setEditingSchedule(null)
            setFormData({
              date: '',
              time: '',
              exercise: '',
              target: '',
              duration: 30,
              syncToGoogle: false,
            })
            setShowAddModal(true)
          }}
          className="md:hidden w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-accent via-accent to-accent-light text-white px-6 py-3 rounded-xl hover:shadow-2xl hover:shadow-accent/40 transition-all font-poppins font-semibold mb-6"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Jadwal</span>
        </button>

        {/* Auto Template Section */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-poppins font-semibold">Template Jadwal Otomatis</p>
            <span className="text-xs text-gray-300 font-poppins">1 klik isi jadwal dari program</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <label className="block text-xs text-gray-300 font-poppins mb-1">Jam default template</label>
              <input
                type="time"
                value={templateDefaultTime}
                onChange={(e) => setTemplateDefaultTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white font-poppins text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <label className="block text-xs text-gray-300 font-poppins mb-1">Rentang template</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTemplateDurationChange(1)}
                  className={`px-3 py-2 rounded-lg text-sm font-poppins font-semibold transition-all border ${
                    templateDurationWeeks === 1
                      ? 'bg-accent/25 border-accent/50 text-accent-light'
                      : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  1 Minggu
                </button>
                <button
                  onClick={() => handleTemplateDurationChange(4)}
                  className={`px-3 py-2 rounded-lg text-sm font-poppins font-semibold transition-all border ${
                    templateDurationWeeks === 4
                      ? 'bg-accent/25 border-accent/50 text-accent-light'
                      : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  4 Minggu
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
            <label className="flex items-center gap-2 text-sm text-gray-200 font-poppins">
              <input
                type="checkbox"
                checked={templateAutoSyncGoogle}
                onChange={(e) => setTemplateAutoSyncGoogle(e.target.checked)}
                className="w-4 h-4 rounded border-white/30 bg-white/10"
              />
              Auto sync hasil template ke Google Calendar
            </label>
            {lastUndoAction && (
              <button
                onClick={handleUndoLastAction}
                className="px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-200 text-xs font-poppins font-semibold hover:bg-amber-500/25"
              >
                Undo terakhir ({lastUndoAction.label})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => handleGenerateTemplate('bulking')}
              disabled={generatingTemplate || syncingTemplate}
              className="px-3 py-2 rounded-lg border border-blue-400/40 bg-blue-500/15 text-blue-200 text-sm font-poppins font-semibold hover:bg-blue-500/25 disabled:opacity-50"
            >
              {generatingTemplate || syncingTemplate ? 'Memproses...' : 'Template Bulking'}
            </button>
            <button
              onClick={() => handleGenerateTemplate('cutting')}
              disabled={generatingTemplate || syncingTemplate}
              className="px-3 py-2 rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-200 text-sm font-poppins font-semibold hover:bg-rose-500/25 disabled:opacity-50"
            >
              {generatingTemplate || syncingTemplate ? 'Memproses...' : 'Template Cutting'}
            </button>
            <button
              onClick={() => handleGenerateTemplate('maintain')}
              disabled={generatingTemplate || syncingTemplate}
              className="px-3 py-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-emerald-200 text-sm font-poppins font-semibold hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {generatingTemplate || syncingTemplate ? 'Memproses...' : 'Template Maintain'}
            </button>
          </div>
        </div>
      </div>

      {/* Google Calendar Connection Status */}
      <div className={`mb-8 p-5 rounded-2xl border-2 shadow-xl transition-all ${
        isConnected 
          ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 backdrop-blur-xl' 
          : 'bg-white/10 border-white/20 backdrop-blur-xl'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <>
                <div className="p-3 bg-green-500/30 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-oswald font-bold text-white mb-1">
                    Terhubung dengan Google Calendar
                  </h3>
                  <p className="text-gray-300 font-poppins text-sm mb-3">
                    {googleEvents.length} events ditemukan untuk 7 hari ke depan
                  </p>
                  
                  {/* Events List */}
                  {googleEvents.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-2">
                      {googleEvents.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center space-x-2 p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                          <Clock className="w-3 h-3 text-blue-300 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-poppins text-xs font-semibold truncate">
                              {event.title}
                            </p>
                            <p className="text-gray-400 font-poppins text-xs">
                              {formatDate(event.start)} • {formatTime(event.start)}
                            </p>
                          </div>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-blue-300 hover:text-blue-200 hover:bg-blue-500/20 rounded transition-colors flex-shrink-0"
                              title="Buka di Google Calendar"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                      {googleEvents.length > 5 && (
                        <p className="text-gray-400 font-poppins text-xs text-center pt-1">
                          +{googleEvents.length - 5} events lainnya
                        </p>
                      )}
                    </div>
                  )}
                  
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-yellow-500/30 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-xl font-oswald font-bold text-white mb-1">
                    Belum Terhubung dengan Google Calendar
                  </h3>
                  <p className="text-gray-300 font-poppins text-sm">
                    Hubungkan untuk melihat jadwal dari Google Calendar Anda
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <button
                  onClick={handleSyncUnsyncedSchedules}
                  disabled={syncingTemplate || pendingOrFailedSchedules.length === 0}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 rounded-xl transition-all font-poppins font-semibold disabled:opacity-50 border border-indigo-400/30"
                >
                  {syncingTemplate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sync...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync Pending ({pendingOrFailedSchedules.length})</span>
                    </>
                  )}
                </button>
                <button
                  onClick={fetchGoogleEvents}
                  disabled={loadingEvents}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-poppins font-semibold disabled:opacity-50 border border-white/20"
                >
                  {loadingEvents ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memuat...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDisconnectGoogle}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-xl transition-all font-poppins font-semibold border border-red-400/30"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Putuskan Hubungan</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectGoogle}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/40 transition-all font-poppins font-semibold transform hover:scale-105"
              >
                <Calendar className="w-5 h-5" />
                <span>Hubungkan Google Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Calendar View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 mb-6">
        {combinedSchedules.map(({ day, schedules: daySchedules }) => {
          const isToday = new Date().toLocaleDateString('id-ID', { weekday: 'long' }) === day
          
          return (
            <div
              key={day}
              className={`bg-white/10 backdrop-blur-xl rounded-xl p-4 border-2 min-h-[280px] transition-all hover:shadow-xl ${
                isToday 
                  ? 'border-accent/50 bg-accent/10 shadow-lg shadow-accent/20' 
                  : 'border-white/20 hover:border-accent/30'
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div>
                  <h3 className={`text-lg font-oswald font-bold ${isToday ? 'text-accent' : 'text-white'}`}>
                    {day}
                  </h3>
                  {isToday && (
                    <p className="text-xs text-accent/80 font-poppins mt-0.5">Hari Ini</p>
                  )}
                </div>
                <CalendarDays className={`w-5 h-5 ${isToday ? 'text-accent' : 'text-gray-400'}`} />
              </div>
              
              <div className="space-y-3">
                {/* All Schedules (Local + Google Calendar combined) */}
                {daySchedules.length > 0 && (
                  daySchedules.map((schedule) => {
                    const isSelected = selectedScheduleId === schedule.id
                    const isGoogleEvent = schedule.isGoogleEvent || false
                    const hasGoogleSync = schedule.googleEventId && !isGoogleEvent
                    
                    return (
                      <div
                        key={schedule.id}
                        className={`rounded-lg p-3 border-2 transition-all cursor-pointer relative ${
                          isGoogleEvent
                            ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/40 hover:border-blue-500/60'
                            : hasGoogleSync
                            ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/40 hover:border-green-500/60'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-accent/30'
                        } ${isSelected ? 'ring-2 ring-accent' : ''}`}
                        onClick={() => {
                          if (isGoogleEvent) {
                            // For Google events, open in Google Calendar
                            const googleEvent = googleEvents.find(e => e.id === schedule.googleEventId)
                            if (googleEvent?.htmlLink) {
                              window.open(googleEvent.htmlLink, '_blank')
                            }
                          } else {
                            // For local schedules, toggle menu
                            setSelectedScheduleId(isSelected ? null : schedule.id)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1.5 flex-wrap">
                              <Clock className={`w-3.5 h-3.5 ${
                                isGoogleEvent ? 'text-blue-300' : 
                                hasGoogleSync ? 'text-green-300' : 
                                'text-accent'
                              }`} />
                              <span className={`font-poppins text-sm font-semibold ${
                                isGoogleEvent ? 'text-blue-200' : 
                                hasGoogleSync ? 'text-green-200' : 
                                'text-white'
                              }`}>
                                {schedule.time}
                              </span>
                              <span className="text-gray-400 font-poppins text-xs">
                                ({formatDateDisplay(schedule.date)})
                              </span>
                              {isGoogleEvent && (
                                <span className="px-2 py-0.5 bg-blue-500/40 text-blue-100 rounded-full text-xs font-poppins font-semibold flex items-center space-x-1" title="Event dari Google Calendar">
                                  <Calendar className="w-3 h-3" />
                                  <span>Calendar</span>
                                </span>
                              )}
                              {hasGoogleSync && (
                                <span className="px-2 py-0.5 bg-green-500/40 text-green-100 rounded-full text-xs font-poppins font-semibold flex items-center space-x-1" title="Jadwal dari aplikasi yang sudah tersinkron ke Google Calendar">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Google</span>
                                </span>
                              )}
                            </div>
                            <p className={`font-poppins text-sm font-semibold mb-1 ${
                              isGoogleEvent ? 'text-white' : 
                              hasGoogleSync ? 'text-white' : 
                              'text-white'
                            }`}>
                              {schedule.exercise}
                            </p>
                            {schedule.target && !isGoogleEvent && (
                              <p className="text-gray-400 font-poppins text-xs mb-1">
                                Target: {schedule.target}
                              </p>
                            )}
                            {!isGoogleEvent && (
                              <div className="mt-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                      schedule.status === 'DONE'
                                        ? 'border-green-500/40 bg-green-500/20 text-green-200'
                                        : schedule.status === 'SKIPPED'
                                        ? 'border-red-500/40 bg-red-500/20 text-red-200'
                                        : 'border-yellow-500/40 bg-yellow-500/20 text-yellow-200'
                                    }`}
                                  >
                                    {schedule.status === 'DONE'
                                      ? 'Selesai'
                                      : schedule.status === 'SKIPPED'
                                      ? 'Terlewat'
                                      : 'Belum'}
                                  </span>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                      schedule.syncStatus === 'SYNCED'
                                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                                        : schedule.syncStatus === 'FAILED'
                                        ? 'border-rose-500/40 bg-rose-500/20 text-rose-200'
                                        : 'border-slate-500/40 bg-slate-500/20 text-slate-200'
                                    }`}
                                  >
                                    {schedule.syncStatus === 'SYNCED'
                                      ? 'Sync: OK'
                                      : schedule.syncStatus === 'FAILED'
                                      ? 'Sync: Gagal'
                                      : 'Sync: Pending'}
                                  </span>
                                </div>
                                {schedule.status === 'DONE' && schedule.completedAt && (
                                  <>
                                    <p className="mt-1 text-[10px] text-emerald-300 font-poppins">
                                      Terselesaikan: {new Date(schedule.completedAt).toLocaleString('id-ID')}
                                    </p>
                                    {schedule.completionNote && (
                                      <p className="mt-1 text-[10px] text-emerald-200/90 font-poppins">
                                        Catatan: {schedule.completionNote}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            <div className="flex items-center space-x-2 text-xs text-gray-400 font-poppins">
                              <Zap className="w-3 h-3" />
                              <span>{schedule.duration} menit</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Menu (only for local schedules) */}
                        {!isGoogleEvent && isSelected && (
                          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-end gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkDoneWithNote(schedule)
                              }}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-white rounded-lg transition-all border border-green-500/30 hover:border-green-500/50 text-xs font-poppins font-semibold"
                              title="Tandai selesai"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selesai</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(schedule.id, 'SKIPPED')
                              }}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 hover:text-white rounded-lg transition-all border border-yellow-500/30 hover:border-yellow-500/50 text-xs font-poppins font-semibold"
                              title="Tandai terlewat"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Skip</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(schedule)
                              }}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent hover:text-white rounded-lg transition-all border border-accent/30 hover:border-accent/50 text-xs font-poppins font-semibold"
                              title="Edit Jadwal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(schedule)
                              }}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/30 hover:border-red-500/50 text-xs font-poppins font-semibold"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Hint for Google events */}
                        {isGoogleEvent && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-xs text-blue-300 font-poppins text-center">
                              Klik untuk buka di Google Calendar
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}

                {/* Empty State */}
                {daySchedules.length === 0 && (
                  <div className="text-center py-6">
                    <div className="p-3 bg-white/5 rounded-lg inline-block mb-2">
                      <Calendar className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-gray-500 font-poppins text-xs">
                      Tidak ada jadwal
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8 border-2 border-white/20 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-oswald font-bold text-white">
                {editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingSchedule(null)
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-accent text-sm font-poppins font-semibold mb-2 flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Tanggal <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white font-poppins focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                />
                <p className="text-gray-400 font-poppins text-xs mt-1.5">
                  Pilih tanggal spesifik untuk jadwal latihan
                </p>
              </div>

              <div>
                <label className="block text-accent text-sm font-poppins font-semibold mb-2 flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Waktu <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white font-poppins focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-accent text-sm font-poppins font-semibold mb-2 flex items-center space-x-1">
                  <Dumbbell className="w-4 h-4" />
                  <span>Latihan <span className="text-red-400">*</span></span>
                </label>
                <input
                  type="text"
                  value={formData.exercise}
                  onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                  placeholder="Contoh: Barbell Curl"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white font-poppins placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-accent text-sm font-poppins font-semibold mb-2">
                  Target
                </label>
                <input
                  type="text"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  placeholder="Contoh: Biceps"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white font-poppins placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-accent text-sm font-poppins font-semibold mb-2 flex items-center space-x-1">
                  <Zap className="w-4 h-4" />
                  <span>Durasi (menit) <span className="text-gray-400 text-xs font-normal">(10-180 menit)</span></span>
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setFormData({ ...formData, duration: 0 })
                    } else {
                      const numValue = parseInt(value)
                      if (!isNaN(numValue) && numValue >= 0) {
                        setFormData({ ...formData, duration: numValue })
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value) || 0
                    if (value < 10) {
                      setFormData({ ...formData, duration: 10 })
                    } else if (value > 180) {
                      setFormData({ ...formData, duration: 180 })
                    }
                  }}
                  min="10"
                  max="180"
                  step="5"
                  className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white font-poppins focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  placeholder="30"
                />
                <p className="text-gray-400 font-poppins text-xs mt-1.5">
                  Durasi latihan dalam menit (contoh: 10, 15, 20, 30, 45, 60, dll)
                </p>
              </div>

              {/* Sync to Google Calendar Checkbox */}
              {isConnected && (
                <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-xl">
                  <input
                    type="checkbox"
                    id="syncToGoogle"
                    checked={formData.syncToGoogle}
                    onChange={(e) => setFormData({ ...formData, syncToGoogle: e.target.checked })}
                    className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="syncToGoogle" className="text-white font-poppins text-sm cursor-pointer flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Bell className="w-4 h-4 text-blue-300" />
                      <span className="font-semibold">Sinkronkan ke Google Calendar</span>
                    </div>
                    <span className="block text-gray-300 text-xs mt-1">
                      Event akan muncul di Google Calendar dan Anda akan mendapat notifikasi di HP (30 menit, 15 menit, dan 5 menit sebelum jadwal)
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingSchedule(null)
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all font-poppins font-semibold border-2 border-white/20"
              >
                Batal
              </button>
              <button
                onClick={handleAddSchedule}
                className="flex-1 bg-gradient-to-r from-accent via-accent to-accent-light text-white px-6 py-3 rounded-xl hover:shadow-2xl hover:shadow-accent/40 transition-all font-poppins font-semibold transform hover:scale-105"
              >
                {editingSchedule ? 'Simpan Perubahan' : 'Tambah Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDoneModal && doneScheduleTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/20 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-oswald font-bold text-white">
                {doneScheduleTarget.status === 'DONE' ? 'Edit Catatan Latihan' : 'Catatan Selesai Latihan'}
              </h3>
              <button
                onClick={() => {
                  setShowDoneModal(false)
                  setDoneScheduleTarget(null)
                  setDoneNoteDraft('')
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <p className="text-sm text-gray-300 font-poppins mb-3">
              {doneScheduleTarget.exercise} • {doneScheduleTarget.time} ({formatDateDisplay(doneScheduleTarget.date)})
            </p>

            <div className="mb-3">
              <p className="text-xs text-gray-300 font-poppins mb-2">Pilih cepat (opsional):</p>
              <div className="flex flex-wrap gap-2">
                {quickDoneNotes.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDoneNoteDraft(preset)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-poppins border transition-all ${
                      doneNoteDraft === preset
                        ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm text-accent font-poppins font-semibold mb-2">Catatan (wajib)</label>
            <textarea
              value={doneNoteDraft}
              onChange={(e) => setDoneNoteDraft(e.target.value)}
              rows={4}
              placeholder="Contoh: sesi selesai, teknik lebih stabil, RPE 8/10."
              className="w-full bg-white/10 border-2 border-white/20 rounded-xl px-4 py-3 text-white font-poppins placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none"
            />

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => {
                  setShowDoneModal(false)
                  setDoneScheduleTarget(null)
                  setDoneNoteDraft('')
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl transition-all font-poppins font-semibold border border-white/20"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitDoneNote}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2.5 rounded-xl hover:shadow-2xl hover:shadow-emerald-500/40 transition-all font-poppins font-semibold"
              >
                {doneScheduleTarget.status === 'DONE' ? 'Simpan Catatan' : 'Simpan & Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
