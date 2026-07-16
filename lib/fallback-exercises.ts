export type FallbackExercise = {
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
}

const baseFallbackExercises: FallbackExercise[] = [
  {
    name: 'Push Up',
    type: 'strength',
    muscle: 'chest',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Posisikan tubuh lurus seperti plank, lalu tekuk siku hingga dada mendekati lantai. Dorong kembali ke posisi awal secara terkontrol.',
  },
  {
    name: 'Dumbbell Bicep Curl',
    type: 'strength',
    muscle: 'biceps',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions:
      'Pegang dumbbell di sisi tubuh. Angkat beban ke arah bahu tanpa menggerakkan siku ke depan, lalu turunkan perlahan.',
  },
  {
    name: 'Triceps Dips (Bench)',
    type: 'strength',
    muscle: 'triceps',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Letakkan tangan di tepi bangku, turunkan tubuh dengan menekuk siku, lalu dorong kembali ke atas.',
  },
  {
    name: 'Bodyweight Squat',
    type: 'strength',
    muscle: 'quadriceps',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Buka kaki selebar bahu, turunkan pinggul seperti duduk, lalu berdiri kembali sambil menjaga punggung tetap netral.',
  },
  {
    name: 'Lat Pulldown',
    type: 'strength',
    muscle: 'lats',
    equipment: 'cable',
    difficulty: 'intermediate',
    instructions:
      'Tarik bar ke arah dada atas sambil menjaga dada terbuka. Kembali ke posisi awal secara perlahan.',
  },
  {
    name: 'Plank',
    type: 'strength',
    muscle: 'abdominals',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Tahan posisi tubuh lurus dengan siku di bawah bahu. Jaga perut aktif dan punggung tidak melengkung.',
  },
  {
    name: 'Dumbbell Shrug',
    type: 'strength',
    muscle: 'traps',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions:
      'Pegang dumbbell di sisi tubuh, angkat bahu ke atas, tahan 1 detik, lalu turunkan perlahan.',
  },
  {
    name: 'Bicycling',
    type: 'cardio',
    muscle: 'cardio',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Berbaring telentang, tangan di belakang kepala, lalu gerakkan kaki seperti mengayuh sepeda, sikut menyentuh lutut berlawanan.',
  },
  {
    name: 'Treadmill',
    type: 'cardio',
    muscle: 'cardio',
    equipment: 'treadmill',
    difficulty: 'beginner',
    instructions:
      'Berjalan atau berlari di treadmill dengan kecepatan yang sesuai kemampuan, jaga postur tubuh tetap tegak.',
  },
  {
    name: 'Incline Push Up',
    type: 'strength',
    muscle: 'chest',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Tempatkan tangan di bangku atau permukaan lebih tinggi. Turunkan dada ke arah bangku lalu dorong kembali ke atas.',
  },
  {
    name: 'Dumbbell Bench Press',
    type: 'strength',
    muscle: 'chest',
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions:
      'Berbaring di bench, dorong dumbbell ke atas hingga lengan lurus, turunkan perlahan sampai siku sekitar 90 derajat.',
  },
  {
    name: 'Cable Chest Fly',
    type: 'strength',
    muscle: 'chest',
    equipment: 'cable',
    difficulty: 'intermediate',
    instructions:
      'Buka tangan dari posisi depan dada lalu satukan kembali dengan gerakan melengkung sambil menjaga siku sedikit menekuk.',
  },
  {
    name: 'Hammer Curl',
    type: 'strength',
    muscle: 'biceps',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions:
      'Pegang dumbbell dengan posisi telapak saling berhadapan, angkat ke arah bahu lalu turunkan perlahan.',
  },
  {
    name: 'Barbell Curl',
    type: 'strength',
    muscle: 'biceps',
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions:
      'Angkat barbell dari paha ke arah dada tanpa mengayun tubuh. Turunkan perlahan hingga posisi awal.',
  },
  {
    name: 'Concentration Curl',
    type: 'strength',
    muscle: 'biceps',
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions:
      'Duduk, tempelkan siku di paha bagian dalam, angkat dumbbell ke atas secara terkontrol lalu turunkan perlahan.',
  },
  {
    name: 'Overhead Triceps Extension',
    type: 'strength',
    muscle: 'triceps',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions:
      'Angkat dumbbell di atas kepala, tekuk siku hingga beban turun di belakang kepala, lalu luruskan siku kembali.',
  },
  {
    name: 'Triceps Pushdown',
    type: 'strength',
    muscle: 'triceps',
    equipment: 'cable',
    difficulty: 'intermediate',
    instructions:
      'Dorong handle kabel ke bawah sampai siku lurus. Kembalikan perlahan sambil menjaga siku tetap dekat tubuh.',
  },
  {
    name: 'Close Grip Push Up',
    type: 'strength',
    muscle: 'triceps',
    equipment: 'body weight',
    difficulty: 'intermediate',
    instructions:
      'Lakukan push up dengan posisi tangan lebih sempit untuk menargetkan triceps, jaga badan tetap lurus.',
  },
  {
    name: 'Lateral Raise',
    type: 'strength',
    muscle: 'traps',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions:
      'Angkat dumbbell ke samping hingga setinggi bahu, turunkan perlahan tanpa mengayun badan.',
  },
  {
    name: 'Upright Row',
    type: 'strength',
    muscle: 'traps',
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: 'Tarik barbell ke atas sepanjang tubuh hingga setinggi dada atas, lalu turunkan perlahan.',
  },
  {
    name: 'Face Pull',
    type: 'strength',
    muscle: 'traps',
    equipment: 'cable',
    difficulty: 'intermediate',
    instructions:
      'Tarik tali kabel ke arah wajah sambil membuka siku ke samping. Fokus pada kontraksi bahu belakang.',
  },
  {
    name: 'Seated Cable Row',
    type: 'strength',
    muscle: 'lats',
    equipment: 'cable',
    difficulty: 'beginner',
    instructions:
      'Tarik handle kabel ke arah perut sambil menjaga dada terbuka. Kembalikan perlahan ke posisi awal.',
  },
  {
    name: 'One Arm Dumbbell Row',
    type: 'strength',
    muscle: 'lats',
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: 'Topang satu tangan di bench, tarik dumbbell ke arah pinggang, lalu turunkan perlahan.',
  },
  {
    name: 'Superman Hold',
    type: 'strength',
    muscle: 'lats',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Berbaring tengkurap, angkat tangan dan kaki dari lantai, tahan beberapa detik lalu lepaskan perlahan.',
  },
  {
    name: 'Walking Lunge',
    type: 'strength',
    muscle: 'quadriceps',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Langkahkan satu kaki ke depan, turunkan lutut belakang mendekati lantai, lalu dorong maju bergantian.',
  },
  {
    name: 'Goblet Squat',
    type: 'strength',
    muscle: 'quadriceps',
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions:
      'Pegang dumbbell di depan dada, lakukan squat dengan punggung netral, lalu berdiri kembali.',
  },
  {
    name: 'Leg Press',
    type: 'strength',
    muscle: 'quadriceps',
    equipment: 'machine',
    difficulty: 'intermediate',
    instructions:
      'Dorong platform dengan telapak kaki hingga lutut hampir lurus, lalu turunkan secara terkontrol.',
  },
  {
    name: 'Leg Extension',
    type: 'strength',
    muscle: 'quadriceps',
    equipment: 'machine',
    difficulty: 'beginner',
    instructions:
      'Duduk di mesin leg extension, luruskan lutut hingga kaki hampir sejajar lantai, lalu turunkan perlahan.',
  },
  {
    name: 'Crunch',
    type: 'strength',
    muscle: 'abdominals',
    equipment: 'body weight',
    difficulty: 'beginner',
    instructions:
      'Berbaring telentang, tekuk lutut, angkat bahu dari lantai dengan kontraksi perut, lalu turunkan perlahan.',
  },
  {
    name: 'Leg Raise',
    type: 'strength',
    muscle: 'abdominals',
    equipment: 'body weight',
    difficulty: 'intermediate',
    instructions:
      'Angkat kedua kaki lurus ke atas lalu turunkan perlahan tanpa menyentuh lantai untuk menjaga ketegangan perut.',
  },
  {
    name: 'Russian Twist',
    type: 'strength',
    muscle: 'abdominals',
    equipment: 'body weight',
    difficulty: 'intermediate',
    instructions:
      'Duduk dengan lutut menekuk, condongkan badan sedikit ke belakang, putar badan kanan-kiri secara bergantian.',
  },
  {
    name: 'Bicycle Crunch',
    type: 'strength',
    muscle: 'abdominals',
    equipment: 'body weight',
    difficulty: 'intermediate',
    instructions:
      'Gerakkan siku dan lutut berlawanan secara bergantian seperti mengayuh sepeda sambil menjaga core aktif.',
  },

]

