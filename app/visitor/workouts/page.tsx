'use client'

import { useCallback, useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import {
  Dumbbell,
  Target,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  Award,
  TrendingUp,
  Activity,
  Info,
  CheckCircle2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Undo2,
  History,
  UserCheck,
} from 'lucide-react'
import { useVisitorProfile } from '@/contexts/visitor-profile-context'
import { usePathname, useRouter } from 'next/navigation'
import { WorkoutHistorySection } from '@/components/visitor/WorkoutHistorySection'
import { loadSchedulesJsonForUser, workoutSchedulesStorageKey } from '@/lib/workout-schedule-storage'
import { curateExercisesForManualMethod } from '@/lib/workout-method-curate'
import {
  activityLoggedKey,
  pruneActivityLoggedKeys,
  workoutRecommendStorageKey,
  type WorkoutRecommendationPersisted,
} from '@/lib/workout-recommendation-persist'

interface Exercise {
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
  imageUrl?: string
  /** Semua foto dari dataset (jika ada), urutan sama seperti free-exercise-db */
  imageUrls?: string[]
  recommendation?: {
    goal: 'bulking' | 'cutting' | 'maintain'
    repRange: string
    setRange: string
    restSeconds: string
    focus: string
  }
}

function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mapping latihan ke video YouTube (durasi mulai & selesai dalam detik)
const EXERCISE_VIDEO_MAP: Record<string, { videoId: string; startSeconds: number; endSeconds: number }> = {
  'Barbell Bench Press - Medium Grip': {
    videoId: 'XjrsqShr-Ic',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'barbell bench press - medium grip': {
    videoId: 'XjrsqShr-Ic',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Barbell Curl': {
    videoId: 'OTnpHe1zDrw',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'barbell curl': {
    videoId: 'OTnpHe1zDrw',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'EZ Bar Curl': {
    videoId: 'JhDDKwag2vE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'ez bar curl': {
    videoId: 'JhDDKwag2vE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'EZ-Bar Curl': {
    videoId: 'JhDDKwag2vE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'ez-bar curl': {
    videoId: 'JhDDKwag2vE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Incline Hammer Curl': {
    videoId: 'Z7gLnOCO89c',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'incline hammer curl': {
    videoId: 'Z7gLnOCO89c',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Incline Hammer Curls': {
    videoId: 'Z7gLnOCO89c',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'incline hammer curls': {
    videoId: 'Z7gLnOCO89c',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Flexor Incline Dumbbell Curls': {
    videoId: 'aFdcalu6-c8',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'flexor incline dumbbell curls': {
    videoId: 'aFdcalu6-c8',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Zottman Curl': {
    videoId: '5Go_uOTnFl0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'zottman curl': {
    videoId: '5Go_uOTnFl0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Zottman Curls': {
    videoId: '5Go_uOTnFl0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'zottman curls': {
    videoId: '5Go_uOTnFl0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Hammer Curls': {
    videoId: 'jdYGDzCuGE4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'hammer curls': {
    videoId: 'jdYGDzCuGE4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Hammer Curl': {
    videoId: 'jdYGDzCuGE4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'hammer curl': {
    videoId: 'jdYGDzCuGE4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Dumbbell Bench Press': {
    videoId: 'O7ECGhZj_Hc',
    startSeconds: 0, // dari awal
    endSeconds: 9999,  // sampai akhir (nilai besar agar tidak terpotong)
  },
  'Dumbbell Flyes': {
    videoId: '1ezRy5FcvwY',
    startSeconds: 0, // dari awal
    endSeconds: 9999,  // sampai akhir
  },
  'Pushups': {
    videoId: 'tsgFdmTwML8',
    startSeconds: 0, // dari awal
    endSeconds: 9999,  // sampai akhir
  },
  'Push-Up Wide': {
    videoId: 'tsgFdmTwML8',
    startSeconds: 0, // dari awal
    endSeconds: 9999,  // sampai akhir
  },
  'Cable Crossover': {
    videoId: '_7GPAajPl0g',
    startSeconds: 90, // 01:30
    endSeconds: 150,  // 02:30
  },
  'Jump Squat': {
    videoId: '0pTBkUPuMkk',
    startSeconds: 0, // dari awal
    endSeconds: 9999,  // sampai akhir
  },
  'Weighted Jump Squat': {
    videoId: '0pTBkUPuMkk',
    startSeconds: 0, // dari awal
    endSeconds: 9999,  // sampai akhir
  },
  'weighted jump squat': {
    videoId: '0pTBkUPuMkk',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Barbell Full Squat': {
    videoId: 'dW3zj79xfrc',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'barbell full squat': {
    videoId: 'dW3zj79xfrc',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Dumbbell Squat': {
    videoId: 'cuUPtfanAFQ',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'dumbbell squat': {
    videoId: 'cuUPtfanAFQ',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Cocoons': {
    videoId: 'Jy1I3Cm_s7E',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'cocoons': {
    videoId: 'Jy1I3Cm_s7E',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Bottoms Up': {
    videoId: 'acj52MXBaeo',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'bottoms up': {
    videoId: 'acj52MXBaeo',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Cross-Body Crunch': {
    videoId: 'BdjpCUEKlPo',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'cross-body crunch': {
    videoId: 'BdjpCUEKlPo',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Spider Crawl': {
    videoId: 'V9YlOlil4GE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'spider crawl': {
    videoId: 'V9YlOlil4GE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Bicycling': {
    videoId: 'WMCoXVLyt-E',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'bicycling': {
    videoId: 'WMCoXVLyt-E',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Treadmill': {
    videoId: '',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'treadmill': {
    videoId: '',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Wide Grip Decline Barbell Bench Press': {
    videoId: 'a-UFQE4oxWY',
    startSeconds: 0, // dari awal
    endSeconds: 9999, // sampai akhir
  },
  'Wide-Grip Decline Barbell Bench Press': {
    videoId: 'a-UFQE4oxWY',
    startSeconds: 0, // dari awal
    endSeconds: 9999, // sampai akhir
  },
  'Close Grip Bench Press': {
    videoId: '6zWoAllRufg',
    startSeconds: 0, // dari awal
    endSeconds: 9999, // sampai akhir
  },
  'Close-Grip Bench Press': {
    videoId: '6zWoAllRufg',
    startSeconds: 0, // dari awal
    endSeconds: 9999, // sampai akhir
  },
  'Close Grip Barbell Bench Press': {
    videoId: '6zWoAllRufg',
    startSeconds: 0, // dari awal
    endSeconds: 9999, // sampai akhir
  },
  'Close-Grip Barbell Bench Press': {
    videoId: '6zWoAllRufg',
    startSeconds: 0, // dari awal
    endSeconds: 9999, // sampai akhir
  },
  'Reverse Grip Triceps Pushdown': {
    videoId: '_EuYEt1lNYw',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'reverse grip triceps pushdown': {
    videoId: '_EuYEt1lNYw',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Reverse-Grip Triceps Pushdown': {
    videoId: '_EuYEt1lNYw',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'reverse-grip triceps pushdown': {
    videoId: '_EuYEt1lNYw',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Weighted Bench Dip': {
    videoId: '4ua3MzaU0QU',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'weighted bench dip': {
    videoId: '4ua3MzaU0QU',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Weighted Bench Dips': {
    videoId: '4ua3MzaU0QU',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'weighted bench dips': {
    videoId: '4ua3MzaU0QU',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'EZ-Bar Skullcrusher': {
    videoId: 'K3mFeNz4e3w',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'ez-bar skullcrusher': {
    videoId: 'K3mFeNz4e3w',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'EZ Bar Skullcrusher': {
    videoId: 'K3mFeNz4e3w',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'ez bar skullcrusher': {
    videoId: 'K3mFeNz4e3w',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'EZ-Bar Skull Crushers': {
    videoId: 'K3mFeNz4e3w',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'ez-bar skull crushers': {
    videoId: 'K3mFeNz4e3w',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Triceps Pushdown - Rope Attachment': {
    videoId: 'u36jNfqh8_U',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'triceps pushdown - rope attachment': {
    videoId: 'u36jNfqh8_U',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Triceps Pushdown Rope Attachment': {
    videoId: 'u36jNfqh8_U',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'triceps pushdown rope attachment': {
    videoId: 'u36jNfqh8_U',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Rope Triceps Pushdown': {
    videoId: 'u36jNfqh8_U',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'rope triceps pushdown': {
    videoId: 'u36jNfqh8_U',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Seated Triceps Press': {
    videoId: 'GoFAKhm_Pw4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'seated triceps press': {
    videoId: 'GoFAKhm_Pw4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Seated Tricep Press': {
    videoId: 'GoFAKhm_Pw4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'seated tricep press': {
    videoId: 'GoFAKhm_Pw4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Decline Close-Grip Bench To Skull Crusher': {
    videoId: 'tpga2WowwAE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'decline close-grip bench to skull crusher': {
    videoId: 'tpga2WowwAE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Decline Close Grip Bench To Skull Crusher': {
    videoId: 'tpga2WowwAE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'decline close grip bench to skull crusher': {
    videoId: 'tpga2WowwAE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Standing dumbbell upright row': {
    videoId: 'AWsGWt-VMl8',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'standing dumbbell upright row': {
    videoId: 'AWsGWt-VMl8',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Standing Dumbbell Upright Row': {
    videoId: 'AWsGWt-VMl8',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'standing dumbbell upright rows': {
    videoId: 'AWsGWt-VMl8',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Leverage shrug': {
    videoId: 'rFsSeClGnNA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'leverage shrug': {
    videoId: 'rFsSeClGnNA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Leverage Shrug': {
    videoId: 'rFsSeClGnNA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'leverage shrugs': {
    videoId: 'rFsSeClGnNA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Muscle up': {
    videoId: 'JMf9uXBdebA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'muscle up': {
    videoId: 'JMf9uXBdebA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Muscle Up': {
    videoId: 'JMf9uXBdebA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'muscle ups': {
    videoId: 'JMf9uXBdebA',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Shotgun row': {
    videoId: 'exK_i2E_qik',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'shotgun row': {
    videoId: 'exK_i2E_qik',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Shotgun Row': {
    videoId: 'exK_i2E_qik',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'shotgun rows': {
    videoId: 'exK_i2E_qik',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Close-grip front lat pulldown': {
    videoId: 'jXRxMJhOCc0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'close-grip front lat pulldown': {
    videoId: 'jXRxMJhOCc0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Close-Grip Front Lat Pulldown': {
    videoId: 'jXRxMJhOCc0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'close grip front lat pulldown': {
    videoId: 'jXRxMJhOCc0',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Pullup': {
    videoId: 'eDP_OOhMTZ4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'pullup': {
    videoId: 'eDP_OOhMTZ4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Pull-up': {
    videoId: 'eDP_OOhMTZ4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'pull-ups': {
    videoId: 'eDP_OOhMTZ4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Pullups': {
    videoId: 'eDP_OOhMTZ4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'pullups': {
    videoId: 'eDP_OOhMTZ4',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Rocky Pull-Ups/Pulldowns': {
    videoId: 'Bu0_3Vnk9Gs',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'rocky pull-ups/pulldowns': {
    videoId: 'Bu0_3Vnk9Gs',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Rocky Pullups/Pulldowns': {
    videoId: 'Bu0_3Vnk9Gs',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'rocky pullups/pulldowns': {
    videoId: 'Bu0_3Vnk9Gs',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Barbell Walking Lunge': {
    videoId: 'La8YR6wCsEE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'barbell walking lunge': {
    videoId: 'La8YR6wCsEE',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Front Squats with Two Kettlebells': {
    videoId: 'yv1Nygxx7rk',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'front squats with two kettlebells': {
    videoId: 'yv1Nygxx7rk',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'Kettlebell Pistol Squat': {
    videoId: 'jjoxNmFfl3Y',
    startSeconds: 0,
    endSeconds: 9999,
  },
  'kettlebell pistol squat': {
    videoId: 'jjoxNmFfl3Y',
    startSeconds: 0,
    endSeconds: 9999,
  },
}

// Helper function to get or generate weight recommendation
function getWeightRecommendation(exercise: { name: string; muscle: string; equipment: string; difficulty: string }) {
  // Check if we have an explicit recommendation
  const normalizedName = normalizeExerciseName(exercise.name);
  if (EXERCISE_WEIGHT_RECOMMENDATION[exercise.name] || EXERCISE_WEIGHT_RECOMMENDATION[normalizedName]) {
    return EXERCISE_WEIGHT_RECOMMENDATION[exercise.name] || EXERCISE_WEIGHT_RECOMMENDATION[normalizedName];
  }

  // Generate a default recommendation based on muscle, equipment, etc.
  const muscle = exercise.muscle.toLowerCase();
  const equipment = exercise.equipment.toLowerCase();
  const name = exercise.name.toLowerCase();
  
  let beginner: string;
  let intermediate: string;
  let expert: string;
  let tips: string;

  // Handle bodyweight exercises first
  if (equipment.includes('body weight') || equipment.includes('bodyweight') || equipment.includes('none')) {
    if (muscle.includes('chest') || muscle.includes('dada') || name.includes('push') || name.includes('press')) {
      beginner = 'Pushup biasa di lantai';
      intermediate = 'Pushup dengan kaki ditinggikan di bangku';
      expert = 'Pushup dengan beban 5-10 kg di punggung';
      tips = 'Pastikan punggung tetap lurus dan pinggang tidak turun!';
    } else if (muscle.includes('leg') || muscle.includes('quad') || muscle.includes('kaki') || muscle.includes('glut') || muscle.includes('hamstring') || muscle.includes('calf') || name.includes('squat') || name.includes('lunge') || name.includes('deadlift')) {
      beginner = 'Bodyweight squat / lunge biasa';
      intermediate = 'Squat dengan dumbbell 5-10 kg masing-masing tangan';
      expert = 'Jump squat / pistol squat atau barbell squat 40-60 kg';
      tips = 'Pastikan lutut tidak melewati ujung kaki!';
    } else if (muscle.includes('abs') || muscle.includes('abdominal') || muscle.includes('perut') || name.includes('crunch') || name.includes('plank')) {
      beginner = 'Crunch atau plank 30 detik';
      intermediate = 'Leg raise atau Russian twist';
      expert = 'Hanging leg raise atau L-sit hold';
      tips = 'Fokus pada kontraksi otot perut, bukan gerakan pinggang!';
    } else if (muscle.includes('back') || muscle.includes('lat') || name.includes('row') || name.includes('pull')) {
      beginner = 'Superman hold atau inverted row dengan kaki di lantai';
      intermediate = 'Inverted row dengan kaki ditinggikan';
      expert = 'Pull-up (dengan bantuan jika perlu)';
      tips = 'Jaga punggung tetap lurus dan tarik dengan siku!';
    } else if (muscle.includes('bicep') || name.includes('curl')) {
      beginner = 'Bicep curl dengan dumbbell 2-5 kg masing-masing';
      intermediate = 'Hammer curl dengan dumbbell 5-10 kg masing-masing';
      expert = 'Concentration curl dengan dumbbell 10-15 kg';
      tips = 'Fokus pada kontrol gerakan dan kontraksi otot!';
    } else if (muscle.includes('tricep') || name.includes('dip') || name.includes('extension')) {
      beginner = 'Tricep dip di bangku';
      intermediate = 'Close-grip pushup atau tricep extension dumbbell 3-8 kg';
      expert = 'Diamond pushup atau tricep pushdown 15-25 kg';
      tips = 'Fokus pada kontrol gerakan dan kontraksi otot!';
    } else if (muscle.includes('shoulder') || muscle.includes('trap') || name.includes('press') || name.includes('raise')) {
      beginner = 'Arm circles atau plank shoulder tap';
      intermediate = 'Pike pushup atau lateral raise dumbbell 2-5 kg';
      expert = 'Handstand hold (dinding sebagai bantuan) atau overhead press 15-25 kg';
      tips = 'Jangan memaksa gerakan jika terasa nyeri di bahu!';
    } else {
      beginner = 'Lakukan gerakan dengan beban tubuh sendiri';
      intermediate = 'Tambahkan variasi yang lebih menantang';
      expert = 'Tambahkan beban eksternal (misal: dumbbell 5-10 kg)';
      tips = 'Selalu prioritaskan teknik yang benar sebelum menambah kesulitan!';
    }
  } else if (equipment.includes('dumbbell')) {
    if (muscle.includes('chest') || name.includes('bench') || name.includes('fly')) {
      beginner = 'Dumbbell 3-6 kg (setiap tangan)';
      intermediate = 'Dumbbell 8-14 kg (setiap tangan)';
      expert = 'Dumbbell >16 kg (setiap tangan)';
      tips = 'Mulai dengan beban yang memungkinkan Anda melakukan 3 set 10-12 repetisi dengan teknik benar!';
    } else if (muscle.includes('shoulder') || name.includes('press') || name.includes('raise')) {
      beginner = 'Dumbbell 2-5 kg (setiap tangan)';
      intermediate = 'Dumbbell 6-12 kg (setiap tangan)';
      expert = 'Dumbbell >14 kg (setiap tangan)';
      tips = 'Pastikan gerakan terkontrol dan hindari momentum!';
    } else if (muscle.includes('back') || name.includes('row')) {
      beginner = 'Dumbbell 4-8 kg (setiap tangan)';
      intermediate = 'Dumbbell 10-16 kg (setiap tangan)';
      expert = 'Dumbbell >20 kg (setiap tangan)';
      tips = 'Jaga punggung tetap lurus dan tarik dengan siku!';
    } else if (muscle.includes('leg') || muscle.includes('quad') || name.includes('squat') || name.includes('lunge')) {
      beginner = 'Dumbbell 5-10 kg (setiap tangan)';
      intermediate = 'Dumbbell 12-18 kg (setiap tangan)';
      expert = 'Dumbbell >20 kg (setiap tangan)';
      tips = 'Pastikan lutut tidak melewati ujung kaki!';
    } else {
      beginner = 'Dumbbell 2-5 kg (setiap tangan)';
      intermediate = 'Dumbbell 8-15 kg (setiap tangan)';
      expert = 'Dumbbell >15 kg (setiap tangan)';
      tips = 'Mulai dengan beban yang memungkinkan Anda melakukan 3 set 10-12 repetisi dengan teknik benar!';
    }
  } else if (equipment.includes('barbell')) {
    if (name.includes('bench') && (muscle.includes('chest'))) {
      beginner = 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)';
      intermediate = 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)';
      expert = 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)';
      tips = 'Pastikan Anda memiliki spotter ketika mencoba beban baru yang berat! Mulai dari beban teringan yang memungkinkan Anda melakukan gerakan dengan benar!';
    } else if (name.includes('squat') || name.includes('lunge') || name.includes('deadlift')) {
      beginner = 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)';
      intermediate = 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)';
      expert = 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)';
      tips = 'Pastikan lutut tidak melewati ujung kaki dan punggung tetap lurus!';
    } else if (name.includes('curl') || muscle.includes('bicep')) {
      beginner = 'Barbell kosong (20 kg) atau EZ-bar kosong';
      intermediate = 'Barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg) atau EZ-bar + 2.5 kg plate di masing-masing sisi';
      expert = 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg+) atau EZ-bar + 5-7.5 kg plate di masing-masing sisi';
      tips = 'Jangan menggunakan momentum, fokus pada kontraksi bicep! Jaga siku tetap dekat dengan badan!';
    } else if (name.includes('row') || muscle.includes('back')) {
      beginner = 'Barbell kosong (20 kg)';
      intermediate = 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)';
      expert = 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)';
      tips = 'Jaga punggung tetap lurus dan tarik dengan siku!';
    } else if (name.includes('press') || muscle.includes('shoulder')) {
      beginner = 'Barbell kosong (20 kg)';
      intermediate = 'Barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)';
      expert = 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg+)';
      tips = 'Pastikan gerakan terkontrol dan hindari momentum!';
    } else {
      beginner = 'Barbell kosong (20 kg)';
      intermediate = 'Barbell 20 kg + 5 kg plate di masing-masing sisi (total 30 kg)';
      expert = 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)';
      tips = 'Pastikan Anda memiliki spotter ketika mencoba beban baru yang berat!';
    }
  } else if (equipment.includes('cable') || equipment.includes('machine')) {
    beginner = 'Settingan paling ringan atau piringan beban 5-10 kg (total)';
    intermediate = 'Piringan beban 15-20 kg (total)';
    expert = 'Piringan beban >25 kg (total)';
    tips = 'Sesuaikan beban sehingga Anda bisa menyelesaikan set dengan kontrol penuh!';
  } else if (equipment.includes('kettlebell')) {
    beginner = 'Kettlebell 4-6 kg';
    intermediate = 'Kettlebell 8-12 kg';
    expert = 'Kettlebell >16 kg';
    tips = 'Pastikan grip Anda kuat dan gerakan terkontrol!';
  } else {
    beginner = 'Mulai dari beban/intensitas terendah';
    intermediate = 'Tingkatkan beban/intensitas secara bertahap';
    expert = 'Gunakan beban maksimal yang masih memungkinkan teknik benar';
    tips = 'Selalu prioritaskan teknik yang benar sebelum menambah beban!';
  }

  return { beginner, intermediate, expert, tips };
}

// Mapping rekomendasi beban untuk pemula
const EXERCISE_WEIGHT_RECOMMENDATION: Record<string, {
  beginner: string;
  intermediate: string;
  expert: string;
  tips: string;
}> = {
  'Barbell Bench Press - Medium Grip': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 7.5 kg plate di masing-masing sisi (total 35 kg) atau barbell 20 kg + 10 kg plate di masing-masing sisi (total 40 kg)',
    expert: 'Barbell 20 kg + 15 kg plate di masing-masing sisi (total 50 kg) atau lebih',
    tips: 'Mulai dari beban teringan yang memungkinkan Anda melakukan gerakan dengan benar! Tambah beban secara bertahap (2.5-5 kg per sisi) jika Anda bisa menyelesaikan 3 set 10-12 repetisi dengan mudah. Gunakan spotter!',
  },
  'Barbell Curl': {
    beginner: 'Barbell kosong (20 kg) atau EZ-bar kosong',
    intermediate: 'Barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg) atau EZ-bar + 2.5 kg plate di masing-masing sisi',
    expert: 'Barbell 20 kg + 5 kg plate di masing-masing sisi (total 30 kg) atau EZ-bar + 5 kg plate di masing-masing sisi',
    tips: 'Jangan menggunakan momentum, fokus pada kontraksi bicep! Jaga siku tetap dekat dengan badan!',
  },
  'barbell curl': {
    beginner: 'Barbell kosong (20 kg) atau EZ-bar kosong',
    intermediate: 'Barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg) atau EZ-bar + 2.5 kg plate di masing-masing sisi',
    expert: 'Barbell 20 kg + 5 kg plate di masing-masing sisi (total 30 kg) atau EZ-bar + 5 kg plate di masing-masing sisi',
    tips: 'Jangan menggunakan momentum, fokus pada kontraksi bicep! Jaga siku tetap dekat dengan badan!',
  },
  'EZ Bar Curl': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 5-7.5 kg plate di masing-masing sisi',
    tips: 'Grip pada bagian zig-zag untuk mengurangi tekanan pada pergelangan tangan! Jangan menggunakan momentum!',
  },
  'ez bar curl': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 5-7.5 kg plate di masing-masing sisi',
    tips: 'Grip pada bagian zig-zag untuk mengurangi tekanan pada pergelangan tangan! Jangan menggunakan momentum!',
  },
  'EZ-Bar Curl': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 5-7.5 kg plate di masing-masing sisi',
    tips: 'Grip pada bagian zig-zag untuk mengurangi tekanan pada pergelangan tangan! Jangan menggunakan momentum!',
  },
  'ez-bar curl': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 5-7.5 kg plate di masing-masing sisi',
    tips: 'Grip pada bagian zig-zag untuk mengurangi tekanan pada pergelangan tangan! Jangan menggunakan momentum!',
  },
  'Incline Hammer Curls': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-10 kg (setiap tangan)',
    expert: 'Dumbbell >12 kg (setiap tangan)',
    tips: 'Duduk di bangku incline (45 derajat), jaga punggung tetap lurus! Gerakan terkontrol tanpa momentum!',
  },
  'incline hammer curls': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-10 kg (setiap tangan)',
    expert: 'Dumbbell >12 kg (setiap tangan)',
    tips: 'Duduk di bangku incline (45 derajat), jaga punggung tetap lurus! Gerakan terkontrol tanpa momentum!',
  },
  'Incline Hammer Curl': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-10 kg (setiap tangan)',
    expert: 'Dumbbell >12 kg (setiap tangan)',
    tips: 'Duduk di bangku incline (45 derajat), jaga punggung tetap lurus! Gerakan terkontrol tanpa momentum!',
  },
  'incline hammer curl': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-10 kg (setiap tangan)',
    expert: 'Dumbbell >12 kg (setiap tangan)',
    tips: 'Duduk di bangku incline (45 derajat), jaga punggung tetap lurus! Gerakan terkontrol tanpa momentum!',
  },
  'Flexor Incline Dumbbell Curls': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Fokus pada kontraksi brachialis (otot di bawah bicep)! Gerakan lambat dan terkontrol!',
  },
  'flexor incline dumbbell curls': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Fokus pada kontraksi brachialis (otot di bawah bicep)! Gerakan lambat dan terkontrol!',
  },
  'Zottman Curl': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Putar pergelangan tangan di puncak gerakan (telapak tangan ke bawah)! Latihan ini gabung bicep dan forearms!',
  },
  'zottman curl': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Putar pergelangan tangan di puncak gerakan (telapak tangan ke bawah)! Latihan ini gabung bicep dan forearms!',
  },
  'Zottman Curls': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Putar pergelangan tangan di puncak gerakan (telapak tangan ke bawah)! Latihan ini gabung bicep dan forearms!',
  },
  'zottman curls': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Putar pergelangan tangan di puncak gerakan (telapak tangan ke bawah)! Latihan ini gabung bicep dan forearms!',
  },
  'Hammer Curls': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Grip hammer (telapak tangan saling menghadap)! Fokus pada brachialis dan brachioradialis!',
  },
  'hammer curls': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Grip hammer (telapak tangan saling menghadap)! Fokus pada brachialis dan brachioradialis!',
  },
  'Hammer Curl': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Grip hammer (telapak tangan saling menghadap)! Fokus pada brachialis dan brachioradialis!',
  },
  'hammer curl': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Grip hammer (telapak tangan saling menghadap)! Fokus pada brachialis dan brachioradialis!',
  },
  'Dumbbell Bench Press': {
    beginner: 'Dumbbell 2-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 8-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Pastikan kedua tangan memegang beban yang sama berat! Fokus pada kontrol gerakan, bukan kecepatan.',
  },
  'Dumbbell Flyes': {
    beginner: 'Dumbbell 2-4 kg (setiap tangan)',
    intermediate: 'Dumbbell 5-8 kg (setiap tangan)',
    expert: 'Dumbbell >10 kg (setiap tangan)',
    tips: 'Jangan terlalu menekan lengan ke bawah! Fokus pada perasaan regangan di bagian dada.',
  },
  'Pushups': {
    beginner: 'Pushup biasa di lantai',
    intermediate: 'Pushup dengan kaki ditinggikan di bangku',
    expert: 'Pushup dengan beban di punggung (misal: piring dumbbell)',
    tips: 'Pastikan punggung tetap lurus dan pinggang tidak turun!',
  },
  'Push-Up Wide': {
    beginner: 'Pushup wide biasa di lantai',
    intermediate: 'Pushup wide dengan kaki ditinggikan di bangku',
    expert: 'Pushup wide dengan beban di punggung',
    tips: 'Lebar tangan sekitar 1,5 kali lebar bahu untuk target dada lebih banyak!',
  },
  'Cable Crossover': {
    beginner: 'Piringan beban 5-10 kg (setiap sisi)',
    intermediate: 'Piringan beban 15-20 kg (setiap sisi)',
    expert: 'Piringan beban >25 kg (setiap sisi)',
    tips: 'Pastikan gerakan terkontrol dan fokus pada regangan di dada!',
  },
  'Barbell Walking Lunge': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)',
    expert: 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)',
    tips: 'Pastikan lutut tidak melewati ujung kaki dan langkah konsisten!',
  },
  'barbell walking lunge': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)',
    expert: 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)',
    tips: 'Pastikan lutut tidak melewati ujung kaki dan langkah konsisten!',
  },
  'Barbell Squat': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)',
    expert: 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)',
    tips: 'Pastikan lutut tidak melewati ujung kaki dan punggung tetap lurus!',
  },
  'Barbell Deadlift': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)',
    expert: 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)',
    tips: 'Pastikan punggung tetap lurus dan angkat dengan kaki!',
  },
  'Front Squats with Two Kettlebells': {
    beginner: 'Kettlebell 4-6 kg (setiap tangan)',
    intermediate: 'Kettlebell 8-12 kg (setiap tangan)',
    expert: 'Kettlebell >16 kg (setiap tangan)',
    tips: 'Pastikan punggung tetap lurus, dada terbuka, dan lutut tidak melewati ujung kaki!',
  },
  'front squats with two kettlebells': {
    beginner: 'Kettlebell 4-6 kg (setiap tangan)',
    intermediate: 'Kettlebell 8-12 kg (setiap tangan)',
    expert: 'Kettlebell >16 kg (setiap tangan)',
    tips: 'Pastikan punggung tetap lurus, dada terbuka, dan lutut tidak melewati ujung kaki!',
  },
  'Kettlebell Pistol Squat': {
    beginner: 'Kettlebell 4-6 kg (satu tangan) atau bodyweight saja',
    intermediate: 'Kettlebell 8-12 kg (satu tangan)',
    expert: 'Kettlebell >16 kg (satu tangan)',
    tips: 'Pastikan keseimbangan, lutut tidak melewati ujung kaki, dan kontrol gerakan secara perlahan!',
  },
  'kettlebell pistol squat': {
    beginner: 'Kettlebell 4-6 kg (satu tangan) atau bodyweight saja',
    intermediate: 'Kettlebell 8-12 kg (satu tangan)',
    expert: 'Kettlebell >16 kg (satu tangan)',
    tips: 'Pastikan keseimbangan, lutut tidak melewati ujung kaki, dan kontrol gerakan secara perlahan!',
  },
  'Weighted Jump Squat': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 5-10 kg plate di masing-masing sisi (total 30-40 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Pastikan pendaratan lembut dan lutut tidak melewati ujung kaki!',
  },
  'weighted jump squat': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 5-10 kg plate di masing-masing sisi (total 30-40 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Pastikan pendaratan lembut dan lutut tidak melewati ujung kaki!',
  },
  'Barbell Full Squat': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)',
    expert: 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)',
    tips: 'Pastikan punggung tetap lurus, lutut tidak melewati ujung kaki, dan squat sampai paha sejajar atau lebih rendah!',
  },
  'barbell full squat': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5-5 kg plate di masing-masing sisi (total 25-30 kg)',
    intermediate: 'Barbell 20 kg + 7.5-10 kg plate di masing-masing sisi (total 35-40 kg)',
    expert: 'Barbell 20 kg + 15-20 kg plate di masing-masing sisi (total 50-60 kg+)',
    tips: 'Pastikan punggung tetap lurus, lutut tidak melewati ujung kaki, dan squat sampai paha sejajar atau lebih rendah!',
  },
  'Dumbbell Squat': {
    beginner: 'Dumbbell 5-8 kg (setiap tangan)',
    intermediate: 'Dumbbell 10-15 kg (setiap tangan)',
    expert: 'Dumbbell >18 kg (setiap tangan)',
    tips: 'Pastikan lutut tidak melewati ujung kaki!',
  },
  'dumbbell squat': {
    beginner: 'Dumbbell 5-8 kg (setiap tangan)',
    intermediate: 'Dumbbell 10-15 kg (setiap tangan)',
    expert: 'Dumbbell >18 kg (setiap tangan)',
    tips: 'Pastikan lutut tidak melewati ujung kaki!',
  },
  'Dumbbell Lunge': {
    beginner: 'Dumbbell 4-7 kg (setiap tangan)',
    intermediate: 'Dumbbell 8-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Pastikan langkah konsisten dan lutut tidak melewati ujung kaki!',
  },
  'Leg Press': {
    beginner: 'Piringan beban 20-30 kg total atau settingan paling ringan',
    intermediate: 'Piringan beban 40-60 kg total',
    expert: 'Piringan beban >80 kg total',
    tips: 'Pastikan kaki tidak terkunci dan gerakan terkontrol!',
  },
  'Leg Curl': {
    beginner: 'Piringan beban 5-10 kg atau settingan paling ringan',
    intermediate: 'Piringan beban 15-25 kg',
    expert: 'Piringan beban >30 kg',
    tips: 'Pastikan gerakan terkontrol dan fokus pada kontraksi hamstring!',
  },
  'Leg Extension': {
    beginner: 'Piringan beban 5-10 kg atau settingan paling ringan',
    intermediate: 'Piringan beban 15-25 kg',
    expert: 'Piringan beban >30 kg',
    tips: 'Pastikan gerakan terkontrol dan fokus pada kontraksi quadriceps!',
  },
  'Calf Raise': {
    beginner: 'Bodyweight atau piringan beban 5-10 kg',
    intermediate: 'Piringan beban 15-25 kg',
    expert: 'Piringan beban >30 kg',
    tips: 'Pastikan gerakan penuh dan tahan di puncak!',
  },
  'Cocoons': {
    beginner: 'Bodyweight saja, gerakan dengan kontrol',
    intermediate: 'Bodyweight dengan tambahan beban ringan (misal: piringan dumbbell di dada)',
    expert: 'Bodyweight dengan beban lebih berat atau mempercepat gerakan dengan tetap terkontrol',
    tips: 'Fokus pada kontraksi otot perut dan gerakan lambat serta terkontrol!',
  },
  'cocoons': {
    beginner: 'Bodyweight saja, gerakan dengan kontrol',
    intermediate: 'Bodyweight dengan tambahan beban ringan (misal: piringan dumbbell di dada)',
    expert: 'Bodyweight dengan beban lebih berat atau mempercepat gerakan dengan tetap terkontrol',
    tips: 'Fokus pada kontraksi otot perut dan gerakan lambat serta terkontrol!',
  },
  'Bottoms Up': {
    beginner: 'Bodyweight saja, gerakan dengan kontrol',
    intermediate: 'Bodyweight dengan tambahan beban ringan (misal: piringan dumbbell di dada)',
    expert: 'Bodyweight dengan beban lebih berat atau gerakan dengan rentang gerak yang lebih luas',
    tips: 'Fokus pada kontraksi otot perut dan kontrol gerakan saat mengangkat pinggul!',
  },
  'bottoms up': {
    beginner: 'Bodyweight saja, gerakan dengan kontrol',
    intermediate: 'Bodyweight dengan tambahan beban ringan (misal: piringan dumbbell di dada)',
    expert: 'Bodyweight dengan beban lebih berat atau gerakan dengan rentang gerak yang lebih luas',
    tips: 'Fokus pada kontraksi otot perut dan kontrol gerakan saat mengangkat pinggul!',
  },
  'Cross-Body Crunch': {
    beginner: 'Bodyweight saja, fokus pada kontraksi otot perut samping',
    intermediate: 'Bodyweight dengan tambahan beban ringan (misal: piringan dumbbell di dada)',
    expert: 'Bodyweight dengan beban lebih berat atau mempercepat gerakan dengan tetap terkontrol',
    tips: 'Pastikan siku menyentuh lutut yang berlawanan dan fokus pada rotasi torso!',
  },
  'cross-body crunch': {
    beginner: 'Bodyweight saja, fokus pada kontraksi otot perut samping',
    intermediate: 'Bodyweight dengan tambahan beban ringan (misal: piringan dumbbell di dada)',
    expert: 'Bodyweight dengan beban lebih berat atau mempercepat gerakan dengan tetap terkontrol',
    tips: 'Pastikan siku menyentuh lutut yang berlawanan dan fokus pada rotasi torso!',
  },
  'Spider Crawl': {
    beginner: 'Bodyweight saja, gerakan lambat dan terkontrol',
    intermediate: 'Bodyweight dengan mempercepat gerakan atau menambah jarak',
    expert: 'Bodyweight dengan menambah kecepatan atau menambah beban ringan di punggung',
    tips: 'Fokus pada stabilitas core dan gerakan kaki yang terkoordinasi!',
  },
  'spider crawl': {
    beginner: 'Bodyweight saja, gerakan lambat dan terkontrol',
    intermediate: 'Bodyweight dengan mempercepat gerakan atau menambah jarak',
    expert: 'Bodyweight dengan menambah kecepatan atau menambah beban ringan di punggung',
    tips: 'Fokus pada stabilitas core dan gerakan kaki yang terkoordinasi!',
  },
  'Bicycling': {
    beginner: 'Bodyweight saja, gerakan lambat dan terkontrol',
    intermediate: 'Bodyweight dengan mempercepat gerakan atau menambah durasi',
    expert: 'Bodyweight dengan menambah kecepatan atau menambah beban ringan di dada',
    tips: 'Fokus pada kontraksi otot perut dan gerakan kaki yang simetris!',
  },
  'bicycling': {
    beginner: 'Bodyweight saja, gerakan lambat dan terkontrol',
    intermediate: 'Bodyweight dengan mempercepat gerakan atau menambah durasi',
    expert: 'Bodyweight dengan menambah kecepatan atau menambah beban ringan di dada',
    tips: 'Fokus pada kontraksi otot perut dan gerakan kaki yang simetris!',
  },
  'Treadmill': {
    beginner: 'Berjalan dengan kecepatan 3-4 km/jam selama 10-15 menit',
    intermediate: 'Berjalan cepat atau berlari lambat dengan kecepatan 5-7 km/jam selama 20-30 menit',
    expert: 'Berlari dengan kecepatan 8-12 km/jam selama 30-45 menit atau interval training',
    tips: 'Pastikan postur tubuh tetap tegak dan gunakan pegangan tangan jika diperlukan!',
  },
  'treadmill': {
    beginner: 'Berjalan dengan kecepatan 3-4 km/jam selama 10-15 menit',
    intermediate: 'Berjalan cepat atau berlari lambat dengan kecepatan 5-7 km/jam selama 20-30 menit',
    expert: 'Berlari dengan kecepatan 8-12 km/jam selama 30-45 menit atau interval training',
    tips: 'Pastikan postur tubuh tetap tegak dan gunakan pegangan tangan jika diperlukan!',
  },
  'Wide Grip Decline Barbell Bench Press': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Pastikan punggung tetap stabil di bangku decline dan gunakan spotter jika perlu!',
  },
  'Wide-Grip Decline Barbell Bench Press': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Pastikan punggung tetap stabil di bangku decline dan gunakan spotter jika perlu!',
  },
  'Close Grip Bench Press': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Gunakan grip sekitar lebar bahu, jaga siku dekat dengan badan untuk fokus pada triceps!',
  },
  'Close-Grip Bench Press': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Gunakan grip sekitar lebar bahu, jaga siku dekat dengan badan untuk fokus pada triceps!',
  },
  'Close Grip Barbell Bench Press': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Gunakan grip sekitar lebar bahu, jaga siku dekat dengan badan untuk fokus pada triceps!',
  },
  'Close-Grip Barbell Bench Press': {
    beginner: 'Barbell kosong (20 kg) atau barbell 20 kg + 2.5 kg plate di masing-masing sisi (total 25 kg)',
    intermediate: 'Barbell 20 kg + 5-7.5 kg plate di masing-masing sisi (total 30-35 kg)',
    expert: 'Barbell 20 kg + 10-15 kg plate di masing-masing sisi (total 40-50 kg+)',
    tips: 'Gunakan grip sekitar lebar bahu, jaga siku dekat dengan badan untuk fokus pada triceps!',
  },
  'Reverse Grip Triceps Pushdown': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Pastikan siku tetap dekat dengan badan dan gerakan terkontrol! Grip reverse (telapak tangan ke atas) untuk fokus pada long head triceps!',
  },
  'reverse grip triceps pushdown': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Pastikan siku tetap dekat dengan badan dan gerakan terkontrol! Grip reverse (telapak tangan ke atas) untuk fokus pada long head triceps!',
  },
  'Reverse-Grip Triceps Pushdown': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Pastikan siku tetap dekat dengan badan dan gerakan terkontrol! Grip reverse (telapak tangan ke atas) untuk fokus pada long head triceps!',
  },
  'reverse-grip triceps pushdown': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Pastikan siku tetap dekat dengan badan dan gerakan terkontrol! Grip reverse (telapak tangan ke atas) untuk fokus pada long head triceps!',
  },
  'Weighted Bench Dip': {
    beginner: 'Bodyweight saja (tanpa beban tambahan) atau dumbbell 5-10 kg di antara kaki',
    intermediate: 'Dumbbell 15-25 kg di antara kaki atau weight belt dengan 10-20 kg',
    expert: 'Weight belt dengan >30 kg atau dumbbell >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan, jangan terlalu membuka! Turun sampai siku 90 derajat, kemudian dorong ke atas dengan fokus triceps!',
  },
  'weighted bench dip': {
    beginner: 'Bodyweight saja (tanpa beban tambahan) atau dumbbell 5-10 kg di antara kaki',
    intermediate: 'Dumbbell 15-25 kg di antara kaki atau weight belt dengan 10-20 kg',
    expert: 'Weight belt dengan >30 kg atau dumbbell >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan, jangan terlalu membuka! Turun sampai siku 90 derajat, kemudian dorong ke atas dengan fokus triceps!',
  },
  'Weighted Bench Dips': {
    beginner: 'Bodyweight saja (tanpa beban tambahan) atau dumbbell 5-10 kg di antara kaki',
    intermediate: 'Dumbbell 15-25 kg di antara kaki atau weight belt dengan 10-20 kg',
    expert: 'Weight belt dengan >30 kg atau dumbbell >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan, jangan terlalu membuka! Turun sampai siku 90 derajat, kemudian dorong ke atas dengan fokus triceps!',
  },
  'weighted bench dips': {
    beginner: 'Bodyweight saja (tanpa beban tambahan) atau dumbbell 5-10 kg di antara kaki',
    intermediate: 'Dumbbell 15-25 kg di antara kaki atau weight belt dengan 10-20 kg',
    expert: 'Weight belt dengan >30 kg atau dumbbell >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan, jangan terlalu membuka! Turun sampai siku 90 derajat, kemudian dorong ke atas dengan fokus triceps!',
  },
  'EZ-Bar Skullcrusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Duduk di bangku, jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'ez-bar skullcrusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Duduk di bangku, jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'EZ Bar Skullcrusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Duduk di bangku, jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'ez bar skullcrusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Duduk di bangku, jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'EZ-Bar Skull Crushers': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Duduk di bangku, jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'ez-bar skull crushers': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Duduk di bangku, jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'Triceps Pushdown - Rope Attachment': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan! Tarik rope ke bawah dan pisahkan ujung rope di bagian bawah untuk kontraksi maksimal! Gerakan terkontrol!',
  },
  'triceps pushdown - rope attachment': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan! Tarik rope ke bawah dan pisahkan ujung rope di bagian bawah untuk kontraksi maksimal! Gerakan terkontrol!',
  },
  'Triceps Pushdown Rope Attachment': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan! Tarik rope ke bawah dan pisahkan ujung rope di bagian bawah untuk kontraksi maksimal! Gerakan terkontrol!',
  },
  'triceps pushdown rope attachment': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan! Tarik rope ke bawah dan pisahkan ujung rope di bagian bawah untuk kontraksi maksimal! Gerakan terkontrol!',
  },
  'Rope Triceps Pushdown': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan! Tarik rope ke bawah dan pisahkan ujung rope di bagian bawah untuk kontraksi maksimal! Gerakan terkontrol!',
  },
  'rope triceps pushdown': {
    beginner: 'Beban 5-10 kg atau settingan paling ringan pada cable',
    intermediate: 'Beban 15-25 kg',
    expert: 'Beban >30 kg',
    tips: 'Jaga siku tetap dekat dengan badan! Tarik rope ke bawah dan pisahkan ujung rope di bagian bawah untuk kontraksi maksimal! Gerakan terkontrol!',
  },
  'Seated Triceps Press': {
    beginner: 'Dumbbell 3-6 kg (setiap tangan) atau EZ-bar kosong',
    intermediate: 'Dumbbell 8-14 kg (setiap tangan) atau EZ-bar + 5-10 kg',
    expert: 'Dumbbell >16 kg (setiap tangan) atau EZ-bar + 15-20 kg',
    tips: 'Duduk di bangku dengan punggung tegak! Jaga siku tetap dekat dengan kepala! Dorong beban ke atas sampai lengan lurus, kemudian turunkan perlahan!',
  },
  'seated triceps press': {
    beginner: 'Dumbbell 3-6 kg (setiap tangan) atau EZ-bar kosong',
    intermediate: 'Dumbbell 8-14 kg (setiap tangan) atau EZ-bar + 5-10 kg',
    expert: 'Dumbbell >16 kg (setiap tangan) atau EZ-bar + 15-20 kg',
    tips: 'Duduk di bangku dengan punggung tegak! Jaga siku tetap dekat dengan kepala! Dorong beban ke atas sampai lengan lurus, kemudian turunkan perlahan!',
  },
  'Seated Tricep Press': {
    beginner: 'Dumbbell 3-6 kg (setiap tangan) atau EZ-bar kosong',
    intermediate: 'Dumbbell 8-14 kg (setiap tangan) atau EZ-bar + 5-10 kg',
    expert: 'Dumbbell >16 kg (setiap tangan) atau EZ-bar + 15-20 kg',
    tips: 'Duduk di bangku dengan punggung tegak! Jaga siku tetap dekat dengan kepala! Dorong beban ke atas sampai lengan lurus, kemudian turunkan perlahan!',
  },
  'seated tricep press': {
    beginner: 'Dumbbell 3-6 kg (setiap tangan) atau EZ-bar kosong',
    intermediate: 'Dumbbell 8-14 kg (setiap tangan) atau EZ-bar + 5-10 kg',
    expert: 'Dumbbell >16 kg (setiap tangan) atau EZ-bar + 15-20 kg',
    tips: 'Duduk di bangku dengan punggung tegak! Jaga siku tetap dekat dengan kepala! Dorong beban ke atas sampai lengan lurus, kemudian turunkan perlahan!',
  },
  'Decline Close-Grip Bench To Skull Crusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Berbaring di bangku decline! Jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'decline close-grip bench to skull crusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Berbaring di bangku decline! Jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'Decline Close Grip Bench To Skull Crusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Berbaring di bangku decline! Jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'decline close grip bench to skull crusher': {
    beginner: 'EZ-bar kosong tanpa plate tambahan',
    intermediate: 'EZ-bar + 2.5-5 kg plate di masing-masing sisi',
    expert: 'EZ-bar + 7.5-12.5 kg plate di masing-masing sisi',
    tips: 'Berbaring di bangku decline! Jaga siku tetap tegak ke atas! Turunkan EZ-bar ke arah dahi (hampir menyentuh), kemudian dorong kembali ke atas! Gerakan lambat dan terkontrol!',
  },
  'Standing dumbbell upright row': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Berdiri tegak dengan punggung lurus! Tarik dumbbell ke atas ke arah dagu, siku mengarah ke atas! Jangan angkat siku lebih tinggi dari bahu! Gerakan terkontrol!',
  },
  'standing dumbbell upright row': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Berdiri tegak dengan punggung lurus! Tarik dumbbell ke atas ke arah dagu, siku mengarah ke atas! Jangan angkat siku lebih tinggi dari bahu! Gerakan terkontrol!',
  },
  'Standing Dumbbell Upright Row': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Berdiri tegak dengan punggung lurus! Tarik dumbbell ke atas ke arah dagu, siku mengarah ke atas! Jangan angkat siku lebih tinggi dari bahu! Gerakan terkontrol!',
  },
  'standing dumbbell upright rows': {
    beginner: 'Dumbbell 3-5 kg (setiap tangan)',
    intermediate: 'Dumbbell 7-12 kg (setiap tangan)',
    expert: 'Dumbbell >15 kg (setiap tangan)',
    tips: 'Berdiri tegak dengan punggung lurus! Tarik dumbbell ke atas ke arah dagu, siku mengarah ke atas! Jangan angkat siku lebih tinggi dari bahu! Gerakan terkontrol!',
  },
  'Leverage shrug': {
    beginner: 'Settingan paling ringan atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Berdiri tegak di mesin leverage! Angkat bahu setinggi mungkin ke arah telinga, tahan 1-2 detik, kemudian turunkan perlahan! Jangan gunakan momentum!',
  },
  'leverage shrug': {
    beginner: 'Settingan paling ringan atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Berdiri tegak di mesin leverage! Angkat bahu setinggi mungkin ke arah telinga, tahan 1-2 detik, kemudian turunkan perlahan! Jangan gunakan momentum!',
  },
  'Leverage Shrug': {
    beginner: 'Settingan paling ringan atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Berdiri tegak di mesin leverage! Angkat bahu setinggi mungkin ke arah telinga, tahan 1-2 detik, kemudian turunkan perlahan! Jangan gunakan momentum!',
  },
  'leverage shrugs': {
    beginner: 'Settingan paling ringan atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Berdiri tegak di mesin leverage! Angkat bahu setinggi mungkin ke arah telinga, tahan 1-2 detik, kemudian turunkan perlahan! Jangan gunakan momentum!',
  },
  'Muscle up': {
    beginner: 'Latihan dasar: Pull-up dan Dips (bisa pakai resistance band untuk bantuan)',
    intermediate: 'Muscle up dengan bantuan resistance band',
    expert: 'Muscle up tanpa bantuan, atau dengan beban tambahan (weight belt)',
    tips: 'Fokus pada explosive pull untuk membawa dada ke atas bar, kemudian push ke atas! Pastikan grip kuat dan core stabil!',
  },
  'muscle up': {
    beginner: 'Latihan dasar: Pull-up dan Dips (bisa pakai resistance band untuk bantuan)',
    intermediate: 'Muscle up dengan bantuan resistance band',
    expert: 'Muscle up tanpa bantuan, atau dengan beban tambahan (weight belt)',
    tips: 'Fokus pada explosive pull untuk membawa dada ke atas bar, kemudian push ke atas! Pastikan grip kuat dan core stabil!',
  },
  'Muscle Up': {
    beginner: 'Latihan dasar: Pull-up dan Dips (bisa pakai resistance band untuk bantuan)',
    intermediate: 'Muscle up dengan bantuan resistance band',
    expert: 'Muscle up tanpa bantuan, atau dengan beban tambahan (weight belt)',
    tips: 'Fokus pada explosive pull untuk membawa dada ke atas bar, kemudian push ke atas! Pastikan grip kuat dan core stabil!',
  },
  'muscle ups': {
    beginner: 'Latihan dasar: Pull-up dan Dips (bisa pakai resistance band untuk bantuan)',
    intermediate: 'Muscle up dengan bantuan resistance band',
    expert: 'Muscle up tanpa bantuan, atau dengan beban tambahan (weight belt)',
    tips: 'Fokus pada explosive pull untuk membawa dada ke atas bar, kemudian push ke atas! Pastikan grip kuat dan core stabil!',
  },
  'Shotgun row': {
    beginner: 'Barbell kosong atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Letakkan satu tangan di bangku, satu kaki di lantai! Tarik beban ke pinggang dengan siku mengarah ke atas! Jaga punggung tetap lurus dan core stabil!',
  },
  'shotgun row': {
    beginner: 'Barbell kosong atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Letakkan satu tangan di bangku, satu kaki di lantai! Tarik beban ke pinggang dengan siku mengarah ke atas! Jaga punggung tetap lurus dan core stabil!',
  },
  'Shotgun Row': {
    beginner: 'Barbell kosong atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Letakkan satu tangan di bangku, satu kaki di lantai! Tarik beban ke pinggang dengan siku mengarah ke atas! Jaga punggung tetap lurus dan core stabil!',
  },
  'shotgun rows': {
    beginner: 'Barbell kosong atau beban 20-30 kg',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Letakkan satu tangan di bangku, satu kaki di lantai! Tarik beban ke pinggang dengan siku mengarah ke atas! Jaga punggung tetap lurus dan core stabil!',
  },
  'Close-grip front lat pulldown': {
    beginner: 'Beban 20-30 kg atau settingan paling ringan',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Grip dengan jarak selebar bahu! Tarik bar ke dada bagian atas, siku mengarah ke bawah! Jaga punggung tetap lurus dan jangan gunakan momentum!',
  },
  'close-grip front lat pulldown': {
    beginner: 'Beban 20-30 kg atau settingan paling ringan',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Grip dengan jarak selebar bahu! Tarik bar ke dada bagian atas, siku mengarah ke bawah! Jaga punggung tetap lurus dan jangan gunakan momentum!',
  },
  'Close-Grip Front Lat Pulldown': {
    beginner: 'Beban 20-30 kg atau settingan paling ringan',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Grip dengan jarak selebar bahu! Tarik bar ke dada bagian atas, siku mengarah ke bawah! Jaga punggung tetap lurus dan jangan gunakan momentum!',
  },
  'close grip front lat pulldown': {
    beginner: 'Beban 20-30 kg atau settingan paling ringan',
    intermediate: 'Beban 40-60 kg',
    expert: 'Beban >80 kg',
    tips: 'Grip dengan jarak selebar bahu! Tarik bar ke dada bagian atas, siku mengarah ke bawah! Jaga punggung tetap lurus dan jangan gunakan momentum!',
  },
  'Pullup': {
    beginner: 'Pull-up dengan bantuan resistance band atau assisted pull-up machine',
    intermediate: 'Pull-up tanpa bantuan, 3-5 repetisi',
    expert: 'Pull-up tanpa bantuan, >8 repetisi, atau dengan beban tambahan (weight belt)',
    tips: 'Grip selebar bahu atau lebih lebar! Tarik dada ke bar, siku mengarah ke bawah! Jaga core stabil dan hindari mengayun!',
  },
  'pullup': {
    beginner: 'Pull-up dengan bantuan resistance band atau assisted pull-up machine',
    intermediate: 'Pull-up tanpa bantuan, 3-5 repetisi',
    expert: 'Pull-up tanpa bantuan, >8 repetisi, atau dengan beban tambahan (weight belt)',
    tips: 'Grip selebar bahu atau lebih lebar! Tarik dada ke bar, siku mengarah ke bawah! Jaga core stabil dan hindari mengayun!',
  },
  'Pull-up': {
    beginner: 'Pull-up dengan bantuan resistance band atau assisted pull-up machine',
    intermediate: 'Pull-up tanpa bantuan, 3-5 repetisi',
    expert: 'Pull-up tanpa bantuan, >8 repetisi, atau dengan beban tambahan (weight belt)',
    tips: 'Grip selebar bahu atau lebih lebar! Tarik dada ke bar, siku mengarah ke bawah! Jaga core stabil dan hindari mengayun!',
  },
  'pull-ups': {
    beginner: 'Pull-up dengan bantuan resistance band atau assisted pull-up machine',
    intermediate: 'Pull-up tanpa bantuan, 3-5 repetisi',
    expert: 'Pull-up tanpa bantuan, >8 repetisi, atau dengan beban tambahan (weight belt)',
    tips: 'Grip selebar bahu atau lebih lebar! Tarik dada ke bar, siku mengarah ke bawah! Jaga core stabil dan hindari mengayun!',
  },
  'Pullups': {
    beginner: 'Pull-up dengan bantuan resistance band atau assisted pull-up machine',
    intermediate: 'Pull-up tanpa bantuan, 3-5 repetisi',
    expert: 'Pull-up tanpa bantuan, >8 repetisi, atau dengan beban tambahan (weight belt)',
    tips: 'Grip selebar bahu atau lebih lebar! Tarik dada ke bar, siku mengarah ke bawah! Jaga core stabil dan hindari mengayun!',
  },
  'pullups': {
    beginner: 'Pull-up dengan bantuan resistance band atau assisted pull-up machine',
    intermediate: 'Pull-up tanpa bantuan, 3-5 repetisi',
    expert: 'Pull-up tanpa bantuan, >8 repetisi, atau dengan beban tambahan (weight belt)',
    tips: 'Grip selebar bahu atau lebih lebar! Tarik dada ke bar, siku mengarah ke bawah! Jaga core stabil dan hindari mengayun!',
  },
}

