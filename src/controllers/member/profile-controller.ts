import { NextRequest } from 'next/server'
import { MemberService } from '@/src/services/member-service'
import { MemberBaseController } from '@/src/controllers/member/base'

export class ProfileController extends MemberBaseController {
  constructor(memberService: MemberService = new MemberService()) {
    super(memberService)
  }

  async update(request: NextRequest) {
    try {
      const body = await request.json().catch(() => null)
      const member = await this.memberService.updateMemberByEmail(body?.email, {
        name: body?.name,
        phone: body?.phone,
        height: body?.height,
        weight: body?.weight,
        gymExperienceMonths: body?.gymExperienceMonths,
        gender: body?.gender,
        dateOfBirth: body?.dateOfBirth,
        age: body?.age,
      })
      return this.json({ success: true, member })
    } catch (error) {
      return this.handleError(error, 'Error updating member:', 'Gagal memperbarui data member')
    }
  }

  async getProfile(request: NextRequest) {
    try {
      const email = request.nextUrl.searchParams.get('email')
      const username = request.nextUrl.searchParams.get('username')
      const member = await this.memberService.getProfile(email, username)
      return this.json({ success: true, member })
    } catch (error) {
      return this.handleError(error, 'Error fetching profile:', 'Gagal mengambil profile member')
    }
  }
}

