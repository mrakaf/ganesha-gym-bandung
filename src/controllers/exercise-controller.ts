import { NextRequest } from 'next/server'
import { AppError } from '@/src/models/app-error'
import { ExerciseService } from '@/src/services/exercise-service'
import { BaseController } from '@/src/controllers/base-controller'
import { ExerciseQuery } from '@/src/models/exercise'

export class ExerciseController extends BaseController {
  constructor(private readonly exerciseService: ExerciseService = new ExerciseService()) {
    super()
  }

  async list(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const query: ExerciseQuery = {
        email: searchParams.get('email'),
        muscle: searchParams.get('muscle'),
        type: searchParams.get('type'),
        difficulty: searchParams.get('difficulty'),
        goal: searchParams.get('goal'),
        level: searchParams.get('level'),
        gender: searchParams.get('gender'),
      }
      const data = await this.exerciseService.getExercises(query)
      return this.json(data)
    } catch (error) {
      if (error instanceof AppError) {
        return this.json({ error: error.message }, { status: error.statusCode })
      }
      return this.handleError(error, 'Error fetching exercises:', 'Terjadi kesalahan saat mengambil exercises')
    }
  }
}

