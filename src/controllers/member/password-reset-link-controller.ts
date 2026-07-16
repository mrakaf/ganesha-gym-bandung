import { NextRequest } from 'next/server'
import { MemberService } from '@/src/services/member-service'
import { MemberBaseController } from '@/src/controllers/member/base'

export class PasswordResetLinkController extends MemberBaseController {
  constructor(memberService: MemberService = new MemberService()) {
    super(memberService)
  }

  async requestLink(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      await this.memberService.requestPasswordReset(body?.email, request.nextUrl.origin)
      return this.json({
        success: true,
        message: 'Jika email terdaftar, kami akan mengirim link reset password.',
      })
    } catch (error) {
      return this.handleError(error, 'Forgot password error:', 'Gagal memproses permintaan lupa password')
    }
  }

  async reset(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const result = await this.memberService.resetPassword(body?.token, body?.password)
      return this.json({
        success: true,
        message: 'Password berhasil direset. Silakan login kembali.',
        username: result.username,
      })
    } catch (error) {
      return this.handleError(error, 'Reset password error:', 'Gagal reset password')
    }
  }
}

