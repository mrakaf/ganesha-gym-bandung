import { NextRequest } from 'next/server'
import { MemberService } from '@/src/services/member-service'
import { MemberBaseController } from '@/src/controllers/member/base'

export class AuthenticatedSessionController extends MemberBaseController {
  constructor(memberService: MemberService = new MemberService()) {
    super(memberService)
  }

  async login(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const member = await this.memberService.loginWithUsername(body?.username, body?.password)
      return this.json({ success: true, member })
    } catch (error) {
      return this.handleError(error, 'Error logging in member:', 'Gagal melakukan login')
    }
  }

  async register(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const member = await this.memberService.registerMember({
        name: body?.name,
        email: body?.email,
        username: body?.username,
        password: body?.password,
      })
      return this.json({ success: true, member })
    } catch (error) {
      return this.handleError(error, 'Error registering member:', 'Gagal melakukan registrasi')
    }
  }

  async check(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const result = await this.memberService.checkOrCreateByEmail(body?.email, body?.name)
      return this.json(result)
    } catch (error) {
      return this.handleError(error, 'Error checking member:', 'Gagal memproses data member')
    }
  }
}

