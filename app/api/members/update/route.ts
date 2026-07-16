export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { ProfileController } from '@/src/controllers/member/profile-controller'

const profileController = new ProfileController()

export async function POST(request: NextRequest) {
  return profileController.update(request)
}

