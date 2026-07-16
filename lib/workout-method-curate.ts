import { resolveLocalExerciseImageUrl } from '@/lib/exercise-image-url'

export type TrainingMethodKey = 'push_split' | 'ppl' | 'ppl_arnold' | 'heavy_duty'

export type TrainingGoalKey = 'bulking' | 'cutting' | 'maintain'

/** Satu baris latihan minimum untuk dikurasi */
export type CuratableExercise = { name: string; muscle: string }

/**
 * Nilai `muscle` dari API Ninjas v1 (dan varian umum).
 * @see https://api-ninjas.com/api/exercises
 */
const PUSH_MUSCLES = new Set(['chest', 'triceps', 'traps', 'shoulders', 'serratus_anterior', 'pectorals'])
const PULL_MUSCLES = new Set(['lats', 'biceps', 'forearms', 'middle_back', 'lower_back'])
const LEG_MUSCLES = new Set([
  'quadriceps',
  'hamstrings',
  'calves',
  'glutes',
  'abductors',
  'adductors',
])
const CORE_MUSCLES = new Set(['abdominals', 'obliques'])

export type ExerciseMuscleBucket = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'other'

/**
 * Urutan cek: tipe cardio → core → kaki → dorong (chest/triceps/traps) → tarik.
 * Diekspor untuk skrip audit & tes.
 */
export function classifyExerciseMuscleBucket(muscle: string): ExerciseMuscleBucket {
  const raw = muscle.toLowerCase().trim()
  if (!raw) return 'other'
  if (raw === 'cardio') return 'cardio'

  const m = raw.replace(/\s+/g, '_')

  if (CORE_MUSCLES.has(m) || m.includes('abdominal')) return 'core'
  if (LEG_MUSCLES.has(m)) return 'legs'
  if (PUSH_MUSCLES.has(m) || m.includes('chest') || m.includes('tricep')) return 'push'
  if (PULL_MUSCLES.has(m) || m.includes('lat') || m.includes('bicep')) return 'pull'

  if (m === 'neck') return 'other'
  if (m.includes('back') || m.includes('rear')) return 'pull'

  return 'other'
}

type BucketKey = ExerciseMuscleBucket

type Plan = Partial<Record<'push' | 'pull' | 'legs' | 'core' | 'cardio', number>>

/**
 * Kuota gerakan inti per metode (hanya yang sudah difilter ber-gambar lokal).
 * Angka diset ringkas supaya UI tidak penuh; cutting bisa +cardio lewat buildPlan.
 */
const BASE_STRATEGY: Record<TrainingMethodKey, Plan> = {
  /** PPL klasik: seimbang dorong / tarik / kaki */
  ppl: { push: 4, pull: 4, legs: 4, core: 1 },
  /** Arnold-style: volume sedikit lebih besar atas + punggung */
  ppl_arnold: { push: 5, pull: 4, legs: 4, core: 2 },
  /** Dominan sesi dorong; sisip sedikit tarik & core */
  push_split: { push: 6, core: 2, pull: 1 },
  /** Mentzer: sedikit gerakan, full-body spread */
  heavy_duty: { push: 2, pull: 2, legs: 2, core: 1 },
}

function buildPlan(method: TrainingMethodKey, goal?: TrainingGoalKey): Plan {
  const plan: Plan = { ...BASE_STRATEGY[method] }

  if (goal === 'cutting') {
    if (method === 'ppl' || method === 'ppl_arnold') {
      plan.cardio = (plan.cardio ?? 0) + 2
      if (method === 'ppl' && plan.legs != null && plan.legs > 3) plan.legs = 3
    } else if (method === 'push_split') {
      plan.cardio = 1
      if (plan.push != null && plan.push > 5) plan.push = 5
    } else if (method === 'heavy_duty') {
      plan.cardio = 1
    }
  }

  if (goal === 'bulking' && (method === 'ppl' || method === 'ppl_arnold')) {
    if (plan.legs != null) plan.legs = Math.min(plan.legs + 1, 5)
  }

  return plan
}

function takeFromBucket<T extends CuratableExercise>(bucket: T[], need: number, used: Set<string>, out: T[]) {
  let n = need
  for (const ex of bucket) {
    if (n <= 0) break
    if (used.has(ex.name)) continue
    used.add(ex.name)
    out.push(ex)
    n--
  }
}

function hardCap(method: TrainingMethodKey, goal: TrainingGoalKey | undefined): number {
  if (method === 'ppl_arnold') return goal === 'cutting' ? 17 : 16
  if (method === 'ppl') return goal === 'cutting' ? 15 : 14
  if (method === 'push_split') return goal === 'cutting' ? 11 : 10
  return 9
}

/**
 * Saat pengunjung memilih metode (override preset): hanya latihan dengan ilustrasi lokal,
 * dipersempit ke gerakan inti sesuai metode + penyesuaian ringan dari goal.
 */
export function curateExercisesForManualMethod<T extends CuratableExercise>(
  exercises: T[],
  method: TrainingMethodKey,
  goal?: TrainingGoalKey,
  target?: string
): T[] {
  let withImage = exercises.filter((e) => resolveLocalExerciseImageUrl(e.name))
  if (withImage.length === 0) return []

  // Generate deterministic seed
  let seed = 1337
  const seedString = `${method}-${goal}-${target || 'all'}`
  for (let i = 0; i < seedString.length; i++) {
    seed = (seed * 31 + seedString.charCodeAt(i)) % 2147483647
  }
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  // Shuffle deterministically
  withImage = [...withImage].sort(() => random() - 0.5)

  const buckets: Record<BucketKey, T[]> = {
    push: [],
    pull: [],
    legs: [],
    core: [],
    cardio: [],
    other: [],
  }

  for (const ex of withImage) {
    const k = classifyExerciseMuscleBucket(ex.muscle || '')
    if (k === 'other') buckets.other.push(ex)
    else buckets[k].push(ex)
  }

  const plan = buildPlan(method, goal)
  const used = new Set<string>()
  const out: T[] = []

  const order: (keyof Plan)[] = ['push', 'pull', 'legs', 'core', 'cardio']
  for (const key of order) {
    const need = plan[key]
    if (need && need > 0) {
      takeFromBucket(buckets[key], need, used, out)
    }
  }

  takeFromBucket(buckets.other, 3, used, out)

  if (out.length < 6) {
    for (const ex of withImage) {
      if (out.length >= 12) break
      if (used.has(ex.name)) continue
      used.add(ex.name)
      out.push(ex)
    }
  }

  return out.slice(0, hardCap(method, goal))
}
