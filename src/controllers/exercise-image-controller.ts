import { NextRequest, NextResponse } from 'next/server'
import { BaseController } from '@/src/controllers/base-controller'
import { ExerciseImageService } from '@/src/services/exercise-image-service'

export class ExerciseImageController extends BaseController {
  constructor(private readonly imageService: ExerciseImageService = new ExerciseImageService()) {
    super()
  }

  async show(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const svg = this.imageService.generateSvg({
        exercise: searchParams.get('exercise'),
        equipment: searchParams.get('equipment'),
        muscle: searchParams.get('muscle'),
      })
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch (error: any) {
      return this.json({ error: 'Gagal generate gambar', details: error?.message }, { status: 500 })
    }
  }
}

