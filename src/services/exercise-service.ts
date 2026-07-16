import { buildExerciseImageUrl, buildExerciseImageUrls, resolveLocalExerciseImageUrl } from '@/lib/exercise-image-url'
import { hasPremiumAccess } from '@/src/helpers/premium-access'
import { fallbackExercises, resolveMuscleAlias } from '@/src/helpers/fallback-exercises'
import { AppError } from '@/src/models/app-error'
import { ExerciseQuery } from '@/src/models/exercise'
import { ExerciseRepository } from '@/src/repositories/exercise-repository'

type TrainingGoal = 'bulking' | 'cutting' | 'maintain'
type ExperienceLevel = 'beginner' | 'advanced' | 'all'

/** Otot yang di-fetch bergantian untuk mode otomatis (tanpa pilih target) */
const GUIDED_STRENGTH_MUSCLES = [
  'chest',
  'biceps',
  'triceps',
  'lats',
  'quadriceps',
  'abdominals',
  'traps',
] as const

export class ExerciseService {
  constructor(private readonly repo: ExerciseRepository = new ExerciseRepository()) {}

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  async getExercises(input: ExerciseQuery) {
    const goal = this.normalizeGoal(input.goal)
    const level = this.normalizeLevel(input.level)
    const gender = input.gender?.toUpperCase() === 'WANITA' ? 'WANITA' : (input.gender?.toUpperCase() === 'PRIA' ? 'PRIA' : null)

    if (!input.email) {
      throw new AppError('Akses ditolak. Email user wajib dikirim.', 401)
    }

    const member = await this.repo.findMemberAccessByEmail(input.email)
    if (!member || !hasPremiumAccess(member)) {
      throw new AppError('Fitur rekomendasi latihan hanya untuk member/visit aktif.', 403)
    }

    const isGuidedMode = !input.muscle && !input.type
    if (!input.muscle && !input.type && !isGuidedMode) {
      throw new AppError('Parameter "muscle" atau "type" wajib diisi', 400)
    }

    if (isGuidedMode) {
      return this.getGuidedModeResponse(goal, level, input.difficulty, gender)
    }

    try {
      const apiKey = process.env.NINJAS_API_KEY
      if (!apiKey) {
        return this.buildFallbackResponse(input.muscle, input.type, input.difficulty, goal, level, 'NINJAS_API_KEY tidak dikonfigurasi', gender)
      }

      const params = new URLSearchParams()
      if (input.muscle) params.append('muscle', input.muscle)
      if (input.type) params.append('type', input.type)
      if (input.difficulty) params.append('difficulty', input.difficulty)

      const response = await fetch(`https://api.api-ninjas.com/v1/exercises?${params.toString()}`, {
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        const lower = errorText.toLowerCase()
        if (response.status === 400 && (lower.includes('currently down for free users') || lower.includes('upgrade to a premium subscription'))) {
          return this.buildFallbackResponse(input.muscle, input.type, input.difficulty, goal, level, 'API Ninjas free tier tidak tersedia', gender)
        }
        return this.buildFallbackResponse(
          input.muscle,
          input.type,
          input.difficulty,
          goal,
          level,
          `API Ninjas error ${response.status}: ${response.statusText}`,
          gender
        )
      }

      const data = await response.json()
      if (!Array.isArray(data)) throw new AppError('Format response dari API tidak valid', 500)

      const translatedExercises = await this.translateExerciseList(data)

      const leveled = this.filterByExperienceLevel(translatedExercises, level)
      const recommended = this.applyGoalRecommendations(leveled, goal, gender)
      const shuffled = this.shuffleArray(recommended)
      return {
        success: true,
        exercises: this.attachExerciseImages(shuffled),
        count: shuffled.length,
        goal,
        level,
        goalPreset: this.getGoalPreset(goal),
      }
    } catch (error: any) {
      return this.buildFallbackResponse(input.muscle, input.type, input.difficulty, goal, level, error?.message || 'Unknown error', gender)
    }
  }

  /** Mode otomatis: gabung banyak grup otot agar tidak selalu daftar yang sama. */
  private async getGuidedModeResponse(goal: TrainingGoal, level: ExperienceLevel, difficulty: string | null, gender: 'PRIA' | 'WANITA' | null) {
    const apiKey = process.env.NINJAS_API_KEY
    const normalizedDifficulty = difficulty?.toLowerCase() || null

    const fallbackMerged = async (reason: string) => {
      const merged = await this.getGuidedMergedFallback(goal, level, normalizedDifficulty, gender)
      return {
        success: true,
        exercises: this.attachExerciseImages(merged),
        count: merged.length,
        fallback: true,
        guided: true,
        source: merged.length > 0 ? 'guided-merge' : 'local',
        goal,
        level,
        goalPreset: this.getGoalPreset(goal),
        message:
          'Mode otomatis: rekomendasi digabung dari beberapa area tubuh. Jika API tidak tersedia, memakai sumber cadangan.',
        reason,
      }
    }

    if (!apiKey) {
      return fallbackMerged('NINJAS_API_KEY tidak dikonfigurasi')
    }

    try {
      const raw = await this.fetchGuidedFromNinjas(apiKey, goal, normalizedDifficulty)
      if (raw.length === 0) {
        return fallbackMerged('Mode otomatis: API tidak mengembalikan latihan')
      }
      const translatedExercises = await this.translateExerciseList(raw)
      const leveled = this.filterByExperienceLevel(translatedExercises, level)
      const recommended = this.applyGoalRecommendations(leveled, goal, gender)
      const shuffled = this.shuffleArray(recommended)
      return {
        success: true,
        exercises: this.attachExerciseImages(shuffled),
        count: shuffled.length,
        fallback: false,
        guided: true,
        goal,
        level,
        goalPreset: this.getGoalPreset(goal),
      }
    } catch (error: any) {
      return fallbackMerged(error?.message || 'Mode otomatis: error API')
    }
  }

  private async fetchGuidedFromNinjas(apiKey: string, goal: TrainingGoal, difficulty: string | null): Promise<any[]> {
    const base = 'https://api.api-ninjas.com/v1/exercises'
    const diffQ = difficulty ? `&difficulty=${encodeURIComponent(difficulty)}` : ''

    const fetchJson = async (url: string) => {
      try {
        const response = await fetch(url, {
          headers: { 'X-Api-Key': apiKey },
          signal: AbortSignal.timeout(12000),
        })
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    }

    const strengthUrls = GUIDED_STRENGTH_MUSCLES.map(
      (muscle) => `${base}?muscle=${encodeURIComponent(muscle)}&type=strength${diffQ}`
    )
    const extraUrls: string[] = []
    if (goal === 'cutting') {
      extraUrls.push(`${base}?type=cardio${diffQ}`)
    }

    const batches = await Promise.all([...strengthUrls, ...extraUrls].map((u) => fetchJson(u)))
    const seen = new Set<string>()
    const out: any[] = []
    for (const batch of batches) {
      for (const ex of batch) {
        const n = String(ex?.name || '')
          .toLowerCase()
          .trim()
        if (!n || seen.has(n)) continue
        seen.add(n)
        out.push(ex)
      }
    }
    return out.slice(0, 120)
  }

  private async getGuidedMergedFallback(
    goal: TrainingGoal,
    level: ExperienceLevel,
    normalizedDifficulty: string | null,
    gender: 'PRIA' | 'WANITA' | null
  ) {
    const fromDb = await this.getGuidedDbExercises(normalizedDifficulty, goal, level, gender)
    if (fromDb.length > 0) return fromDb
    return this.getGuidedLocalFallback(goal, level, gender)
  }

  private async getGuidedDbExercises(
    normalizedDifficulty: string | null,
    goal: TrainingGoal,
    level: ExperienceLevel,
    gender: 'PRIA' | 'WANITA' | null
  ) {
    const whereStrength: any = {
      type: 'strength',
      muscle: { in: [...GUIDED_STRENGTH_MUSCLES] },
    }
    if (normalizedDifficulty) whereStrength.difficulty = normalizedDifficulty

    let rows = await this.repo.findExercises(whereStrength, 90)
    if (goal === 'cutting') {
      const cardioWhere: any = { type: 'cardio' }
      if (normalizedDifficulty) cardioWhere.difficulty = normalizedDifficulty
      const cardio = await this.repo.findExercises(cardioWhere, 25)
      rows = [...rows, ...cardio]
    }

    const seen = new Set<string>()
    const uniq = rows.filter((r) => {
      if (seen.has(r.name)) return false
      seen.add(r.name)
      return true
    })

    const normalized = uniq.map((exercise) => ({
      name: exercise.name,
      type: exercise.type || 'strength',
      muscle: exercise.muscle || '',
      equipment: exercise.equipment || 'body weight',
      difficulty: exercise.difficulty || 'beginner',
      instructions: exercise.instructionsId || exercise.instructions || 'Tidak ada instruksi tersedia.',
    }))
    const recommended = this.applyGoalRecommendations(this.filterByExperienceLevel(normalized, level), goal, gender)
    return this.shuffleArray(recommended)
  }

  private getGuidedLocalFallback(goal: TrainingGoal, level: ExperienceLevel, gender: 'PRIA' | 'WANITA' | null) {
    const muscleLoop =
      goal === 'cutting' ? ([...GUIDED_STRENGTH_MUSCLES, 'cardio'] as const) : [...GUIDED_STRENGTH_MUSCLES]
    const seen = new Set<string>()
    const picked: typeof fallbackExercises = []
    for (const m of muscleLoop) {
      const pool =
        m === 'cardio'
          ? fallbackExercises.filter((e) => e.type === 'cardio')
          : fallbackExercises.filter((e) => e.type === 'strength' && e.muscle.toLowerCase() === m)
      for (const ex of pool) {
        if (seen.has(ex.name)) continue
        seen.add(ex.name)
        picked.push(ex)
      }
    }
    if (picked.length === 0) {
      const recommended = this.applyGoalRecommendations(
        this.filterByExperienceLevel(this.getLocalFallbackExercises(null, null), level),
        goal,
        gender
      )
      return this.shuffleArray(recommended)
    }
    const recommended = this.applyGoalRecommendations(this.filterByExperienceLevel(picked, level), goal, gender)
    return this.shuffleArray(recommended)
  }

  private async translateExerciseList(data: any[]): Promise<any[]> {
    const translatedExercises = []
    for (const exercise of data) {
      try {
        let translatedInstructions = exercise.instructions || 'Tidak ada instruksi tersedia.'
        const cached = await this.repo.findExerciseTranslationByName(exercise.name)
        if (cached?.instructionsId) {
          translatedInstructions = cached.instructionsId
        } else {
          translatedInstructions =
            '📝 Instruksi untuk latihan ini sedang dalam proses penerjemahan ke bahasa Indonesia.\n\nSilakan cek kembali nanti atau hubungi admin untuk informasi lebih lanjut.\n\nTerima kasih atas pengertiannya!'
          this.repo.upsertExerciseFromApi(exercise).catch(() => null)
        }
        translatedExercises.push({ ...exercise, instructions: translatedInstructions })
      } catch {
        translatedExercises.push({
          ...exercise,
          instructions: exercise.instructions || 'Tidak ada instruksi tersedia.',
        })
      }
    }
    return translatedExercises
  }

  private normalizeGoal(goal: string | null): TrainingGoal {
    const normalized = (goal || '').toLowerCase()
    if (normalized === 'bulking' || normalized === 'cutting' || normalized === 'maintain') return normalized
    return 'maintain'
  }

  /** Pengalaman pemula/advanced tidak lagi memfilter daftar — semua tingkat kesulitan latihan tetap ditampilkan. */
  private normalizeLevel(_level: string | null): ExperienceLevel {
    return 'all'
  }

  /** Filter hanya latihan yang memiliki gambar lokal di public/exercises */
  private filterExercisesWithLocalImages<T extends { name: string }>(items: T[]): T[] {
    return items.filter((item) => resolveLocalExerciseImageUrl(item.name) !== null)
  }

  /** Urutan stabil: yang punya aset gambar di public/exercises dulu, sisanya tetap ada di bawah. */
  private prioritizeExercisesWithLocalImagesFirst<T extends { name: string }>(items: T[]): T[] {
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const la = resolveLocalExerciseImageUrl(a.item.name) ? 1 : 0
        const lb = resolveLocalExerciseImageUrl(b.item.name) ? 1 : 0
        if (lb !== la) return lb - la
        return a.index - b.index
      })
      .map(({ item }) => item)
  }

