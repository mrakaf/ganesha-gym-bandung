export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { WorkoutSessionController } from '@/src/controllers/member/workout-session-controller'

const controller = new WorkoutSessionController()

export async function POST(request: NextRequest) {
  return controller.log(request)
}
