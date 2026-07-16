export const dynamic = 'force-dynamic';
'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dumbbell,
  Filter,
  Languages,
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Info,
  ListChecks,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface Exercise {
  id: string
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
  instructionsId: string | null
}

// Mapping muscle dari API Ninjas ke label bahasa Indonesia
// Sama dengan yang ada di halaman workouts user
const muscleLabels: Record<string, string> = {
  // Kategori utama (sama dengan user workouts)
  'biceps': 'Biceps',
  'triceps': 'Triceps',
  'chest': 'Dada',
  'shoulders': 'Bahu',
  'lats': 'Punggung', // API Ninjas menggunakan 'lats' untuk back
  'quadriceps': 'Kaki', // API Ninjas menggunakan 'quadriceps' untuk legs
  'abdominals': 'Perut', // API Ninjas menggunakan 'abdominals' untuk abs
  'cardio': 'Kardio', // Untuk type=cardio (tidak ada muscle parameter)
  
  // Kategori tambahan yang mungkin muncul dari API
  'hamstrings': 'Paha Belakang',
  'calves': 'Betis',
  'glutes': 'Pantat',
  'forearms': 'Lengan Bawah',
  'traps': 'Trapesium',
  'middle_back': 'Punggung Tengah',
  'lower_back': 'Punggung Bawah',
  'obliques': 'Oblik',
  'adductors': 'Adduktor',
  'abductors': 'Abduktor',
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all')
  const [showUntranslatedOnly, setShowUntranslatedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTranslation, setEditTranslation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedMuscles, setExpandedMuscles] = useState<Set<string>>(new Set())
  const { success, error: showError } = useToast()

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/exercises')
      if (!response.ok) throw new Error('Failed to fetch exercises')
      const data = await response.json()
      setExercises(data.exercises || [])
      
      // Auto-expand semua muscle categories untuk memudahkan navigasi
      const allMuscles = new Set<string>()
      data.exercises?.forEach((ex: Exercise) => {
        if (ex.muscle) {
          allMuscles.add(ex.muscle)
        }
      })
      setExpandedMuscles(allMuscles)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat exercises')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingId(exercise.id)
    setEditTranslation(exercise.instructionsId || exercise.instructions)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditTranslation('')
  }

  const handleSave = async (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId)
    const isUpdate = Boolean(exercise?.instructionsId)
    try {
      setSaving(true)
      setError('')
      
      const response = await fetch(`/api/admin/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructionsId: editTranslation }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal menyimpan terjemahan')
      }

      setExercises(exercises.map(ex => 
        ex.id === exerciseId 
          ? { ...ex, instructionsId: editTranslation }
          : ex
      ))
      
      setEditingId(null)
      setEditTranslation('')
      success(isUpdate ? 'Terjemahan berhasil diperbarui' : 'Terjemahan berhasil ditambahkan')
    } catch (err: any) {
      const message = err?.message || 'Gagal menyimpan terjemahan'
      setError(message)
      showError(message)
    } finally {
      setSaving(false)
    }
  }

  // Get available muscles from exercises
  // Selalu tampilkan semua kategori utama, bahkan jika belum ada exercises
  const availableMuscles = useMemo(() => {
    const muscles = new Set<string>()
    
    // Kategori utama (sama dengan user workouts) - SELALU tampilkan semua
    const mainCategoriesOrder = ['biceps', 'triceps', 'chest', 'shoulders', 'lats', 'quadriceps', 'abdominals', 'cardio']
    
    // Check exercises yang ada
    exercises.forEach(ex => {
      if (ex.muscle) {
        muscles.add(ex.muscle)
      }
      // Check for cardio exercises
      if (ex.type === 'cardio') {
        muscles.add('cardio')
      }
    })
    
    // Selalu include semua kategori utama, bahkan jika belum ada exercises
    mainCategoriesOrder.forEach(m => muscles.add(m))
    
    // Get other muscles yang tidak termasuk kategori utama
    const otherMuscles = Array.from(muscles).filter(m => !mainCategoriesOrder.includes(m))
    
    // Sort other muscles by label
    otherMuscles.sort((a, b) => {
      const labelA = muscleLabels[a] || a
      const labelB = muscleLabels[b] || b
      return labelA.localeCompare(labelB)
    })
    
    // Return: main categories first (dalam urutan yang sudah ditentukan), then others
    return [...mainCategoriesOrder, ...otherMuscles]
  }, [exercises])

  // Group exercises by muscle with filters
  const exercisesByMuscle = useMemo(() => {
    const grouped: Record<string, Exercise[]> = {}
    
    // Filter exercises based on selected muscle, translation status, and search query
    let filtered = exercises
    
    // Filter by search query
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(normalizedQuery)
      )
    }
    
    // Filter by muscle category
    if (selectedMuscle !== 'all') {
      if (selectedMuscle === 'cardio') {
        // Filter cardio exercises (type='cardio' atau muscle='cardio')
        filtered = filtered.filter(ex => ex.type === 'cardio' || ex.muscle === 'cardio')
      } else {
        filtered = filtered.filter(ex => ex.muscle === selectedMuscle)
      }
    }
    
    // Filter by translation status
    if (showUntranslatedOnly) {
      filtered = filtered.filter(ex => !ex.instructionsId)
    }
    
    // Group by muscle
    filtered.forEach(ex => {
      // Handle cardio exercises
      let muscle = ex.muscle || 'other'
      if (ex.type === 'cardio' || ex.muscle === 'cardio') {
        muscle = 'cardio'
      }
      
      if (!grouped[muscle]) {
        grouped[muscle] = []
      }
      grouped[muscle].push(ex)
    })
    
    // Sort exercises within each muscle group
    Object.keys(grouped).forEach(muscle => {
      grouped[muscle].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    return grouped
  }, [exercises, selectedMuscle, showUntranslatedOnly, searchQuery])

  // Get sorted muscle list
  const muscleList = useMemo(() => {
    return Object.keys(exercisesByMuscle).sort((a, b) => {
      const labelA = muscleLabels[a] || a
      const labelB = muscleLabels[b] || b
      return labelA.localeCompare(labelB)
    })
  }, [exercisesByMuscle])

  const toggleMuscle = (muscle: string) => {
    const newExpanded = new Set(expandedMuscles)
    if (newExpanded.has(muscle)) {
      newExpanded.delete(muscle)
    } else {
      newExpanded.add(muscle)
    }
    setExpandedMuscles(newExpanded)
  }

  const translatedCount = exercises.filter(ex => ex.instructionsId).length
  const notTranslatedCount = exercises.length - translatedCount

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-oswald font-bold text-gray-900 mb-2">Data latihan</h1>
        <p className="text-gray-600 font-poppins text-sm max-w-3xl leading-relaxed">
          Lihat daftar latihan di sistem, lalu lengkapi <strong className="text-gray-800">instruksi Bahasa Indonesia</strong> untuk
          member. Instruksi asli dari database (biasanya Inggris) <strong className="text-gray-800">tidak dihapus</strong>—hanya
          ditambahkan versi Indonesia yang tampil di aplikasi pengunjung.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/80 p-4 sm:p-5">
        <div className="flex gap-3">
          <div className="shrink-0 mt-0.5">
            <Info className="w-5 h-5 text-sky-700" aria-hidden />
          </div>
          <div className="space-y-2 font-poppins text-sm text-sky-950">
            <p className="font-semibold text-sky-900">Tujuan menambah / mengubah terjemahan</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sky-900/90 leading-relaxed">
              <li>
                <strong>Tambah terjemahan</strong> — member yang membuka detail latihan melihat langkah-langkah dalam{' '}
                <strong>Bahasa Indonesia</strong> (lebih mudah dipahami).
              </li>
              <li>
                <strong>Ubah terjemahan</strong> — memperbaiki istilah, ejaan, atau penjelasan tanpa mengubah data asli
                sistem; yang tersimpan terpisah sebagai teks Indonesia.
              </li>
              <li>
                Latihan tanpa terjemahan ditandai <strong>kuning</strong>; disarankan dilengkapi agar pengalaman member
                konsisten.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 font-poppins text-xs font-medium uppercase tracking-wide mb-1">Total latihan</p>
          <p className="text-2xl font-oswald font-bold text-gray-900">{exercises.length}</p>
          <p className="text-xs text-gray-500 font-poppins mt-1">Semua entri di database</p>
        </div>
        <div className="bg-emerald-50/90 rounded-xl border border-emerald-200 p-4 shadow-sm">
          <p className="text-emerald-800 font-poppins text-xs font-medium uppercase tracking-wide mb-1">Sudah ada ID</p>
          <p className="text-2xl font-oswald font-bold text-emerald-800">{translatedCount}</p>
          <p className="text-xs text-emerald-700/90 font-poppins mt-1">Instruksi Indonesia sudah diisi</p>
        </div>
        <div className="bg-amber-50/90 rounded-xl border border-amber-200 p-4 shadow-sm">
          <p className="text-amber-900 font-poppins text-xs font-medium uppercase tracking-wide mb-1">Belum ada ID</p>
          <p className="text-2xl font-oswald font-bold text-amber-900">{notTranslatedCount}</p>
          <p className="text-xs text-amber-800/90 font-poppins mt-1">Perlu terjemahan untuk member</p>
        </div>
      </div>

      <div className="mb-5">
        <h2 className="text-sm font-oswald font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gray-600" />
          Saring &amp; cari latihan
        </h2>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="exercise-search" className="block text-sm font-poppins font-semibold text-gray-700 mb-2">
                Cari nama latihan
              </label>
              <input
                id="exercise-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama latihan..."
                className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="muscle-filter" className="block text-sm font-poppins font-semibold text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1 align-text-bottom" aria-hidden />
                Grup otot / kategori
              </label>
              <select
                id="muscle-filter"
                value={selectedMuscle}
                onChange={(e) => setSelectedMuscle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-sm"
              >
                <option value="all">Semua kategori</option>
                {availableMuscles.map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {muscleLabels[muscle] || muscle}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={showUntranslatedOnly}
                  onChange={(e) => setShowUntranslatedOnly(e.target.checked)}
                  className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent shrink-0"
                />
                <span className="text-sm font-poppins text-gray-800 leading-snug">
                  Hanya latihan yang <strong>belum punya</strong> teks Indonesia
                </span>
              </label>
            </div>
          </div>

          {(selectedMuscle !== 'all' || searchQuery.trim()) && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              <p className="text-sm font-poppins text-slate-700">
                {searchQuery.trim() && (
                  <>Cari: <span className="font-semibold text-slate-900">{searchQuery.trim()}</span> — </>
                )}
                {selectedMuscle !== 'all' && (
                  <>Menampilkan grup: <span className="font-semibold text-slate-900">{muscleLabels[selectedMuscle] || selectedMuscle}</span></>
                )}
                {showUntranslatedOnly && (
                  <span className="text-slate-600"> — difilter ke yang belum ada terjemahan</span>
                )}
                .
              </p>
            </div>
          )}
        </div>
      </div>


      {/* Exercises Grouped by Muscle */}
      <div className="space-y-3">
        {muscleList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-poppins">
              {selectedMuscle !== 'all' ? 'Tidak ada exercise yang cocok dengan filter' : 'Belum ada exercises'}
            </p>
          </div>
        ) : (
          muscleList.map((muscle) => {
            const muscleExercises = exercisesByMuscle[muscle]
            const translatedInMuscle = muscleExercises.filter(ex => ex.instructionsId).length
            const notTranslatedInMuscle = muscleExercises.length - translatedInMuscle
            const isExpanded = expandedMuscles.has(muscle)
            const muscleLabel = muscleLabels[muscle] || muscle

            return (
              <div key={muscle} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Muscle Header */}
                <button
                  onClick={() => toggleMuscle(muscle)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <h3 className="text-lg font-oswald font-bold text-gray-900">
                      {muscleLabel}
                    </h3>
                    <span className="text-sm font-poppins text-gray-500">
                      ({muscleExercises.length} exercises)
                    </span>
                    {notTranslatedInMuscle > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-xs font-poppins font-semibold">
                        {notTranslatedInMuscle} tanpa teks ID
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Exercises List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 divide-y divide-gray-200">
                    {muscleExercises.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 font-poppins text-sm">
                        Tidak ada exercises yang cocok dengan filter
                      </div>
                    ) : (
                      muscleExercises.map((exercise) => (
                        <div 
                          key={exercise.id} 
                          className={`p-4 hover:bg-gray-50 transition-colors ${
                            !exercise.instructionsId ? 'bg-yellow-50/50 border-l-4 border-l-yellow-400' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-oswald font-bold text-gray-900">
                                  {exercise.name}
                                </h4>
                                {exercise.instructionsId ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="Instruksi Indonesia sudah ada" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-yellow-600" aria-label="Instruksi Indonesia belum ada" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-poppins capitalize">
                                  {exercise.equipment}
                                </span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-poppins capitalize">
                                  {exercise.difficulty}
                                </span>
                                {exercise.instructionsId ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-poppins font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Instruksi ID siap
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-poppins font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Perlu teks Indonesia
                                  </span>
                                )}
                              </div>
                            </div>
                            {editingId !== exercise.id && (
                              <button
                                type="button"
                                onClick={() => handleEdit(exercise)}
                                className={`ml-4 shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-poppins font-semibold transition-colors shadow-sm ${
                                  !exercise.instructionsId
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                    : 'bg-accent hover:opacity-95 text-white'
                                }`}
                              >
                                <Languages className="w-4 h-4" aria-hidden />
                                {exercise.instructionsId ? 'Ubah terjemahan' : 'Tambah terjemahan'}
                              </button>
                            )}
                          </div>

                        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                          <p className="text-xs font-poppins font-bold text-gray-600 mb-1 flex items-center gap-1">
                            <span className="uppercase tracking-wide">Referensi asli</span>
                            <span className="font-normal text-gray-500">(tidak diubah; biasanya Inggris)</span>
                          </p>
                          <p className="text-sm text-gray-800 font-poppins leading-relaxed">
                            {exercise.instructions || 'Tidak ada teks referensi di database.'}
                          </p>
                        </div>

                        {editingId === exercise.id ? (
                          <div className="space-y-3 rounded-lg border-2 border-accent/40 bg-amber-50/30 p-3 sm:p-4">
                            <div>
                              <label
                                htmlFor={`translation-${exercise.id}`}
                                className="flex items-center gap-2 text-sm text-gray-900 font-poppins font-bold mb-1"
                              >
                                <Languages className="w-4 h-4 text-accent" aria-hidden />
                                Teks untuk member (Bahasa Indonesia)
                              </label>
                              <p className="text-xs text-gray-600 font-poppins mb-2 leading-relaxed">
                                Isi ini yang akan tampil di aplikasi. Menyimpan tidak mengganti referensi asli di atas—hanya
                                melengkapi kolom terjemahan.
                              </p>
                              <textarea
                                id={`translation-${exercise.id}`}
                                value={editTranslation}
                                onChange={(e) => setEditTranslation(e.target.value)}
                                rows={5}
                                className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent font-poppins text-sm"
                                placeholder="Contoh: Berdiri tegak, kaki selebar bahu. Angkat beban perlahan hingga..."
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSave(exercise.id)}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-all disabled:opacity-50 text-sm font-poppins font-semibold"
                              >
                                {saving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Menyimpan ke database…</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4" />
                                    <span>Simpan terjemahan</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg transition-all text-sm font-poppins font-semibold"
                              >
                                <X className="w-4 h-4" />
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <p className="text-xs font-poppins font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <Languages className="w-3.5 h-3.5 text-accent" aria-hidden />
                              Yang dilihat member (Bahasa Indonesia)
                            </p>
                            <div
                              className={`rounded-md p-2.5 border text-sm font-poppins leading-relaxed ${
                                exercise.instructionsId
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                  : 'bg-amber-50/80 border-amber-200 text-amber-900 italic'
                              }`}
                            >
                              {exercise.instructionsId || (
                                <>
                                  Belum ada. Gunakan tombol <strong className="not-italic">Tambah terjemahan</strong> untuk
                                  mengisi teks Indonesia bagi member.
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
