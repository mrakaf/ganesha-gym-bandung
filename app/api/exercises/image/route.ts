export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { ExerciseImageController } from '@/src/controllers/exercise-image-controller'

/**
 * API Route untuk mendapatkan gambar latihan
 * Menggunakan placeholder service yang reliable
 * 
 * Endpoint: GET /api/exercises/image?exercise={name}&equipment={equipment}&muscle={muscle}
 */

const exerciseImageController = new ExerciseImageController()

export async function GET(request: NextRequest) {
  return exerciseImageController.show(request)
}
