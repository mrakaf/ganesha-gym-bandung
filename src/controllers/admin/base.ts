import { cookies } from 'next/headers'
import { AdminService } from '@/src/services/admin-service'
import { BaseController } from '@/src/controllers/base-controller'

export abstract class AdminBaseController extends BaseController {
  constructor(protected readonly adminService: AdminService = new AdminService()) {
    super()
  }

  protected async getSessionId() {
    const cookieStore = await cookies()
    return cookieStore.get('admin_session')?.value
  }

  protected async requireCurrentAdmin() {
    const sessionId = await this.getSessionId()
    await this.adminService.getCurrentAdmin(sessionId)
  }
}

