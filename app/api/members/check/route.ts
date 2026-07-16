export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AuthenticatedSessionController } from '@/src/controllers/member/authenticated-session-controller'

const authenticatedSessionController = new AuthenticatedSessionController()

export async function POST(request: NextRequest) {
  return authenticatedSessionController.check(request)
}

