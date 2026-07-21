export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { GoogleAuthController } from '@/src/controllers/google-auth-controller'

/**
 * API Route untuk disconnect Google Calendar
 * Endpoint: GET /api/auth/google/disconnect
 */

const googleAuthController = new GoogleAuthController()

export async function GET(request: NextRequest) {
  return googleAuthController.disconnect(request)
}