  private attachExerciseImages<T extends { name: string; equipment?: string; muscle?: string }>(items: T[]) {
    const filtered = this.filterExercisesWithLocalImages(items)
    const enriched = filtered.map((e) => ({
      ...e,
      imageUrl: buildExerciseImageUrl(e),
      imageUrls: buildExerciseImageUrls(e),
    }))
    return this.prioritizeExercisesWithLocalImagesFirst(enriched)
  }

  private filterByExperienceLevel<T extends { difficulty?: string }>(exercises: T[], level: ExperienceLevel) {
    if (level === 'all') return exercises
    if (level === 'beginner') return exercises.filter((e) => String(e.difficulty || '').toLowerCase() === 'beginner')
    return exercises.filter((e) => {
      const d = String(e.difficulty || '').toLowerCase()
      return d === 'intermediate' || d === 'expert'
    })
  }

  private getGoalPreset(goal: TrainingGoal) {
    if (goal === 'bulking') return { repRange: '6-12 repetisi', setRange: '3-5 set', restSeconds: '90-150 detik', focus: 'Fokus beban progresif dan gerakan compound. Prioritaskan kontrol gerakan serta progres mingguan.' }
    if (goal === 'cutting') return { repRange: '12-20 repetisi', setRange: '3-4 set', restSeconds: '30-60 detik', focus: 'Fokus densitas latihan (waktu istirahat singkat), superset ringan, dan tambahan sesi cardio.' }
    return { repRange: '8-15 repetisi', setRange: '3-4 set', restSeconds: '60-90 detik', focus: 'Fokus keseimbangan kekuatan, teknik, dan kebugaran. Pertahankan volume latihan secara konsisten.' }
  }

