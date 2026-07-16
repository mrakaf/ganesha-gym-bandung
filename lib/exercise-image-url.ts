import exerciseImageGallery from '@/lib/data/exercise-image-gallery.json'
import exerciseImageMap from '@/lib/data/exercise-image-map.json'

const map = exerciseImageMap as Record<string, string>
const galleries = exerciseImageGallery as Record<string, string[]>

/** Kunci konsisten dengan scripts/build-exercise-image-map.ts */
export function normalizeExerciseNameForImage(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Path seperti /exercises/Barbell_Curl/0.jpg jika nama cocok dengan dataset lokal */
export function resolveLocalExerciseImageUrl(name: string): string | null {
  const key = normalizeExerciseNameForImage(name)
  const url = map[key]
  return typeof url === 'string' ? url : null
}

/** Semua gambar untuk latihan tersebut (mis. 0.jpg, 1.jpg) dari dataset lokal */
export function resolveLocalExerciseImageUrls(name: string): string[] {
  const key = normalizeExerciseNameForImage(name)
  const urls = galleries[key]
  return Array.isArray(urls) && urls.length > 0 ? urls : []
}

/** Satu atau banyak URL; tanpa dataset hanya satu URL placeholder */
export function buildExerciseImageUrls(exercise: {
  name: string
  equipment?: string
  muscle?: string
}): string[] {
  const local = resolveLocalExerciseImageUrls(exercise.name)
  if (local.length > 0) return local
  return [buildExerciseImageUrl(exercise)]
}

/** Gambar dataset lokal jika ada; jika tidak, placeholder gradient dari API route */
export function buildExerciseImageUrl(exercise: {
  name: string
  equipment?: string
  muscle?: string
}): string {
  const local = resolveLocalExerciseImageUrl(exercise.name)
  if (local) return local
  const params = new URLSearchParams({
    exercise: exercise.name,
    equipment: exercise.equipment || '',
    muscle: exercise.muscle || '',
  })
  return `/api/exercises/image?${params.toString()}`
}