function buildTemplateInstruction(
  muscleLabel: string,
  equipment: string,
  level: string
) {
  return `Fokuskan kontraksi pada area ${muscleLabel} dengan tempo terkontrol. Gunakan ${equipment} sesuai kemampuan, jaga teknik tetap rapi, dan sesuaikan beban pada level ${level}.`
}

const generatedVariantExercises: FallbackExercise[] = [
  // Chest variants
  'Incline Barbell Press',
  'Decline Push Up',
  'Pec Deck Machine Fly',
  'Single Arm Cable Fly',
  'Floor Dumbbell Press',
  'Wide Push Up',
  'Paused Push Up',
  'Resistance Band Chest Press',
  'Neutral Grip Dumbbell Press',
].map((name, idx) => ({
  name,
  type: 'strength',
  muscle: 'chest',
  equipment: idx % 3 === 0 ? 'barbell' : idx % 3 === 1 ? 'body weight' : 'cable',
  difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
  instructions: buildTemplateInstruction('dada', idx % 3 === 0 ? 'barbell' : idx % 3 === 1 ? 'berat badan' : 'kabel', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
}))
  // Biceps variants
  .concat(
    [
      'EZ Bar Curl',
      'Alternating Dumbbell Curl',
      'Spider Curl',
      'Preacher Curl',
      'Cable Biceps Curl',
      'Incline Dumbbell Curl',
      'Reverse Curl',
      'Zottman Curl',
      'Standing Band Curl',
    ].map((name, idx) => ({
      name,
      type: 'strength',
      muscle: 'biceps',
      equipment: idx % 3 === 0 ? 'barbell' : idx % 3 === 1 ? 'dumbbell' : 'cable',
      difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
      instructions: buildTemplateInstruction('biceps', idx % 3 === 0 ? 'barbell' : idx % 3 === 1 ? 'dumbbell' : 'kabel', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
    }))
  )
  // Triceps variants
  .concat(
    [
      'Bench Dip',
      'Diamond Push Up',
      'Cable Overhead Extension',
      'Rope Triceps Pushdown',
      'Single Arm Triceps Kickback',
      'Skull Crusher',
      'Close Grip Bench Press',
      'Bodyweight Triceps Extension',
      'Band Triceps Pressdown',
    ].map((name, idx) => ({
      name,
      type: 'strength',
      muscle: 'triceps',
      equipment: idx % 3 === 0 ? 'body weight' : idx % 3 === 1 ? 'cable' : 'dumbbell',
      difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
      instructions: buildTemplateInstruction('triceps', idx % 3 === 0 ? 'berat badan' : idx % 3 === 1 ? 'kabel' : 'dumbbell', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
    }))
  )
  // Traps / shoulders variants
  .concat(
    [
      'Arnold Press',
      'Standing Dumbbell Press',
      'Machine Shoulder Press',
      'Cable Lateral Raise',
      'Rear Delt Fly',
      'Barbell Shrug',
      'Plate Front Raise',
      'Kettlebell Press',
      'Band Face Pull',
    ].map((name, idx) => ({
      name,
      type: 'strength',
      muscle: 'traps',
      equipment: idx % 3 === 0 ? 'dumbbell' : idx % 3 === 1 ? 'machine' : 'cable',
      difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
      instructions: buildTemplateInstruction('bahu dan traps', idx % 3 === 0 ? 'dumbbell' : idx % 3 === 1 ? 'mesin' : 'kabel', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
    }))
  )
  // Lats / back variants
  .concat(
    [
      'Assisted Pull Up',
      'Chin Up',
      'T Bar Row',
      'Bent Over Barbell Row',
      'Chest Supported Row',
      'Straight Arm Pulldown',
      'Inverted Row',
      'Band Lat Pulldown',
      'Single Arm Cable Row',
    ].map((name, idx) => ({
      name,
      type: 'strength',
      muscle: 'lats',
      equipment: idx % 3 === 0 ? 'machine' : idx % 3 === 1 ? 'barbell' : 'cable',
      difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
      instructions: buildTemplateInstruction('punggung (lats)', idx % 3 === 0 ? 'mesin' : idx % 3 === 1 ? 'barbell' : 'kabel', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
    }))
  )
  // Quadriceps / legs variants
  .concat(
    [
      'Split Squat',
      'Bulgarian Split Squat',
      'Front Squat',
      'Hack Squat',
      'Step Up',
      'Wall Sit',
      'Jump Squat',
      'Weighted Jump Squat',
      'Sissy Squat',
      'Smith Machine Squat',
    ].map((name, idx) => ({
      name,
      type: 'strength',
      muscle: 'quadriceps',
      equipment: idx % 3 === 0 ? 'body weight' : idx % 3 === 1 ? 'barbell' : 'machine',
      difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
      instructions: buildTemplateInstruction('kaki bagian depan (quadriceps)', idx % 3 === 0 ? 'berat badan' : idx % 3 === 1 ? 'barbell' : 'mesin', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
    }))
  )
  // Abdominals variants
  .concat(
    [
      'Dead Bug',
      'Hollow Body Hold',
      'Toe Touch Crunch',
      'Side Plank',
      'Reverse Crunch',
      'V Up',
      'Flutter Kick',
      'Seated Knee Tuck',
      'Cable Crunch',
    ].map((name, idx) => ({
      name,
      type: 'strength',
      muscle: 'abdominals',
      equipment: idx % 3 === 0 ? 'body weight' : idx % 3 === 1 ? 'mat' : 'cable',
      difficulty: idx < 3 ? 'beginner' : idx < 7 ? 'intermediate' : 'expert',
      instructions: buildTemplateInstruction('otot perut', idx % 3 === 0 ? 'berat badan' : idx % 3 === 1 ? 'matras' : 'kabel', idx < 3 ? 'pemula' : idx < 7 ? 'menengah' : 'lanjutan'),
    }))
  )


export const fallbackExercises: FallbackExercise[] = [
  ...baseFallbackExercises,
  ...generatedVariantExercises,
]

export function resolveMuscleAlias(muscle: string | null) {
  if (!muscle) return null
  const m = muscle.toLowerCase()
  const aliasMap: Record<string, string> = {
    shoulders: 'traps',
    shoulder: 'traps',
    back: 'lats',
    legs: 'quadriceps',
    abs: 'abdominals',
  }
  return aliasMap[m] || m
}
