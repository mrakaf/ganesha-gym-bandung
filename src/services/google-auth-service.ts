import { google } from 'googleapis'
import { AppError } from '@/src/models/app-error'
import { GoogleAuthCallbackInput, GoogleAuthStartResult } from '@/src/models/google-auth'

export class GoogleAuthService {
  private getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  private getOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    if (!clientId || !clientSecret) {
      throw new AppError(
        'Google Calendar API credentials tidak ditemukan. Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah dikonfigurasi di .env.local',
        500
      )
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  }

  getAuthorizationUrl(): GoogleAuthStartResult {
    const oauth2Client = this.getOAuthClient()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      prompt: 'consent',
    })
    return { authUrl }
  }

  async exchangeCode(input: GoogleAuthCallbackInput) {
    if (input.error) {
      return { redirectTo: `${this.getAppUrl()}/visitor/schedule?error=auth_failed` }
    }
    if (!input.code) {
      return { redirectTo: `${this.getAppUrl()}/visitor/schedule?error=no_code` }
    }

    try {
      const oauth2Client = this.getOAuthClient()
      const { tokens } = await oauth2Client.getToken(input.code)
      if (!tokens.access_token) {
        return { redirectTo: `${this.getAppUrl()}/visitor/schedule?error=no_token` }
      }
      return {
        redirectTo: `${this.getAppUrl()}/visitor/schedule?success=connected`,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      }
    } catch {
      return { redirectTo: `${this.getAppUrl()}/visitor/schedule?error=callback_failed` }
    }
  }
}

