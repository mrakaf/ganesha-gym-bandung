/**
 * Ambil sampel latihan dari API Ninjas untuk setiap filter muscle/type,
 * kumpulkan nilai field `muscle` yang unik, dan tampilkan bucket klasifikasi
 * (sama seperti lib/workout-method-curate.ts).
 *
 * Jalankan dari root proyek:
 *   npx tsx scripts/audit-api-ninjas-muscles.ts
 *
 * Butuh NINJAS_API_KEY di .env atau .env.local
 */
import { config } from 'dotenv'
import path from 'path'
import { classifyExerciseMuscleBucket } from '../lib/workout-method-curate'

config({ path: path.join(process.cwd(), '.env.local') })
config({ path: path.join(process.cwd(), '.env') })

/** Filter muscle yang didokumentasikan API Ninjas v1 + yang dipakai app */
const STRENGTH_MUSCLE_FILTERS = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower_back',
  'middle_back',
  'neck',
  'quadriceps',
  'traps',
  'triceps',
] as const

async function fetchExercises(url: string, apiKey: string): Promise<any[]> {
  const res = await fetch(url, {
    headers: { 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    console.warn(`[audit] ${res.status} ${url}`)
    return []
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function main() {
  const apiKey = process.env.NINJAS_API_KEY
  if (!apiKey) {
    console.error('NINJAS_API_KEY tidak ada. Isi di .env.local lalu jalankan lagi.')
    process.exit(1)
  }

  const base = 'https://api.api-ninjas.com/v1/exercises'
  const muscleCounts = new Map<string, number>()

  for (const muscle of STRENGTH_MUSCLE_FILTERS) {
    const url = `${base}?muscle=${encodeURIComponent(muscle)}&type=strength`
    const rows = await fetchExercises(url, apiKey)
    for (const row of rows) {
      const m = String(row?.muscle ?? '').trim()
      if (!m) continue
      muscleCounts.set(m, (muscleCounts.get(m) || 0) + 1)
    }
  }

  const cardioRows = await fetchExercises(`${base}?type=cardio`, apiKey)
  for (const row of cardioRows) {
    const m = String(row?.muscle ?? '').trim()
    if (!m) continue
    muscleCounts.set(m, (muscleCounts.get(m) || 0) + 1)
  }

  const sorted = [...muscleCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  console.log('\n=== API Ninjas: nilai field `muscle` unik (agregat dari fetch) ===\n')
  console.log('muscle (API)'.padEnd(22), 'bucket'.padEnd(10), 'kemunculan (sample)')
  console.log('-'.repeat(52))

  const unmapped: string[] = []
  for (const [m, c] of sorted) {
    const bucket = classifyExerciseMuscleBucket(m)
    console.log(m.padEnd(22), bucket.padEnd(10), String(c))
    if (bucket === 'other') unmapped.push(m)
  }

  console.log('\n--- Ringkasan ---')
  console.log('Total nilai unik:', sorted.length)
  console.log('Masuk bucket `other` (pertimbangkan tambah alias):', unmapped.length ? unmapped.join(', ') : '(tidak ada)')

  if (unmapped.length) {
    console.log('\nSaran: tambahkan string di PUSH_MUSCLES / PULL_MUSCLES / LEG_MUSCLES / CORE_MUSCLES')
    console.log('atau aturan m.includes(...) di lib/workout-method-curate.ts\n')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