  private applyGoalRecommendations<T extends Record<string, any>>(exercises: T[], goal: TrainingGoal, gender: 'PRIA' | 'WANITA' | null) {
    const preset = this.getGoalPreset(goal)
    const score = (exercise: T) => {
      const type = String(exercise.type || '').toLowerCase()
      const difficulty = String(exercise.difficulty || '').toLowerCase()
      const equipment = String(exercise.equipment || '').toLowerCase()
      const muscle = String(exercise.muscle || '').toLowerCase()
      let n = 0
      
      if (goal === 'bulking') {
        if (type === 'strength') n += 3
        if (difficulty === 'intermediate' || difficulty === 'expert') n += 2
        if (equipment.includes('barbell') || equipment.includes('dumbbell') || equipment.includes('machine')) n += 1
      } else if (goal === 'cutting') {
        if (type === 'cardio') n += 4
        if (type === 'strength') n += 2
        if (difficulty === 'intermediate' || difficulty === 'expert') n += 1
        if (equipment.includes('body weight') || equipment.includes('cable')) n += 1
      } else {
        if (type === 'strength') n += 2
        if (type === 'cardio') n += 2
        if (difficulty === 'beginner' || difficulty === 'intermediate') n += 1
      }

      if (gender === 'WANITA') {
        if (['glutes', 'quadriceps', 'hamstrings', 'abdominals', 'shoulders'].includes(muscle)) n += 2
      } else if (gender === 'PRIA') {
        if (['chest', 'biceps', 'triceps', 'back', 'lats', 'quadriceps'].includes(muscle)) n += 2
      }

      return n
    }

    return [...exercises].sort((a, b) => score(b) - score(a)).map((exercise) => ({
      ...exercise,
      recommendation: { goal, ...preset },
    }))
  }

