/** Legacy global key — semua akun share data yang sama (tidak ideal). */
export const LEGACY_WORKOUT_SCHEDULES_KEY = 'workout_schedules'

export function workoutSchedulesStorageKey(email: string) {
  return `workout_schedules:${email.trim().toLowerCase()}`
}

export const LEGACY_SCHEDULE_TEMPLATE_PREFS_KEY = 'schedule_template_preferences'

export function scheduleTemplatePrefsStorageKey(email: string) {
  return `schedule_template_preferences:${email.trim().toLowerCase()}`
}

/** Migrasi sekali dari key global ke key per-akun (sama pola seperti jadwal). */
export function loadTemplatePrefsJsonForUser(email: string): string | null {
  const key = scheduleTemplatePrefsStorageKey(email)
  let raw = localStorage.getItem(key)
  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_SCHEDULE_TEMPLATE_PREFS_KEY)
    if (legacy) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(LEGACY_SCHEDULE_TEMPLATE_PREFS_KEY)
      raw = legacy
    }
  }
  return raw
}

/**
 * Ambil JSON jadwal untuk email ini.
 * Jika belum ada key per-akun tapi masih ada data legacy global, migrasi sekali ke key akun lalu hapus legacy.
 */
export function loadSchedulesJsonForUser(email: string): string | null {
  const key = workoutSchedulesStorageKey(email)
  let raw = localStorage.getItem(key)
  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_WORKOUT_SCHEDULES_KEY)
    if (legacy) {
      localStorage.setItem(key, legacy)
      localStorage.removeItem(LEGACY_WORKOUT_SCHEDULES_KEY)
      raw = legacy
    }
  }
  return raw
}
