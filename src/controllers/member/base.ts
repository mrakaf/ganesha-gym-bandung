import { BaseController } from '@/src/controllers/base-controller'
import { MemberService } from '@/src/services/member-service'

export abstract class MemberBaseController extends BaseController {
  constructor(protected readonly memberService: MemberService = new MemberService()) {
    super()
  }
}