interface ProgramDay {
  day: string
  focus: string
  exerciseNames: string[]
  setRange: string
  repRange: string
  restSeconds: string
}

interface WeeklyProgram {
  week: number
  days: ProgramDay[]
}

type TrainingMethod = 'push_split' | 'ppl' | 'ppl_arnold' | 'heavy_duty'
type TrainingSplitPreset =
  | 'push_split_4'
  | 'bro_split_5'
  | 'upper_lower_4'
  | 'ppl_6'
  | 'ppl_5'
  | 'ppl_arnold_6'
  | 'heavy_duty_3'
  | 'heavy_duty_2'

interface ProgramPackageInfo {
  goal: 'bulking' | 'cutting' | 'maintain'
  method: TrainingMethod
  splitPreset: TrainingSplitPreset
  sessionsPerWeek: number
  splitLabel: string
  cardioRecommendation: string
  progressionGuide: string
  recoveryGuide: string
}

/**
 * Generate image URL untuk exercise berdasarkan nama, equipment, dan muscle
 * Menggunakan API route untuk generate gambar dengan gradient yang menarik
 */
const getExerciseImageUrl = (exerciseName: string, equipment: string, muscle: string): string => {
  // Gunakan API route untuk generate gambar
  const params = new URLSearchParams({
    exercise: exerciseName,
    equipment: equipment || '',
    muscle: muscle || '',
  })
  
  return `/api/exercises/image?${params.toString()}`
}

