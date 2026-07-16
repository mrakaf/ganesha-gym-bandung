import { NextRequest } from 'next/server'
import { ExerciseController } from '@/src/controllers/exercise-controller'

const exerciseController = new ExerciseController()

/**
 * API Route untuk fetch exercises dari API Ninjas (ExerciseDB)
 * 
 * Endpoint: GET /api/exercises?muscle={muscle}&type={type}&difficulty={difficulty}
 * 
 * Parameters:
 * - muscle: biceps, triceps, chest, shoulders, back, legs, abs, cardio, dll
 * - type: strength, cardio, stretching, powerlifting, strongman, olympic_weightlifting
 * - difficulty: beginner, intermediate, expert
 * 
 * API Ninjas Documentation: https://api.api-ninjas.com/v1/exercises
 */

export async function GET(request: NextRequest) {
  return exerciseController.list(request)
}

