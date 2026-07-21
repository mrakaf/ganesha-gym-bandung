import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { BaseController } from '@/src/controllers/base-controller'
import { AppError } from '@/src/models/app-error'
import { GoogleAuthService } from '@/src/services/google-auth-service'

export class GoogleAuthController extends BaseController {
  constructor(private readonly authService: GoogleAuthService = new GoogleAuthService()) {
    super()
  }

  async authorize(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const email = searchParams.get('email')
      if (!email) {
        throw new AppError('Email parameter wajib diisi', 400)
      }

      const { authUrl } = this.authService.getAuthorizationUrl(email)
      const cookieStore = await cookies()
      // Simpan email di cookie temporary untuk callback nanti
      cookieStore.set('oauth_member_email', email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 menit
        path: '/',
      })
      return NextResponse.redirect(authUrl)
    } catch (error) {
      if (error instanceof AppError) {
        return this.json({ error: error.message }, { status: error.statusCode })
      }
      return this.handleError(error, 'Error generating Google OAuth URL:', 'Gagal membuat URL autentikasi Google')
    }
  }

  async callback(request: NextRequest) {
    const cookieStore = await cookies()
    const searchParams = request.nextUrl.searchParams
    const email = cookieStore.get('oauth_member_email')?.value

    const result = await this.authService.exchangeCode({
      code: searchParams.get('code'),
      error: searchParams.get('error'),
      email,
    })

    // Hapus cookie temporary
    cookieStore.delete('oauth_member_email')
    // Hapus cookie token lama (jika ada)
    cookieStore.delete('google_access_token')
    cookieStore.delete('google_refresh_token')

    return NextResponse.redirect(result.redirectTo)
  }

  async disconnect(request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const email = searchParams.get('email')
      if (!email) {
        throw new AppError('Email parameter wajib diisi', 400)
      }

      await this.authService.disconnect(email)
      return this.json({ success: true })
    } catch (error) {
      if (error instanceof AppError) {
        return this.json({ error: error.message }, { status: error.statusCode })
      }
      return this.handleError(error, 'Error disconnecting Google Calendar:', 'Gagal memutuskan koneksi Google Calendar')
    }
  }
}

