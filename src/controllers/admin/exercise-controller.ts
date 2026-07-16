import { NextRequest } from 'next/server'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminExerciseController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async list() {
    try {
      await this.requireCurrentAdmin()
      const { exercises, count } = await this.adminService.listExercises()
      return this.json({ success: true, exercises, count })
    } catch (error) {
      return this.handleError(error, 'Error fetching exercises:', 'Gagal mengambil data exercises')
    }
  }

  async updateInstruction(request: NextRequest, id: string) {
    try {
      await this.requireCurrentAdmin()
      const body = await request.json()
      const exercise = await this.adminService.updateExerciseInstruction(id, body?.instructionsId)
      return this.json({ success: true, exercise })
    } catch (error) {
      return this.handleError(error, 'Error updating exercise:', 'Gagal mengupdate exercise')
    }
  }
}