  private getLocalFallbackExercises(muscle: string | null, type: string | null) {
    const normalizedMuscle = resolveMuscleAlias(muscle)
    const normalizedType = type?.toLowerCase() || null
    if (normalizedType === 'cardio') return fallbackExercises.filter((exercise) => exercise.type === 'cardio')
    if (normalizedMuscle) {
      const byMuscle = fallbackExercises.filter((exercise) => exercise.muscle.toLowerCase() === normalizedMuscle)
      if (byMuscle.length > 0) return byMuscle
    }
    return fallbackExercises.filter((exercise) => exercise.type === 'strength').slice(0, 6)
  }

  private async getDbFallbackExercises(
    muscle: string | null,
    type: string | null,
    difficulty: string | null,
    goal: TrainingGoal,
    level: ExperienceLevel,
    gender: 'PRIA' | 'WANITA' | null
  ) {
    const normalizedMuscle = resolveMuscleAlias(muscle)
    const normalizedType = type?.toLowerCase() || null
    const normalizedDifficulty = difficulty?.toLowerCase() || null
    const whereClause: any = {}
    whereClause.type = normalizedType === 'cardio' ? 'cardio' : 'strength'
    if (normalizedMuscle && normalizedType !== 'cardio') whereClause.muscle = normalizedMuscle
    if (normalizedDifficulty) whereClause.difficulty = normalizedDifficulty

    const dbExercises = await this.repo.findExercises(whereClause, 30)
    if (dbExercises.length === 0) return []
    const normalized = dbExercises.map((exercise) => ({
      name: exercise.name,
      type: exercise.type || 'strength',
      muscle: exercise.muscle || (normalizedType === 'cardio' ? 'cardio' : normalizedMuscle || ''),
      equipment: exercise.equipment || 'body weight',
      difficulty: exercise.difficulty || 'beginner',
      instructions: exercise.instructionsId || exercise.instructions || 'Tidak ada instruksi tersedia.',
    }))
    const recommended = this.applyGoalRecommendations(this.filterByExperienceLevel(normalized, level), goal, gender)
    return this.shuffleArray(recommended)
  }

  private async buildFallbackResponse(
    muscle: string | null,
    type: string | null,
    difficulty: string | null,
    goal: TrainingGoal,
    level: ExperienceLevel,
    reason: string,
    gender: 'PRIA' | 'WANITA' | null
  ) {
    const dbFallback = await this.getDbFallbackExercises(muscle, type, difficulty, goal, level, gender)
    const fallbackData = dbFallback.length > 0 ? dbFallback : this.applyGoalRecommendations(this.filterByExperienceLevel(this.getLocalFallbackExercises(muscle, type), level), goal, gender)
    const shuffled = this.shuffleArray(fallbackData)
    return {
      success: true,
      exercises: this.attachExerciseImages(shuffled),
      count: shuffled.length,
      fallback: true,
      source: dbFallback.length > 0 ? 'db' : 'local',
      goal,
      level,
      goalPreset: this.getGoalPreset(goal),
      message: 'Sumber rekomendasi utama sedang tidak tersedia. Menampilkan rekomendasi cadangan lokal.',
      reason,
    }
  }
}

