export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { GoogleAuthController } from '@/src/controllers/google-auth-controller'

/**
 * API Route untuk Google OAuth Callback
 * Endpoint: GET /api/auth/google/callback
 * 
 * Handle callback dari Google OAuth dan simpan tokens
 */

const googleAuthController = new GoogleAuthController()

export async function GET(request: NextRequest) {
  return googleAuthController.callback(request)
}

