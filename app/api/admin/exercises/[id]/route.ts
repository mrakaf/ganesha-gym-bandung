export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminExerciseController } from '@/src/controllers/admin/exercise-controller'

const adminExerciseController = new AdminExerciseController()

// PUT: Update translation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return adminExerciseController.updateInstruction(request, params.id)
}

