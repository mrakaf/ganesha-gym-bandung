import { NextRequest } from 'next/server'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminVisitController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async list(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const searchParams = request.nextUrl.searchParams
      const data = await this.adminService.listVisits({
        name: searchParams.get('name') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '20',
      })
      return this.json(data)
    } catch (error) {
      return this.handleError(error, 'Error getting visits:', 'Gagal mendapatkan data visits')
    }
  }

  async create(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const body = await request.json()
      const visit = await this.adminService.createVisit(body)
      return this.json({ visit })
    } catch (error) {
      return this.handleError(error, 'Error creating visit:', 'Gagal membuat visit')
    }
  }

  async update(request: NextRequest, id: string) {
    try {
      await this.requireCurrentAdmin()
      const body = await request.json()
      const visit = await this.adminService.updateVisit(id, body)
      return this.json({ visit })
    } catch (error) {
      return this.handleError(error, 'Error updating visit:', 'Gagal mengupdate visit')
    }
  }

  async delete(_request: NextRequest, id: string) {
    try {
      await this.requireCurrentAdmin()
      const result = await this.adminService.deleteVisit(id)
      return this.json(result)
    } catch (error) {
      return this.handleError(error, 'Error deleting visit:', 'Gagal menghapus visit')
    }
  }
}