function getExerciseGalleryUrls(
  exercise: Exercise,
  fallbackMuscle?: string
): string[] {
  if (Array.isArray(exercise.imageUrls) && exercise.imageUrls.length > 0) {
    return exercise.imageUrls
  }
  if (exercise.imageUrl) return [exercise.imageUrl]
  return [
    getExerciseImageUrl(
      exercise.name,
      exercise.equipment || 'body weight',
      exercise.muscle || fallbackMuscle || 'general'
    ),
  ]
}

const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5] as const

// Mapping dari UI target ke API Ninjas muscle names
// Dokumentasi: https://api.api-ninjas.com/v1/exercises
const muscleMapping: Record<string, string> = {
  'biceps': 'biceps',
  'triceps': 'triceps',
  'chest': 'chest',
  'shoulders': 'traps', // API Ninjas tidak punya "shoulders", pakai "traps" sebagai target paling dekat
  'back': 'lats', // API Ninjas menggunakan 'lats' untuk latissimus dorsi (back)
  'legs': 'quadriceps', // API Ninjas menggunakan 'quadriceps' untuk legs
  'abs': 'abdominals',
  'cardio': '', // Untuk cardio, kita tidak perlu muscle parameter, hanya type=cardio
}

const workoutTargets = [
  { id: 'biceps', name: 'Biceps', icon: '💪', color: 'from-red-500/20 to-pink-500/20', borderColor: 'border-red-500/40' },
  { id: 'triceps', name: 'Triceps', icon: '💪', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'border-blue-500/40' },
  { id: 'chest', name: 'Dada', icon: '🏋️', color: 'from-purple-500/20 to-indigo-500/20', borderColor: 'border-purple-500/40' },
  { id: 'shoulders', name: 'Bahu', icon: '💪', color: 'from-orange-500/20 to-amber-500/20', borderColor: 'border-orange-500/40' },
  { id: 'back', name: 'Punggung', icon: '🏋️', color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/40' },
  { id: 'legs', name: 'Kaki', icon: '🦵', color: 'from-yellow-500/20 to-lime-500/20', borderColor: 'border-yellow-500/40' },
  { id: 'abs', name: 'Perut', icon: '🔥', color: 'from-pink-500/20 to-rose-500/20', borderColor: 'border-pink-500/40' },
  { id: 'cardio', name: 'Kardio', icon: '❤️', color: 'from-red-500/20 to-orange-500/20', borderColor: 'border-red-500/40' },
]

const difficultyColors: Record<string, { bg: string; border: string; text: string }> = {
  'beginner': { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300' },
  'intermediate': { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300' },
  'expert': { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300' },
}

function pickExerciseNames(exercises: Exercise[], count: number, startOffset: number) {
  if (exercises.length === 0) return []
  const picked: string[] = []
  for (let i = 0; i < count; i++) {
    const index = (startOffset + i) % exercises.length
    picked.push(exercises[index].name)
  }
  return picked
}

type WorkoutsMainTab = 'recommend' | 'history'

export default function WorkoutsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { premiumAccess, profileLoading, identityEmail, identityUsername } = useVisitorProfile()
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recommendationMode, setRecommendationMode] = useState<'target' | 'guided'>('target')
  const [selectedGoal, setSelectedGoal] = useState<'bulking' | 'cutting' | 'maintain'>('maintain')
  const [manualSplitPreset, setManualSplitPreset] = useState<TrainingSplitPreset | null>(null)
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false)
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false)
  const [methodInfoOpen, setMethodInfoOpen] = useState<TrainingMethod | null>(null)
  const [weeklyProgram, setWeeklyProgram] = useState<WeeklyProgram[] | null>(null)
  const [programPackage, setProgramPackage] = useState<ProgramPackageInfo | null>(null)
  const [savingProgramKey, setSavingProgramKey] = useState<string | null>(null)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [detailSlideIndex, setDetailSlideIndex] = useState(0)
  const [detailZoomIdx, setDetailZoomIdx] = useState(0)
  const [showVideo, setShowVideo] = useState(true)
  const [mainTab, setMainTab] = useState<WorkoutsMainTab>('recommend')
  const [loggedActivityKeys, setLoggedActivityKeys] = useState<string[]>([])
  const [savingExerciseName, setSavingExerciseName] = useState<string | null>(null)
  const [activityInlineMsg, setActivityInlineMsg] = useState<string | null>(null)
  const [memberData, setMemberData] = useState<any>(null)


  const skipInitialRecommendationFetchRef = useRef(false)

  const goalOptions = [
    { id: 'bulking', label: 'Bulking', description: 'Massa otot naik', accent: 'from-blue-500/20 to-indigo-500/20 border-blue-400/40' },
    { id: 'cutting', label: 'Cutting', description: 'Lemak turun', accent: 'from-rose-500/20 to-orange-500/20 border-rose-400/40' },
    { id: 'maintain', label: 'Maintain', description: 'Stabil & seimbang', accent: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40' },
  ] as const

  const methodOptions: Array<{
    id: TrainingMethod
    label: string
    description: string
    accent: string
    /** Beban sesi mingguan (bukan “level” pengguna) */
    sessionLoad: 'moderate' | 'high'
  }> = [
    {
      id: 'push_split',
      label: 'Push Split',
      description: 'Fokus dominan otot dorong + aksesori',
      accent: 'from-fuchsia-500/20 to-pink-500/20 border-fuchsia-400/40',
      sessionLoad: 'moderate',
    },
    {
      id: 'ppl',
      label: 'Push Pull Legs',
      description: 'Split klasik paling seimbang',
      accent: 'from-blue-500/20 to-cyan-500/20 border-blue-400/40',
      sessionLoad: 'moderate',
    },
    {
      id: 'ppl_arnold',
      label: 'PPL x Arnold',
      description: 'Hybrid volume tinggi — butuh recovery kuat',
      accent: 'from-amber-500/20 to-orange-500/20 border-amber-400/40',
      sessionLoad: 'high',
    },
    {
      id: 'heavy_duty',
      label: 'Mike Mentzer (Heavy Duty)',
      description: 'Low volume, high intensity, recovery panjang',
      accent: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40',
      sessionLoad: 'high',
    },
  ]

  const methodInfoContent: Record<
    TrainingMethod,
    { summary: string; suitable: string; frequency: string; note: string }
  > = {
    push_split: {
      summary:
        'Push Split menekankan otot dorong (dada, bahu, triceps) dengan variasi strength-hypertrophy.',
      suitable: 'Struktur simpel; mudah dijadwalkan dan dipantau progresnya.',
      frequency: 'Umumnya 4-5x per minggu.',
      note: 'Bagus untuk konsistensi teknik dan kenaikan beban bertahap.',
    },
    ppl: {
      summary:
        'PPL (Push Pull Legs) membagi latihan menjadi dorong, tarik, dan kaki secara seimbang.',
      suitable: 'Seimbang untuk banyak orang yang bisa latih 4–6x per minggu.',
      frequency: 'Ideal 5-6x per minggu.',
      note: 'Efektif untuk massa otot bila recovery, tidur, dan nutrisi terjaga.',
    },
    ppl_arnold: {
      summary:
        'PPL x Arnold menggabungkan volume tinggi ala Arnold split dengan pola PPL.',
      suitable: 'Sesi mingguan padat; prioritaskan tidur dan manajemen fatigue.',
      frequency: 'Umumnya 6x per minggu.',
      note: 'Sangat menguras recovery — kurangi volume di tempat lain jika perlu.',
    },
    heavy_duty: {
      summary:
        'Heavy Duty (Mike Mentzer) fokus intensitas tinggi, volume rendah, dan recovery panjang.',
      suitable: 'Frekuensi sesi paling rendah; cocok jadwal padat atau preferensi set ke failure.',
      frequency: 'Umumnya 2-3x per minggu.',
      note: 'Teknik dan pemanasan harus matang sebelum menaikkan intensitas.',
    },
  }

  const splitPresetOptionsByMethod: Record<
    TrainingMethod,
    Array<{ id: TrainingSplitPreset; label: string; frequency: string; description: string }>
  > = {
    push_split: [
      {
        id: 'push_split_4',
        label: 'Push Split 4-Day',
        frequency: '4x/minggu',
        description: 'Push strength, push hypertrophy, accessory, core',
      },
      {
        id: 'bro_split_5',
        label: 'Bro Split 5-Day',
        frequency: '5x/minggu',
        description: 'Chest, Back, Shoulders, Arms, Legs',
      },
    ],
    ppl: [
      {
        id: 'ppl_6',
        label: 'PPL 6-Day',
        frequency: '6x/minggu',
        description: 'Push-Pull-Legs diulang 2 siklus',
      },
      {
        id: 'ppl_5',
        label: 'PPL 5-Day',
        frequency: '5x/minggu',
        description: 'Volume menengah, recovery lebih longgar',
      },
    ],
    ppl_arnold: [
      {
        id: 'ppl_arnold_6',
        label: 'PPL x Arnold 6-Day',
        frequency: '6x/minggu',
        description: 'Chest/Back, Shoulders/Arms, Legs + PPL',
      },
    ],
    heavy_duty: [
      {
        id: 'heavy_duty_3',
        label: 'Heavy Duty 3-Day',
        frequency: '3x/minggu',
        description: 'Low volume high intensity standard',
      },
      {
        id: 'heavy_duty_2',
        label: 'Heavy Duty 2-Day',
        frequency: '2x/minggu',
        description: 'Recovery maksimal untuk natural lifter',
      },
    ],
  }

  const splitPresetLibrary: Record<TrainingSplitPreset, string[]> = {
    push_split_4: ['Push Strength', 'Push Hypertrophy', '__TARGET__ Accessory', 'Core + Mobility'],
    bro_split_5: ['Chest Day', 'Back Day', 'Shoulders Day', 'Arms Day', 'Leg Day'],
    upper_lower_4: ['Upper Strength', 'Lower Strength', 'Upper Hypertrophy', 'Lower Hypertrophy'],
    ppl_6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
    ppl_5: ['Push', 'Pull', 'Legs', 'Upper Mix', 'Lower + Core'],
    ppl_arnold_6: ['Chest + Back', 'Shoulders + Arms', 'Legs', 'Push', 'Pull', 'Legs'],
    heavy_duty_3: ['Upper Heavy Duty', 'Lower Heavy Duty', '__TARGET__ Intensity Day'],
    heavy_duty_2: ['Heavy Duty Upper', 'Heavy Duty Lower'],
  }

  const splitPresetLabelMap: Record<TrainingSplitPreset, string> = {
    push_split_4: 'Push Split 4-Day',
    bro_split_5: 'Bro Split 5-Day',
    upper_lower_4: 'Upper/Lower 4-Day',
    ppl_6: 'PPL 6-Day',
    ppl_5: 'PPL 5-Day',
    ppl_arnold_6: 'PPL x Arnold 6-Day',
    heavy_duty_3: 'Heavy Duty 3-Day',
    heavy_duty_2: 'Heavy Duty 2-Day',
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'riwayat') setMainTab('history')
  }, [])

  const goMainTab = useCallback(
    (t: WorkoutsMainTab) => {
      setMainTab(t)
      setDetailExercise(null)
      setMethodInfoOpen(null)
      const q = t === 'history' ? '?tab=riwayat' : ''
      router.replace(`${pathname}${q}`, { scroll: false })
    },
    [pathname, router]
  )

  // Load member profile data
  useEffect(() => {
    const loadMemberProfile = async () => {
      if (!identityEmail) return
      try {
        const response = await fetch(`/api/members/profile?email=${encodeURIComponent(identityEmail)}`)
        if (!response.ok) return
        const data = await response.json()
        setMemberData(data.member)
      } catch (e) {
        console.error('Error loading member profile:', e)
      }
    }
    loadMemberProfile()
  }, [identityEmail])

  // Helper function untuk menghitung umur dari tanggal lahir
  const calculateAge = (dateOfBirth?: Date | string) => {
    if (!dateOfBirth) return undefined
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDifference = today.getMonth() - birthDate.getMonth()
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Helper function untuk mendapatkan pesan selamat datang personalisasi
  const getPersonalizedWelcome = () => {
    const age = memberData?.dateOfBirth ? calculateAge(memberData.dateOfBirth) : undefined
    const gender = memberData?.gender
    const userName = memberData?.name || 'Teman'
    const gymExperience = memberData?.gymExperienceMonths

    let greetingPrefix = ''
    if (gender === 'PRIA') {
      greetingPrefix = 'Halo, Bro! '
    } else if (gender === 'WANITA') {
      greetingPrefix = 'Halo, Sis! '
    } else {
      greetingPrefix = 'Halo! '
    }

    if (!memberData?.experienceLevel) {
      return {
        title: `${greetingPrefix}Selamat Datang, ${userName}! 👋`,
        message: 'Lengkapi profil Anda untuk mendapatkan rekomendasi latihan yang sesuai!',
        tip: 'Klik menu Profil untuk mengisi data latihan Anda.',
        icon: '👋',
        color: 'from-blue-500/20 to-cyan-500/20 border-blue-400/40',
      }
    }

    const levelInfo = {
      PEMULA: {
        icon: '🌱',
        color: 'from-green-500/20 to-emerald-500/20 border-green-400/40',
        message: (exp: number | undefined) => `Dengan pengalaman gym ${exp ? `${exp} bulan` : 'baru mulai'}, kamu dikategorikan sebagai Pemula. Fokus pada teknik yang benar dan konsistensi! Beban ringan tidak masalah, yang penting form benar.`,
      },
      MENENGAH: {
        icon: '💪',
        color: 'from-yellow-500/20 to-amber-500/20 border-yellow-400/40',
        message: (exp: number | undefined) => `Dengan pengalaman gym ${exp ? `${exp} bulan` : 'beberapa waktu'}, kamu dikategorikan sebagai Atlet Menengah. Kamu sudah punya dasar, sekarang waktunya untuk meningkatkan intensitas dan volume!`,
      },
      ADVANCED: {
        icon: '🔥',
        color: 'from-red-500/20 to-orange-500/20 border-red-400/40',
        message: (exp: number | undefined) => `Dengan pengalaman gym ${exp ? `${exp} bulan` : 'lama'}, kamu dikategorikan sebagai Pro! Kamu sudah siap untuk latihan tingkat tinggi! Fokus pada progressive overload.`,
      },
    }

    const currentLevel = memberData.experienceLevel as keyof typeof levelInfo
    const level = levelInfo[currentLevel] || levelInfo.PEMULA

    return {
      title: `${greetingPrefix}Selamat Datang, ${userName}! ${level.icon}`,
      message: level.message(gymExperience),
      tip: '',
      icon: level.icon,
      color: level.color,
    }
  }

  // Helper function untuk mendapatkan semua difficulties (tanpa filter)
  const getMatchingDifficulties = () => {
    return ['beginner', 'intermediate', 'expert']
  }

  const recommendStorageKey = useMemo(
    () => workoutRecommendStorageKey(identityEmail, identityUsername),
    [identityEmail, identityUsername]
  )

  const filteredExercises = useMemo(() => exercises, [exercises])

  useLayoutEffect(() => {
    if (!recommendStorageKey || typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem(recommendStorageKey)
      if (!raw) return
      const data = JSON.parse(raw) as WorkoutRecommendationPersisted
      if (data.v !== 1) return
      setRecommendationMode(data.recommendationMode === 'guided' ? 'guided' : 'target')
      setSelectedTarget(typeof data.selectedTarget === 'string' ? data.selectedTarget : '')
      if (data.selectedGoal === 'bulking' || data.selectedGoal === 'cutting' || data.selectedGoal === 'maintain') {
        setSelectedGoal(data.selectedGoal)
      }
      const m = data.manualSplitPreset
      setManualSplitPreset(
        m &&
          [
            'push_split_4',
            'bro_split_5',
            'upper_lower_4',
            'ppl_6',
            'ppl_5',
            'ppl_arnold_6',
            'heavy_duty_3',
            'heavy_duty_2',
          ].includes(m)
          ? (m as TrainingSplitPreset)
          : null
      )
      const ex = Array.isArray(data.exercises) ? (data.exercises as Exercise[]) : []
      setExercises(ex)
      setWeeklyProgram((data.weeklyProgram as WeeklyProgram[] | null) ?? null)
      setProgramPackage((data.programPackage as ProgramPackageInfo | null) ?? null)
      if (data.mainTab === 'history' || data.mainTab === 'recommend') setMainTab(data.mainTab)
      setLoggedActivityKeys(pruneActivityLoggedKeys(Array.isArray(data.loggedActivityKeys) ? data.loggedActivityKeys : []))
      if (ex.length > 0) skipInitialRecommendationFetchRef.current = true
    } catch {
      /* ignore corrupt cache */
    }
  }, [recommendStorageKey])

  useEffect(() => {
    if (!recommendStorageKey || typeof window === 'undefined') return
    const t = window.setTimeout(() => {
      try {
        const payload: WorkoutRecommendationPersisted = {
          v: 1,
          recommendationMode,
          selectedTarget,
          selectedGoal,
          manualSplitPreset,
          exercises,
          weeklyProgram,
          programPackage,
          mainTab,
          loggedActivityKeys: pruneActivityLoggedKeys(loggedActivityKeys),
        }
        sessionStorage.setItem(recommendStorageKey, JSON.stringify(payload))
      } catch {
        /* quota / private mode */
      }
    }, 450)
    return () => window.clearTimeout(t)
  }, [
    recommendStorageKey,
    recommendationMode,
    selectedTarget,
    selectedGoal,
    manualSplitPreset,
    exercises,
    weeklyProgram,
    programPackage,
    mainTab,
    loggedActivityKeys,
  ])

  const fetchExercises = async (target?: string) => {
    setLoading(true)
    setError('')
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      // Mode target otot: kirim muscle + type (cardio hanya type). Mode otomatis: tanpa muscle/type — backend gabung multi-otot.
      if (recommendationMode !== 'guided') {
        if (target === 'cardio') {
          params.append('type', 'cardio')
        } else {
          if (!target) {
            setError('Target latihan belum dipilih')
            setLoading(false)
            return
          }
          const muscle = muscleMapping[target]

          if (!muscle) {
            setError('Target latihan tidak valid')
            setLoading(false)
            return
          }

          params.append('muscle', muscle)
          params.append('type', 'strength')
        }
      }

      // Fetch dari API route kita (yang akan proxy ke API Ninjas)
      if (!identityEmail) {
        throw new Error('User belum login')
      }

      params.append('email', identityEmail)
      params.append('goal', selectedGoal)
      if (memberData?.gender) {
        params.append('gender', memberData.gender)
      }
      const response = await fetch(`/api/exercises?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengambil data latihan')
      }

      const data = await response.json()

      if (!data.success || !Array.isArray(data.exercises)) {
        throw new Error('Format data tidak valid')
      }

      // Transform data dari API Ninjas ke format kita
      // Instructions sudah diterjemahkan di backend
      const exercises: Exercise[] = data.exercises.map((ex: any) => ({
        name: ex.name || 'Latihan Tanpa Nama',
        type: ex.type || 'strength',
        muscle: ex.muscle || target || '',
        equipment: ex.equipment || 'body weight',
        difficulty: ex.difficulty || 'beginner',
        instructions: ex.instructions || 'Tidak ada instruksi tersedia.',
        recommendation: ex.recommendation,
        imageUrl:
          typeof ex.imageUrl === 'string' && ex.imageUrl.length > 0
            ? ex.imageUrl
            : getExerciseImageUrl(
                ex.name || 'exercise',
                ex.equipment || 'body weight',
                ex.muscle || target || 'general'
              ),
        imageUrls: Array.isArray(ex.imageUrls) ? ex.imageUrls : undefined,
      }))

      if (exercises.length === 0) {
        setError('Tidak ada latihan ditemukan untuk target ini. Coba target lain.')
      } else {
        setExercises(exercises)
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Gagal memuat rekomendasi latihan. Silakan coba lagi.'
      setError(errorMessage)
      console.error('Error fetching exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!detailExercise) return
    setDetailSlideIndex(0)
    setDetailZoomIdx(0)
  }, [detailExercise?.name])

  useEffect(() => {
    if (!detailExercise) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [detailExercise])

  useEffect(() => {
    if (!detailExercise) return
    const urls = getExerciseGalleryUrls(detailExercise)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setDetailExercise(null)
        return
      }
      if (urls.length <= 1) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setDetailSlideIndex((i) => Math.min(urls.length - 1, i + 1))
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setDetailSlideIndex((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailExercise])

  useEffect(() => {
    if (skipInitialRecommendationFetchRef.current) {
      skipInitialRecommendationFetchRef.current = false
      return
    }

    if (recommendationMode === 'guided') {
      fetchExercises()
      return
    }

    if (selectedTarget) {
      fetchExercises(selectedTarget)
    } else {
      setExercises([])
      setWeeklyProgram(null)
      setProgramPackage(null)
    }
  }, [selectedTarget, selectedGoal, recommendationMode])

  /** Preset otomatis hanya dari goal (tanpa pembeda pemula/advanced) — netral & moderat */
  const autoSplitPreset: TrainingSplitPreset =
    selectedGoal === 'bulking'
      ? 'ppl_5'
      : selectedGoal === 'cutting'
      ? 'push_split_4'
      : 'upper_lower_4'

  const selectedSplitPreset: TrainingSplitPreset = manualSplitPreset || autoSplitPreset

  const selectedMethod: TrainingMethod =
    selectedSplitPreset === 'ppl_arnold_6'
      ? 'ppl_arnold'
      : selectedSplitPreset === 'heavy_duty_2' || selectedSplitPreset === 'heavy_duty_3'
      ? 'heavy_duty'
      : selectedSplitPreset === 'ppl_5' || selectedSplitPreset === 'ppl_6'
      ? 'ppl'
      : 'push_split'

  /** Hanya saat pengunjung klik "Gunakan Metode Ini": daftar dipersempit ke gerakan inti + berilustrasi. */
  const displayedExercises = useMemo(() => {
    if (!manualSplitPreset) return filteredExercises
    return curateExercisesForManualMethod(filteredExercises, selectedMethod, selectedGoal, selectedTarget)
  }, [filteredExercises, manualSplitPreset, selectedMethod, selectedGoal, selectedTarget])

  const goalLabelMap: Record<typeof selectedGoal, string> = {
    bulking: 'Bulking',
    cutting: 'Cutting',
    maintain: 'Maintain',
  }
  const currentMethodLabel = splitPresetLabelMap[selectedSplitPreset]
  const selectedTargetData = workoutTargets.find((t) => t.id === selectedTarget)
  const resolvedTargetLabel = selectedTargetData?.name || 'Program Otomatis'

  const logActivityImmediate = useCallback(
    async (ex: Exercise) => {
      if (!identityEmail && !identityUsername) return
      const key = activityLoggedKey(ex.name)
      setSavingExerciseName(ex.name)
      setActivityInlineMsg(null)
      try {
        const goalWord =
          selectedGoal === 'bulking' ? 'Bulking' : selectedGoal === 'cutting' ? 'Cutting' : 'Maintain'
        const notes = [
          'Dari rekomendasi app',
          goalWord,
          recommendationMode === 'guided' ? 'Mode otomatis' : `Target ${resolvedTargetLabel}`,
          currentMethodLabel,
        ].join(' · ')
        const payload: Record<string, unknown> = {
          exercises: [{ name: ex.name, ...(ex.muscle ? { muscle: ex.muscle } : {}) }],
          notes,
          completedAt: new Date().toISOString(),
        }
        if (identityEmail) payload.email = identityEmail
        if (identityUsername) payload.username = identityUsername

        const response = await fetch('/api/members/workouts/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Gagal menyimpan')

        setLoggedActivityKeys((prev) => pruneActivityLoggedKeys([...new Set([...prev, key])]))
        setActivityInlineMsg(`“${ex.name}” tersimpan ke riwayat.`)
        window.dispatchEvent(new CustomEvent('workout-history-updated'))
        window.dispatchEvent(new CustomEvent('premium-access-updated'))
        window.setTimeout(() => setActivityInlineMsg(null), 4000)
      } catch (e) {
        setActivityInlineMsg(e instanceof Error ? e.message : 'Gagal menyimpan')
        window.setTimeout(() => setActivityInlineMsg(null), 6000)
      } finally {
        setSavingExerciseName(null)
      }
    },
    [
      identityEmail,
      identityUsername,
      selectedGoal,
      recommendationMode,
      resolvedTargetLabel,
      currentMethodLabel,
    ]
  )

  const defaultPresetByMethod: Record<TrainingMethod, TrainingSplitPreset> = {
    push_split: 'push_split_4',
    ppl: 'ppl_5',
    ppl_arnold: 'ppl_arnold_6',
    heavy_duty: selectedGoal === 'maintain' ? 'heavy_duty_2' : 'heavy_duty_3',
  }

  const difficultyStats = displayedExercises.reduce((acc, ex) => {
    acc[ex.difficulty] = (acc[ex.difficulty] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const generateProgram = () => {
    if (displayedExercises.length === 0) return

    const goalPreset =
      selectedGoal === 'bulking'
        ? { setRange: '4-5 set', repRange: '6-12 repetisi', restSeconds: '90-150 detik' }
        : selectedGoal === 'cutting'
        ? { setRange: '3-4 set', repRange: '12-20 repetisi', restSeconds: '30-60 detik' }
        : { setRange: '3-4 set', repRange: '8-15 repetisi', restSeconds: '60-90 detik' }

    const cardioByGoal: Record<typeof selectedGoal, string> = {
      bulking: 'Tambahkan cardio ringan 1-2x/minggu (10-20 menit) untuk kesehatan jantung.',
      cutting: 'Tambahkan cardio 3-5x/minggu (20-40 menit) untuk defisit kalori terkontrol.',
      maintain: 'Tambahkan cardio 2-3x/minggu (15-30 menit) untuk kebugaran umum.',
    }

    const progressionByGoal: Record<typeof selectedGoal, string> = {
      bulking: 'Naikkan beban 2.5-5% jika semua set/rep tercapai dengan form baik.',
      cutting: 'Pertahankan beban, tingkatkan densitas (rest lebih pendek) secara bertahap.',
      maintain: 'Variasikan beban dan repetisi tiap minggu untuk menjaga performa stabil.',
    }

    const recoveryByMethod: Record<TrainingMethod, string> = {
      push_split: 'Sisipkan 1-2 hari recovery aktif (jalan santai/stretching).',
      ppl: 'Jaga tidur 7-8 jam dan kelola fatigue karena frekuensi tinggi.',
      ppl_arnold: 'Wajib manajemen recovery: tidur optimal + deload tiap 4-6 minggu.',
      heavy_duty: 'Prioritaskan recovery penuh antar sesi (48-72 jam) sebelum beban berikutnya.',
    }

    const activeSplit = splitPresetLibrary[selectedSplitPreset].map((focus) =>
      focus.replace('__TARGET__', resolvedTargetLabel)
    )
    const sessionsPerWeek = activeSplit.length

    const weeks: WeeklyProgram[] = [1, 2, 3, 4].map((weekNumber) => {
      const days: ProgramDay[] = activeSplit.map((focus, dayIndex) => ({
        day: `Hari ${dayIndex + 1}`,
        focus,
        exerciseNames: pickExerciseNames(displayedExercises, 4, weekNumber * 3 + dayIndex * 2),
        setRange: goalPreset.setRange,
        repRange: goalPreset.repRange,
        restSeconds: goalPreset.restSeconds,
      }))
      return { week: weekNumber, days }
    })

    setWeeklyProgram(weeks)
    setProgramPackage({
      goal: selectedGoal,
      method: selectedMethod,
      splitPreset: selectedSplitPreset,
      sessionsPerWeek,
      splitLabel: splitPresetLabelMap[selectedSplitPreset],
      cardioRecommendation: cardioByGoal[selectedGoal],
      progressionGuide: progressionByGoal[selectedGoal],
      recoveryGuide: recoveryByMethod[selectedMethod],
    })
  }

  const saveProgramDayToSchedule = async (week: number, dayIndex: number, day: ProgramDay) => {
    const saveKey = `${week}-${dayIndex}`
    setSavingProgramKey(saveKey)
    try {
      const baseDate = new Date()
      baseDate.setHours(0, 0, 0, 0)
      const totalOffsetDays = (week - 1) * 7 + dayIndex
      const scheduleDate = new Date(baseDate.getTime() + totalOffsetDays * 24 * 60 * 60 * 1000)
      const dateString = scheduleDate.toISOString().split('T')[0]

      const defaultTime =
        selectedGoal === 'cutting' ? '07:00' : selectedGoal === 'bulking' ? '18:00' : '17:00'
      const defaultDuration =
        selectedGoal === 'cutting' ? 45 : selectedGoal === 'bulking' ? 60 : 50

      const scheduleEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: dateString,
        time: defaultTime,
        exercise: day.exerciseNames.slice(0, 2).join(' + '),
        target: resolvedTargetLabel || 'Umum',
        duration: defaultDuration,
      }

      if (!identityEmail) {
        alert('Silakan login terlebih dahulu untuk menyimpan jadwal.')
        return
      }

      const existingRaw = loadSchedulesJsonForUser(identityEmail)
      const existing = existingRaw ? JSON.parse(existingRaw) : []
      const updatedSchedules = [...existing, scheduleEntry]
      localStorage.setItem(workoutSchedulesStorageKey(identityEmail), JSON.stringify(updatedSchedules))

      // Try sync to Google Calendar if user is connected; fail silently to keep UX smooth.
      if (identityEmail) {
        const startDateTime = new Date(`${dateString}T${defaultTime}:00`)
        const endDateTime = new Date(startDateTime.getTime() + defaultDuration * 60 * 1000)
        const eventTitle = `[Program ${selectedGoal.toUpperCase()}] ${day.focus}`
        const eventDescription = `Program Minggu ${week} - ${day.day}\nTarget: ${resolvedTargetLabel || 'Umum'}\nLatihan:\n- ${day.exerciseNames.join('\n- ')}`
        try {
          await fetch('/api/calendar/events/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: identityEmail,
              title: eventTitle,
              description: eventDescription,
              start: startDateTime.toISOString(),
              end: endDateTime.toISOString(),
              location: 'Ganesha Gym',
            }),
          })
        } catch (error) {
          // Ignore sync errors; local schedule is already saved.
        }
      }

      alert(`Jadwal ${day.day} (Minggu ${week}) berhasil disimpan. Anda akan diarahkan ke menu Jadwal Latihan.`)
      router.push('/visitor/schedule')
    } catch (error) {
      alert('Gagal menyimpan ke jadwal. Silakan coba lagi.')
    } finally {
      setSavingProgramKey(null)
    }
  }

  if (profileLoading) {
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
            Rekomendasi latihan hanya tersedia untuk akses visit aktif (24 jam) atau membership aktif (1 bulan).
            Silakan lakukan pembayaran di menu Pembayaran untuk membuka fitur ini.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header + tab utama (rekomendasi / riwayat) */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-accent/20 to-accent-light/20 rounded-xl shrink-0">
              <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-oswald font-bold text-white mb-1 sm:mb-2 tracking-tight">
                Rekomendasi Latihan
              </h1>
              <p className="text-gray-300 font-poppins text-sm sm:text-base lg:text-lg">
                {mainTab === 'history'
                  ? 'Catat dan tinjau sesi latihan Anda.'
                  : 'Pilih target latihan Anda untuk mendapatkan rekomendasi yang sesuai'}
              </p>
            </div>
          </div>

          <div
            className="inline-flex p-1 rounded-2xl bg-black/30 border border-white/15 backdrop-blur-md shadow-lg self-start lg:shrink-0 w-full sm:w-auto"
            role="tablist"
            aria-label="Bagian latihan"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'recommend'}
              onClick={() => goMainTab('recommend')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-poppins font-semibold transition-all ${
                mainTab === 'recommend'
                  ? 'bg-accent text-white shadow-md shadow-accent/25'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 opacity-90" />
              Rekomendasi
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === 'history'}
              onClick={() => goMainTab('history')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-poppins font-semibold transition-all ${
                mainTab === 'history'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <History className="w-4 h-4 shrink-0 opacity-90" />
              Riwayat
            </button>
          </div>
        </div>
      </div>

      {mainTab === 'history' ? (
        <WorkoutHistorySection identityEmail={identityEmail} identityUsername={identityUsername} />
      ) : (
        <>
      {/* Personalized Welcome Banner */}
      <div className={`bg-gradient-to-br ${getPersonalizedWelcome().color} backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 mb-5 sm:mb-6`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="text-3xl sm:text-4xl md:text-5xl">{getPersonalizedWelcome().icon}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-oswald font-bold text-white mb-1 sm:mb-2">
              {getPersonalizedWelcome().title}
            </h2>
            <p className="text-gray-200 font-poppins text-sm sm:text-base md:text-lg leading-relaxed">
              {getPersonalizedWelcome().message}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation Mode */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-white/20 mb-5 sm:mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-oswald font-bold text-white">
            Mode Rekomendasi
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => setRecommendationMode('target')}
            className={`rounded-xl border-2 p-3 sm:p-4 text-left transition-all ${
              recommendationMode === 'target'
                ? 'border-accent/60 bg-accent/15'
                : 'border-white/20 bg-white/5 hover:border-accent/40'
            }`}
          >
            <p className="text-lg font-oswald font-bold text-white">Berdasarkan Target Otot</p>
            <p className="text-sm text-gray-300 font-poppins">Pilih otot dulu, cocok untuk pemula maupun advance.</p>
          </button>
          <button
            onClick={() => {
              setRecommendationMode('guided')
              setSelectedTarget('')
            }}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              recommendationMode === 'guided'
                ? 'border-cyan-400/60 bg-cyan-500/15'
                : 'border-white/20 bg-white/5 hover:border-cyan-400/40'
            }`}
          >
            <p className="text-lg font-oswald font-bold text-white">Otomatis (Tanpa Pilih Otot)</p>
            <p className="text-sm text-gray-300 font-poppins">Pilih goal di bawah, aku akan menggabungkan latihan yang cocok buat kamu</p>
          </button>
        </div>
      </div>

      {/* Target Selection */}
      {recommendationMode === 'target' && (
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-white/20 mb-5 sm:mb-6 hover:shadow-3xl transition-all">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-oswald font-bold text-white">
            Pilih Target Latihan
          </h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {workoutTargets.map((target) => {
            const isSelected = selectedTarget === target.id
            return (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target.id)}
                className={`p-3 sm:p-5 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  isSelected
                    ? `bg-gradient-to-br ${target.color} ${target.borderColor} shadow-xl scale-105`
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10 hover:border-accent/50'
                }`}
              >
                <div className={`text-3xl sm:text-4xl mb-2 sm:mb-3 transition-transform ${isSelected ? 'scale-110' : ''}`}>
                  {target.icon}
                </div>
                <div className={`font-poppins text-xs sm:text-sm font-semibold ${isSelected ? 'text-white' : ''}`}>
                  {target.name}
                </div>
                {isSelected && (
                  <div className="mt-1 sm:mt-2 flex justify-center">
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      )}

      {/* Goal Dropdown */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-white/20 mb-5 sm:mb-6">
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-accent">
            Goal: {selectedGoal}
          </span>
          <span className="inline-flex items-center rounded-full border border-violet-400/40 bg-violet-500/10 px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-violet-300">
            Metode Sistem: {splitPresetLabelMap[selectedSplitPreset]}
          </span>
          <span className={`inline-flex items-center rounded-full border px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold ${
            manualSplitPreset
              ? 'border-amber-400/40 bg-amber-500/10 text-amber-300'
              : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
          }`}>
            {manualSplitPreset ? 'Mode Metode: Manual Override' : 'Mode Metode: Otomatis'}
          </span>
        </div>
        <button
          onClick={() => setGoalDropdownOpen((prev) => !prev)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="text-left min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-oswald font-bold text-white">Goal Latihan</h2>
              <p className="text-xs sm:text-sm text-gray-300 font-poppins">
                Goal aktif: <span className="font-semibold capitalize">{selectedGoal}</span>
              </p>
            </div>
          </div>
          <span className="text-accent text-xs sm:text-sm font-semibold">{goalDropdownOpen ? 'Tutup' : 'Pilih Goal'}</span>
        </button>

        {goalDropdownOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-5">
            {goalOptions.map((goal) => {
              const isSelected = selectedGoal === goal.id
              return (
                <button
                  key={goal.id}
                  onClick={() => {
                    setSelectedGoal(goal.id)
                    setGoalDropdownOpen(false)
                  }}
                  className={`rounded-xl border-2 p-3 sm:p-4 text-left transition-all ${
                    isSelected
                      ? `bg-gradient-to-br ${goal.accent} shadow-lg scale-[1.01]`
                      : 'bg-white/5 border-white/20 hover:border-accent/50'
                  }`}
                >
                  <p className="text-base sm:text-lg font-oswald font-bold text-white">{goal.label}</p>
                  <p className="text-xs sm:text-sm text-gray-300 font-poppins">{goal.description}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Method Dropdown (System Auto) */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-white/20 mb-5 sm:mb-6">
        <button
          onClick={() => setMethodDropdownOpen((prev) => !prev)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div className="text-left min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-oswald font-bold text-white">
                Metode Latihan <span className="text-xs sm:text-sm align-middle text-gray-300 font-poppins ml-1">(Opsional)</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-poppins">
                Dipilih sistem: <span className="font-semibold">{splitPresetLabelMap[selectedSplitPreset]}</span>
              </p>
            </div>
          </div>
          <span className="text-accent text-xs sm:text-sm font-semibold">{methodDropdownOpen ? 'Tutup' : 'Lihat Metode'}</span>
        </button>

        {/* Status metode: selalu terlihat */}
        <div className="mt-3 sm:mt-4 rounded-xl border border-white/15 bg-black/20 px-3 sm:px-4 py-2.5 sm:py-3 font-poppins text-xs sm:text-sm">
          {manualSplitPreset ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-amber-100">
                    Metode aktif (pilihan Anda)
                  </p>
                  <p className="text-gray-300 mt-0.5">
                    <span className="text-white">{methodOptions.find((m) => m.id === selectedMethod)?.label ?? 'Metode'}</span>
                    {' · '}
                    <span className="text-gray-400">{splitPresetLabelMap[manualSplitPreset]}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualSplitPreset(null)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Batalkan metode
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-gray-300">
              <Zap className="w-5 h-5 text-emerald-400/90 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-100/95">Mengikuti preset otomatis</p>
                <p className="text-gray-400 mt-0.5 text-xs">
                  Split saat ini: <span className="text-gray-200">{splitPresetLabelMap[selectedSplitPreset]}</span>
                  {' · '}
                  Buka &quot;Lihat Metode&quot; lalu pilih &quot;Gunakan Metode Ini&quot; untuk mengunci metode tertentu.
                </p>
              </div>
            </div>
          )}
        </div>

        {methodDropdownOpen && (
          <div className="mt-5 space-y-3">
            {manualSplitPreset && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManualSplitPreset(null)}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Batalkan metode (reset ke otomatis)
                </button>
              </div>
            )}
            <p className="text-xs uppercase tracking-wide text-gray-400 font-poppins">
              Referensi metode & beban sesi mingguan
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {methodOptions.map((method) => {
                const isActive = selectedMethod === method.id
                const isManualChoice = manualSplitPreset !== null && isActive
                return (
                  <div
                    key={method.id}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      isManualChoice
                        ? 'ring-2 ring-amber-400/60 border-amber-400/45 bg-amber-500/10'
                        : isActive
                        ? 'border-emerald-500/35 bg-emerald-500/5'
                        : 'border-white/15 bg-white/5'
                    } hover:border-accent/50`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-white font-poppins font-semibold text-sm truncate">{method.label}</p>
                        {isManualChoice && (
                          <span className="shrink-0 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/40">
                            Dipilih
                          </span>
                        )}
                        {!isManualChoice && isActive && (
                          <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200/90 border border-emerald-400/30">
                            Otomatis
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] px-2 py-1 rounded-full border ${
                            method.sessionLoad === 'moderate'
                              ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                              : 'border-amber-400/40 text-amber-200 bg-amber-500/10'
                          }`}
                        >
                          {method.sessionLoad === 'moderate' ? 'Beban sesi moderat' : 'Volume / intensitas tinggi'}
                        </span>
                        <button
                          onClick={() => setMethodInfoOpen(method.id)}
                          className="w-7 h-7 rounded-full border border-white/25 text-cyan-200 hover:text-white hover:bg-cyan-500/25 hover:border-cyan-300/60 flex items-center justify-center transition-all duration-200 hover:scale-110"
                          title="Info metode"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 font-poppins mt-1">{method.description}</p>
                    <button
                      onClick={() => setManualSplitPreset(defaultPresetByMethod[method.id])}
                      className="mt-2 text-xs rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-accent hover:bg-accent/20 transition-colors font-semibold"
                    >
                      Gunakan Metode Ini
                    </button>
                    {isActive && (
                      <p className="text-xs text-accent font-semibold font-poppins mt-2">
                        {manualSplitPreset
                          ? 'Aktif melalui pilihan manual'
                          : 'Aktif otomatis berdasarkan goal'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Statistics Bar (shown when exercises are loaded) */}
      {displayedExercises.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-xl rounded-xl p-4 sm:p-5 border-2 border-blue-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 sm:p-2 bg-blue-500/30 rounded-lg">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
              </div>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
            </div>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm mb-1">Total Latihan</p>
            <p className="text-2xl sm:text-3xl font-oswald font-bold text-white">{displayedExercises.length}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-xl p-4 sm:p-5 border-2 border-green-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 sm:p-2 bg-green-500/30 rounded-lg">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
              </div>
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
            </div>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm mb-1">Target</p>
            <p className="text-xl sm:text-2xl font-oswald font-bold text-white">{resolvedTargetLabel}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-xl p-4 sm:p-5 border-2 border-purple-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 sm:p-2 bg-purple-500/30 rounded-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
              </div>
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
            </div>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm mb-1">Variasi</p>
            <p className="text-xl sm:text-2xl font-oswald font-bold text-white">
              {Object.keys(difficultyStats).length} Level
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/20 to-sky-500/20 backdrop-blur-xl rounded-xl p-4 sm:p-5 border-2 border-cyan-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 sm:p-2 bg-cyan-500/30 rounded-lg">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
              </div>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
            </div>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm mb-1">Goal Aktif</p>
            <p className="text-xl sm:text-2xl font-oswald font-bold text-white capitalize">{selectedGoal}</p>
          </div>
        </div>
      )}

      {displayedExercises.length > 0 && (
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-wrap sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={generateProgram}
            className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-light px-4 sm:px-5 py-2.5 sm:py-3 text-white font-semibold font-poppins shadow-lg hover:shadow-accent/30 transition-all text-sm sm:text-base"
          >
            <Sparkles className="w-4 h-4" />
            Generate Program 4 Minggu
          </button>
          <p className="text-xs sm:text-sm text-gray-300 font-poppins">
            Program disesuaikan dengan goal <span className="font-semibold capitalize">{selectedGoal}</span> dan target <span className="font-semibold">{resolvedTargetLabel}</span>.
          </p>
        </div>
      )}

      {weeklyProgram && (
        <div className="mb-5 sm:mb-6 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-xl p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-oswald font-bold text-white">
                Rekomendasi {goalLabelMap[selectedGoal]} dengan metode {currentMethodLabel}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-poppins">
                Gunakan sebagai template. Sesuaikan volume dan beban sesuai kemampuan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setWeeklyProgram(null)
                setProgramPackage(null)
              }}
              className="w-full sm:w-auto inline-flex shrink-0 items-center justify-center gap-2 self-stretch sm:self-auto rounded-xl border border-white/30 bg-black/25 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
              Sembunyikan program
            </button>
          </div>

          {programPackage && (
            <div className="mb-4 sm:mb-5 rounded-xl border border-accent/30 bg-accent/10 p-3 sm:p-4">
              <p className="text-accent text-[10px] sm:text-xs font-poppins uppercase tracking-wide font-semibold mb-2">
                Paket Program Goal
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm font-poppins">
                <p className="text-gray-100">
                  <span className="text-gray-400">Goal:</span> <span className="font-semibold capitalize">{programPackage.goal}</span>
                </p>
                <p className="text-gray-100">
                  <span className="text-gray-400">Metode:</span> <span className="font-semibold">{programPackage.splitLabel}</span>
                </p>
                <p className="text-gray-100 md:col-span-2">
                  <span className="text-gray-400">Frekuensi latihan:</span>{' '}
                  <span className="font-semibold">{programPackage.sessionsPerWeek}x per minggu</span>
                </p>
                <p className="text-gray-100 md:col-span-2">
                  <span className="text-gray-400">Preset split:</span>{' '}
                  <span className="font-semibold">{programPackage.splitLabel}</span>
                </p>
                <p className="text-gray-100 md:col-span-2">
                  <span className="text-gray-400">Cardio:</span> {programPackage.cardioRecommendation}
                </p>
                <p className="text-gray-100 md:col-span-2">
                  <span className="text-gray-400">Progresi:</span> {programPackage.progressionGuide}
                </p>
                <p className="text-gray-100 md:col-span-2">
                  <span className="text-gray-400">Recovery:</span> {programPackage.recoveryGuide}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {weeklyProgram.map((week) => (
              <div key={week.week} className="rounded-xl border border-white/15 bg-white/5 p-3 sm:p-4">
                <h3 className="text-lg sm:text-xl font-oswald font-bold text-accent mb-2 sm:mb-3">Minggu {week.week}</h3>
                <div className="space-y-2 sm:space-y-3">
                  {week.days.map((day, dayIndex) => (
                    <div key={`${day.day}-${dayIndex}`} className="rounded-lg border border-white/10 bg-black/10 p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm font-semibold text-white font-poppins">
                        {day.day} - {day.focus}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-300 font-poppins mt-1">
                        {day.setRange} | {day.repRange} | Rest {day.restSeconds}
                      </p>
                      <ul className="mt-1.5 sm:mt-2 space-y-1">
                        {day.exerciseNames.map((exerciseName) => (
                          <li key={exerciseName} className="text-[10px] sm:text-xs text-gray-200 font-poppins">
                            - {exerciseName}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => saveProgramDayToSchedule(week.week, dayIndex, day)}
                        disabled={savingProgramKey === `${week.week}-${dayIndex}`}
                        className="mt-2.5 sm:mt-3 w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg border border-accent/40 bg-accent/20 px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-poppins font-semibold text-accent hover:bg-accent/30 transition-all disabled:opacity-60"
                      >
                        {savingProgramKey === `${week.week}-${dayIndex}` ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>Simpan ke Jadwal</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercises List */}
      {(recommendationMode === 'guided' || selectedTarget) && (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border-2 border-white/20">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-white/10">
            <div>
              <h2 className="text-2xl md:text-3xl font-oswald font-bold text-white mb-1">
                Rekomendasi {goalLabelMap[selectedGoal]} dengan metode {currentMethodLabel}
              </h2>
              <p className="text-gray-400 font-poppins text-sm">
                {manualSplitPreset
                  ? `${displayedExercises.length} gerakan inti ditampilkan${
                      exercises.length !== displayedExercises.length || filteredExercises.length !== exercises.length
                        ? ` (disaring dari ${exercises.length} total)`
                        : ''
                    } · ${recommendationMode === 'guided' ? 'mode otomatis' : `target ${resolvedTargetLabel}`}`
                  : `${filteredExercises.length} latihan tersedia${filteredExercises.length !== exercises.length ? ` (dari ${exercises.length} total)` : ''} ${recommendationMode === 'guided' ? '(mode otomatis)' : `untuk target ${resolvedTargetLabel}`}`}
              </p>
            </div>
            {loading && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-accent/20 rounded-xl border border-accent/30">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                <span className="text-accent font-poppins text-sm font-semibold">Memuat...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-5 bg-gradient-to-r from-red-500/20 to-rose-500/20 border-2 border-red-500/40 rounded-xl text-red-200 font-poppins flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1 text-lg">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {manualSplitPreset && (
            <div className="mb-5 rounded-xl border border-cyan-500/35 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100/95 font-poppins leading-relaxed">
              <span className="font-semibold text-white">Metode dipilih ({splitPresetLabelMap[manualSplitPreset]}): </span>
              Daftar dipersempit ke gerakan inti yang punya ilustrasi, mengikuti pola{' '}
              <span className="text-white font-semibold">{methodOptions.find((m) => m.id === selectedMethod)?.label ?? selectedMethod}</span>.
              {exercises.length > 0 && (
                <span className="text-cyan-200/80"> · {displayedExercises.length} dari {filteredExercises.length} latihan ditampilkan{filteredExercises.length !== exercises.length ? ` (dari ${exercises.length} total)` : ''}.</span>
              )}
            </div>
          )}

          <div className="mb-5 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-gray-300 font-poppins leading-relaxed">
            <span className="font-semibold text-white">Catat aktivitas: </span>
            Tekan <span className="text-emerald-200 font-semibold">Saya melakukan latihan ini</span> pada gerakan yang baru saja Anda lakukan — langsung tersimpan di tab{' '}
            <span className="text-white font-semibold">Riwayat</span> dikelompokkan per tanggal. Anda bisa mencatat beberapa kali sehari.
          </div>

          {activityInlineMsg && (
            <div
              className={`mb-5 rounded-2xl border-2 px-4 py-3 font-poppins text-sm ${
                activityInlineMsg.includes('tersimpan ke riwayat')
                  ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-100'
                  : 'border-red-500/40 bg-red-950/30 text-red-100'
              }`}
            >
              {activityInlineMsg}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="relative inline-block mb-6">
                <Loader2 className="w-16 h-16 text-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-accent/50" />
                </div>
              </div>
              <p className="text-gray-300 font-poppins text-lg mb-2">Memuat rekomendasi latihan...</p>
              <p className="text-gray-400 font-poppins text-sm">Menerjemahkan instruksi ke bahasa Indonesia...</p>
            </div>
          ) : displayedExercises.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {displayedExercises.map((exercise, index) => {
                const difficultyColor = difficultyColors[exercise.difficulty] || difficultyColors['beginner']
                const logKey = activityLoggedKey(exercise.name)
                const alreadyToday = loggedActivityKeys.includes(logKey)
                const savingThis = savingExerciseName === exercise.name
                return (
                  <div
                    key={`${exercise.name}-${index}`}
                    className={`bg-white/5 rounded-2xl overflow-hidden border-2 transition-all group ${
                      alreadyToday
                        ? 'border-emerald-500/40 shadow-md shadow-emerald-900/15'
                        : 'border-white/10 hover:border-accent/50 hover:bg-white/10 hover:shadow-2xl'
                    }`}
                  >
                    {/* Exercise Image */}
                    <div className="relative w-full h-56 overflow-hidden bg-gradient-to-br from-accent/20 to-secondary/20">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailExercise(exercise)
                          setShowVideo(true) // Reset state ketika membuka detail exercise baru
                        }}
                        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-lg border border-white/30 bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-black/60 transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Detail
                      </button>
                      <img
                        src={exercise.imageUrl}
                        alt={`${exercise.name} - Latihan ${exercise.muscle}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          const parent = target.closest('.relative')
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-image')
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex'
                            }
                            target.style.display = 'none'
                          }
                        }}
                      />
                      {/* Fallback jika gambar gagal load */}
                      <div 
                        className="fallback-image w-full h-full flex flex-col items-center justify-center"
                        style={{ 
                          display: 'none',
                          background: `linear-gradient(135deg, 
                            rgba(217, 119, 6, 0.4) 0%, 
                            rgba(139, 69, 19, 0.5) 50%, 
                            rgba(217, 119, 6, 0.4) 100%)`
                        }}
                      >
                        <div className="relative">
                          <Dumbbell className="w-24 h-24 text-white/80 mb-2" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 border-4 border-white/30 rounded-full animate-pulse" />
                          </div>
                        </div>
                        <p className="text-white/70 text-sm font-poppins mt-2 text-center px-4">
                          {exercise.equipment}
                        </p>
                      </div>
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
                      {/* Exercise name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                        <h3 className="text-xl font-oswald font-bold text-white drop-shadow-2xl mb-1">
                          {exercise.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <div className={`px-2 py-1 rounded-lg ${difficultyColor.bg} ${difficultyColor.border} border`}>
                            <span className={`text-xs font-poppins font-semibold ${difficultyColor.text}`}>
                              {exercise.difficulty === 'beginner' ? 'Pemula' : 
                               exercise.difficulty === 'intermediate' ? 'Menengah' : 
                               exercise.difficulty === 'expert' ? 'Lanjutan' : 
                               exercise.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      {/* Equipment & Difficulty Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-5">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-accent/20 rounded-full border border-accent/40">
                          <Dumbbell className="w-4 h-4 text-accent" />
                          <span className="text-white font-poppins text-xs font-semibold capitalize">
                            {exercise.equipment}
                          </span>
                        </div>
                        <div className={`px-4 py-2 rounded-full border ${difficultyColor.bg} ${difficultyColor.border}`}>
                          <span className={`text-xs font-poppins font-semibold ${difficultyColor.text} flex items-center space-x-1`}>
                            <Zap className="w-3 h-3" />
                            <span>
                              {exercise.difficulty === 'beginner' ? 'Pemula' : 
                               exercise.difficulty === 'intermediate' ? 'Menengah' : 
                               exercise.difficulty === 'expert' ? 'Lanjutan' : 
                               exercise.difficulty}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="pt-4 border-t-2 border-white/10">
                        <div className="flex items-center space-x-2 mb-3">
                          <Info className="w-4 h-4 text-accent" />
                          <h4 className="text-white font-oswald font-bold text-sm">Instruksi:</h4>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <p className="text-gray-300 text-sm font-poppins leading-relaxed whitespace-pre-line">
                            {exercise.instructions}
                          </p>
                        </div>
                      </div>

                      {exercise.recommendation && (
                        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3">
                          <p className="text-accent font-semibold text-xs font-poppins uppercase tracking-wide mb-2">
                            Rekomendasi untuk {exercise.recommendation.goal}
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-200 font-poppins">
                            <div>
                              <p className="text-gray-400">Set</p>
                              <p className="font-semibold">{exercise.recommendation.setRange}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Repetisi</p>
                              <p className="font-semibold">{exercise.recommendation.repRange}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Istirahat</p>
                              <p className="font-semibold">{exercise.recommendation.restSeconds}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => void logActivityImmediate(exercise)}
                        disabled={savingThis}
                        className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-poppins font-semibold text-sm transition-all disabled:opacity-70 ${
                          alreadyToday
                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                            : 'border-white/20 bg-white/5 text-white hover:border-accent/45 hover:bg-accent/15'
                        }`}
                      >
                        {savingThis ? (
                          <>
                            <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                            Menyimpan…
                          </>
                        ) : alreadyToday ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            Sudah dicatat hari ini — ketuk lagi untuk mencatat ulang
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-5 h-5 shrink-0" />
                            Saya melakukan latihan ini
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : filteredExercises.length > 0 && manualSplitPreset ? (
            <div className="text-center py-16 rounded-xl border border-amber-500/30 bg-amber-950/20 px-6">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <p className="text-amber-100 font-poppins text-lg mb-2 font-semibold">
                Tidak ada latihan berilustrasi yang cocok untuk metode ini
              </p>
              <p className="text-gray-400 font-poppins text-sm max-w-md mx-auto mb-4">
                Untuk metode yang dipilih, kami hanya menampilkan gerakan yang punya gambar di aplikasi. Coba tekan &quot;Gunakan Mode Otomatis&quot; pada metode,
                atau pilih target otot lain agar lebih banyak nama latihan match ke ilustrasi.
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="p-6 bg-white/5 rounded-full inline-block mb-4">
                <Dumbbell className="w-16 h-16 text-gray-500" />
              </div>
              <p className="text-gray-400 font-poppins text-lg mb-2">
                Tidak ada latihan ditemukan
              </p>
              <p className="text-gray-500 font-poppins text-sm">
                Coba pilih target latihan lain
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {recommendationMode === 'target' && !selectedTarget && (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-12 md:p-16 border-2 border-white/20 text-center">
          <div className="p-6 bg-accent/20 rounded-full inline-block mb-6">
            <Target className="w-16 h-16 text-accent" />
          </div>
          <h3 className="text-2xl font-oswald font-bold text-white mb-3">
            Pilih Target Latihan
          </h3>
          <p className="text-gray-400 font-poppins text-lg max-w-md mx-auto">
            Pilih target latihan di atas untuk mendapatkan rekomendasi latihan yang sesuai dengan tujuan Anda
          </p>
        </div>
      )}
        </>
      )}

      {detailExercise &&
        (() => {
          const galleryUrls = getExerciseGalleryUrls(detailExercise)
          const safeSlide = Math.min(detailSlideIndex, Math.max(0, galleryUrls.length - 1))
          const activeSrc = galleryUrls[safeSlide] ?? galleryUrls[0]
          const zoom =
            ZOOM_LEVELS[Math.min(Math.max(0, detailZoomIdx), ZOOM_LEVELS.length - 1)]
          const goPrev = () =>
            setDetailSlideIndex((i) => Math.max(0, i - 1))
          const goNext = () =>
            setDetailSlideIndex((i) => Math.min(galleryUrls.length - 1, i + 1))
          const zoomOut = () =>
            setDetailZoomIdx((z) => Math.max(0, z - 1))
          const zoomIn = () =>
            setDetailZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))

          return (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 md:p-8 overflow-y-auto"
              onClick={() => setDetailExercise(null)}
              role="dialog"
              aria-modal="true"
              aria-label={`Detail ${detailExercise.name}`}
            >
              <div
                className="mx-auto w-full max-w-5xl rounded-2xl border border-white/20 bg-slate-900/95 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div>
                    <h3 className="text-2xl font-oswald font-bold text-white">{detailExercise.name}</h3>
                    {galleryUrls.length > 1 && (
                      <p className="text-xs font-poppins text-gray-400 mt-1">
                        {galleryUrls.length} foto · gunakan tombol atau panah kiri/kanan
                      </p>
                    )}
                  </div>
                  <button
                      type="button"
                      onClick={() => {
                        setDetailExercise(null)
                        setShowVideo(true) // Reset state ketika menutup modal
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                    <X className="w-4 h-4" />
                    Tutup
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-0">
                  {/* Bagian Kiri: Toggle Video / Gambar */}
                  <div className="relative flex flex-col bg-gradient-to-br from-accent/10 to-secondary/10 border-b lg:border-b-0 lg:border-r border-white/10">
                    {/* Toggle Button (hanya jika ada video) */}
                    {(() => {
                      const normalizedName = normalizeExerciseName(detailExercise.name);
                      const video = EXERCISE_VIDEO_MAP[detailExercise.name] || EXERCISE_VIDEO_MAP[normalizedName];
                      return !!video;
                    })() && (
                      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 border-b border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={() => setShowVideo(true)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            showVideo
                              ? 'bg-accent text-white'
                              : 'bg-white/10 text-gray-200 hover:bg-white/20'
                          }`}
                        >
                          Tutorial Video
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVideo(false)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            !showVideo
                              ? 'bg-accent text-white'
                              : 'bg-white/10 text-gray-200 hover:bg-white/20'
                          }`}
                        >
                          Gambar Latihan
                        </button>
                      </div>
                    )}
                    
                    {/* Konten Utama: Video atau Gambar */}
                    {(() => {
                      const normalizedName = normalizeExerciseName(detailExercise.name);
                      const video = EXERCISE_VIDEO_MAP[detailExercise.name] || EXERCISE_VIDEO_MAP[normalizedName];
                      return !!video && showVideo;
                    })() ? (
                      <div className="flex flex-col flex-1">
                        <div className="flex-1 p-4 flex items-center justify-center">
                          {(() => {
                            const normalizedName = normalizeExerciseName(detailExercise.name);
                            const video = EXERCISE_VIDEO_MAP[detailExercise.name] || EXERCISE_VIDEO_MAP[normalizedName];
                            if (!video) return null;
                            let src = `https://www.youtube.com/embed/${video.videoId}?rel=0&modestbranding=1&cc_load_policy=1`;
                            if (video.startSeconds > 0) {
                              src += `&start=${video.startSeconds}`;
                            }
                            if (video.endSeconds < 9999) {
                              src += `&end=${video.endSeconds}`;
                            }
                            return (
                              <iframe
                                width="100%"
                                height="100%"
                                style={{ minHeight: '360px' }}
                                src={src}
                                title={`Tutorial ${detailExercise.name}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="rounded-xl border border-white/10"
                              ></iframe>
                            );
                          })()}
                        </div>

                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-black/20">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={zoomOut}
                              disabled={detailZoomIdx <= 0}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                              title="Perkecil"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-mono text-gray-300 min-w-[3rem] text-center">
                              {Math.round(zoom * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={zoomIn}
                              disabled={detailZoomIdx >= ZOOM_LEVELS.length - 1}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
                              title="Perbesar"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-xs font-poppins text-gray-400">
                            Geser foto{galleryUrls.length > 1 ? ` · ${safeSlide + 1} / ${galleryUrls.length}` : ''}
                          </div>
                        </div>

                        <div className="relative overflow-auto max-h-[min(70vh,560px)] min-h-[280px] flex items-start justify-center p-4">
                          {galleryUrls.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={goPrev}
                                disabled={safeSlide <= 0}
                                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/50 p-2 text-white hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none"
                                aria-label="Foto sebelumnya"
                              >
                                <ChevronLeft className="w-6 h-6" />
                              </button>
                              <button
                                type="button"
                                onClick={goNext}
                                disabled={safeSlide >= galleryUrls.length - 1}
                                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/30 bg-black/50 p-2 text-white hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none"
                                aria-label="Foto berikutnya"
                              >
                                <ChevronRight className="w-6 h-6" />
                              </button>
                            </>
                          )}
                          <div
                            className="inline-flex max-w-full transition-transform duration-200 origin-top"
                            style={{ transform: `scale(${zoom})` }}
                          >
                            <img
                              key={`${detailExercise.name}-${safeSlide}-${activeSrc}`}
                              src={activeSrc}
                              alt={`${detailExercise.name} · langkah ${safeSlide + 1}`}
                              className="max-w-[min(100vw-4rem,720px)] w-auto h-auto object-contain"
                              draggable={false}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = getExerciseImageUrl(
                                  detailExercise.name || 'exercise',
                                  detailExercise.equipment || 'body weight',
                                  detailExercise.muscle || 'general'
                                )
                              }}
                            />
                          </div>
                        </div>

                        {galleryUrls.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto px-3 py-2 border-t border-white/10 bg-black/25">
                            {galleryUrls.map((thumbSrc, ti) => (
                              <button
                                key={`${thumbSrc}-${ti}`}
                                type="button"
                                onClick={() => setDetailSlideIndex(ti)}
                                className={`relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                                  ti === safeSlide
                                    ? 'border-accent ring-2 ring-accent/40'
                                    : 'border-white/15 hover:border-white/40'
                                }`}
                              >
                                <img
                                  src={thumbSrc}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).style.opacity = '0.3'
                                  }}
                                />
                                <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[10px] text-white rounded-tl">
                                  {ti + 1}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bagian Kanan: Informasi, Gambar (jika ada video), dan Instruksi */}
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border border-accent/40 bg-accent/20 text-accent-light capitalize">
                        {detailExercise.equipment}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border border-white/20 bg-white/10 text-gray-200 capitalize">
                        {detailExercise.muscle}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border border-white/20 bg-white/10 text-gray-200 capitalize">
                        {detailExercise.difficulty}
                      </span>
                    </div>

                    {/* Rekomendasi Beban */}
                    {(() => {
                      const recommendation = getWeightRecommendation(detailExercise);
                      return (
                        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 p-4">
                          <h4 className="text-sm font-semibold tracking-wide uppercase text-accent mb-3">Rekomendasi Beban</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                                Pemula
                              </span>
                              <span className="text-sm text-gray-200">
                                {recommendation.beginner}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                Menengah
                              </span>
                              <span className="text-sm text-gray-200">
                                {recommendation.intermediate}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                                Lanjutan
                              </span>
                              <span className="text-sm text-gray-200">
                                {recommendation.expert}
                              </span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/10">
                              <p className="text-xs text-gray-300">
                                💡 {recommendation.tips}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}



                    <h4 className="text-sm font-semibold tracking-wide uppercase text-gray-400 mb-2">Instruksi Gerakan</h4>
                    <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                        {detailExercise.instructions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {methodInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-slate-900/95 p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-2xl font-oswald font-bold text-white">
                {methodOptions.find((m) => m.id === methodInfoOpen)?.label}
              </h3>
              <button
                onClick={() => setMethodInfoOpen(null)}
                className="text-gray-300 hover:text-white text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-2 text-sm font-poppins text-gray-200">
              <p><span className="text-gray-400">Gambaran:</span> {methodInfoContent[methodInfoOpen].summary}</p>
              <p><span className="text-gray-400">Ciri program:</span> {methodInfoContent[methodInfoOpen].suitable}</p>
              <p><span className="text-gray-400">Frekuensi umum:</span> {methodInfoContent[methodInfoOpen].frequency}</p>
              <p><span className="text-gray-400">Catatan:</span> {methodInfoContent[methodInfoOpen].note}</p>
            </div>
            <button
              onClick={() => {
                setManualSplitPreset(defaultPresetByMethod[methodInfoOpen])
                setMethodInfoOpen(null)
              }}
              className="mt-5 rounded-lg bg-accent px-4 py-2 text-white font-semibold hover:bg-accent-light transition-colors"
            >
              Pakai Metode Ini
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
