export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminExerciseController } from '@/src/controllers/admin/exercise-controller'

const adminExerciseController = new AdminExerciseController()

// GET: List semua exercises
export async function GET(_request: NextRequest) {
  return adminExerciseController.list()
}

