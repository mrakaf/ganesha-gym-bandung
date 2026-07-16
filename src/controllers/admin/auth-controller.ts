import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminAuthController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async login(request: NextRequest) {
    const cookieStore = await cookies()
    try {
      const body = await request.json()
      const admin = await this.adminService.login(body?.email, body?.password)
      cookieStore.set('admin_session', admin.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      return this.json({ success: true, admin })
    } catch (error) {
      return this.handleError(error, 'Unexpected error in admin login:', 'Terjadi kesalahan saat login. Silakan coba lagi.')
    }
  }

  async me() {
    try {
      const sessionId = await this.getSessionId()
      const admin = await this.adminService.getCurrentAdmin(sessionId)
      return this.json({ admin })
    } catch (error) {
      return this.handleError(error, 'Unexpected error in /api/admin/me:', 'Terjadi kesalahan saat mendapatkan data admin.')
    }
  }

  async logout() {
    try {
      const cookieStore = await cookies()
      cookieStore.delete('admin_session')
      return this.json({ success: true })
    } catch (error) {
      return this.handleError(error, 'Error logging out admin:', 'Gagal logout')
    }
  }

  async forgotPassword(request: NextRequest) {
    try {
      const body = await request.json()
      await this.adminService.requestPasswordReset(body?.email, request.nextUrl.origin)
      return this.json({
        success: true,
        message: 'Jika email terdaftar, kami akan mengirim link reset password.',
      })
    } catch (error) {
      return this.handleError(error, 'Forgot password error:', 'Gagal memproses permintaan lupa password')
    }
  }

  async resetPassword(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const result = await this.adminService.resetPassword(body?.token, body?.password)
      return this.json({
        success: true,
        message: 'Password berhasil direset. Silakan login kembali.',
        email: result.email,
      })
    } catch (error) {
      return this.handleError(error, 'Reset password error:', 'Gagal reset password')
    }
  }
}

