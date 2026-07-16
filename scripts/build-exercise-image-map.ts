/**
 * Membaca semua JSON di public/exercises/*.json dan menghasilkan
 * - lib/data/exercise-image-map.json — nama → gambar pertama
 * - lib/data/exercise-image-gallery.json — nama → semua URL gambar (urutan seperti dataset)
 */
import fs from 'fs'
import path from 'path'

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const exercisesDir = path.join(process.cwd(), 'public/exercises')
const files = fs.readdirSync(exercisesDir).filter((f) => f.endsWith('.json'))

const map: Record<string, string> = {}
const galleryMap: Record<string, string[]> = {}
const dupes: string[] = []

for (const file of files) {
  const fullPath = path.join(exercisesDir, file)
  let j: { name?: string; images?: string[]; id?: string }
  try {
    j = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  } catch {
    console.warn('[build-exercise-image-map] skip invalid:', file)
    continue
  }

  const id = j.id || file.replace(/\.json$/i, '')
  const name = j.name || id.replace(/_/g, ' ')
  const urls: string[] =
    Array.isArray(j.images) && j.images.length > 0
      ? j.images.map((p) => `/exercises/${String(p).replace(/^\//, '')}`)
      : [`/exercises/${id}/0.jpg`]
  const img0 = urls[0].replace(/^\/exercises\//, '')
  const url = `/exercises/${img0.replace(/^\//, '')}`

  const key = normalizeExerciseName(name)
  if (map[key] && map[key] !== url) dupes.push(`${key} → ${map[key]} vs ${url}`)
  map[key] = url
  galleryMap[key] = urls

  if (j.id) {
    const idSpaced = normalizeExerciseName(j.id.replace(/_/g, ' ').replace(/-/g, ' '))
    if (!map[idSpaced]) map[idSpaced] = url
    if (!galleryMap[idSpaced]) galleryMap[idSpaced] = urls
  }
}

const outPath = path.join(process.cwd(), 'lib/data/exercise-image-map.json')
const galleryOut = path.join(process.cwd(), 'lib/data/exercise-image-gallery.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(map, null, 0) + '\n', 'utf8')
fs.writeFileSync(galleryOut, JSON.stringify(galleryMap, null, 0) + '\n', 'utf8')

console.log(`[build-exercise-image-map] wrote ${Object.keys(map).length} keys → ${path.relative(process.cwd(), outPath)}`)
console.log(`[build-exercise-image-map] gallery ${Object.keys(galleryMap).length} keys → ${path.relative(process.cwd(), galleryOut)}`)
if (dupes.length) console.warn(`[build-exercise-image-map] conflicting duplicate names (${dupes.length}), last write wins. Sample:\n`, dupes.slice(0, 5))
