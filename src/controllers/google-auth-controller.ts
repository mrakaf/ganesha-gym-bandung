import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { BaseController } from '@/src/controllers/base-controller'
import { AppError } from '@/src/models/app-error'
import { GoogleAuthService } from '@/src/services/google-auth-service'

export class GoogleAuthController extends BaseController {
  constructor(private readonly authService: GoogleAuthService = new GoogleAuthService()) {
    super()
  }

  async authorize() {
    try {
      const { authUrl } = this.authService.getAuthorizationUrl()
      return NextResponse.redirect(authUrl)
    } catch (error) {
      if (error instanceof AppError) {
        return this.json({ error: error.message }, { status: error.statusCode })
      }
      return this.handleError(error, 'Error generating Google OAuth URL:', 'Gagal membuat URL autentikasi Google')
    }
  }

  async callback(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const result = await this.authService.exchangeCode({
      code: searchParams.get('code'),
      error: searchParams.get('error'),
    })

    if (result.accessToken) {
      const cookieStore = await cookies()
      cookieStore.set('google_access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60,
        path: '/',
      })
      if (result.refreshToken) {
        cookieStore.set('google_refresh_token', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        })
      }
    }

    return NextResponse.redirect(result.redirectTo)
  }
}

