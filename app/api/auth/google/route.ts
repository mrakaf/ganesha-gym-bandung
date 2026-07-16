import { NextRequest } from 'next/server'
import { GoogleAuthController } from '@/src/controllers/google-auth-controller'

/**
 * API Route untuk Google OAuth Authentication
 * Endpoint: GET /api/auth/google
 * 
 * Redirect user ke Google OAuth consent screen
 */

const googleAuthController = new GoogleAuthController()

export async function GET(_request: NextRequest) {
  return googleAuthController.authorize()
}

