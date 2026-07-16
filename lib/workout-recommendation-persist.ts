/** Snapshot UI rekomendasi latihan (sessionStorage) — tetap ada saat pindah menu / refresh tab. */

export const WORKOUT_RECOMMEND_STORAGE_PREFIX = 'ganesha.workoutRecommendations.v2:'

export function workoutRecommendStorageKey(
  identityEmail: string | null,
  identityUsername: string | null
): string | null {
  if (identityEmail) return `${WORKOUT_RECOMMEND_STORAGE_PREFIX}email:${identityEmail.toLowerCase()}`
  if (identityUsername) return `${WORKOUT_RECOMMEND_STORAGE_PREFIX}user:${identityUsername}`
  return null
}

export function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** `YYYY-MM-DD|exerciseName` — nama tidak boleh mengandung `|` */
export function activityLoggedKey(exerciseName: string, at: Date = new Date()): string {
  return `${formatLocalDateKey(at)}|${exerciseName}`
}

export function pruneActivityLoggedKeys(keys: string[], keepDays = 14): string[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)
  const cutoffStr = formatLocalDateKey(cutoff)
  return keys.filter((k) => {
    const day = k.split('|')[0]
    return day.length === 10 && day >= cutoffStr
  })
}

export type WorkoutsMainTabPersisted = 'recommend' | 'history'

/** Shape disimpan di sessionStorage (JSON). */
export type WorkoutRecommendationPersisted = {
  v: 2
  recommendationMode: 'target' | 'guided'
  selectedTarget: string
  selectedGoal: 'bulking' | 'cutting' | 'maintain'
  manualSplitPreset: string | null
  exercises: unknown[]
  weeklyProgram: unknown | null
  programPackage: unknown | null
  mainTab: WorkoutsMainTabPersisted
  /** Kunci `YYYY-MM-DD|namaGerakan` untuk tampilan “sudah dicatat” */
  loggedActivityKeys: string[]
}
