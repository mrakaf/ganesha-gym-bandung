import { NextRequest } from 'next/server'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminMemberController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async list(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const searchParams = request.nextUrl.searchParams
      const data = await this.adminService.listMembers({
        search: searchParams.get('search') || '',
        filter: searchParams.get('filter') || 'all',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
      })
      return this.json(data)
    } catch (error) {
      return this.handleError(error, 'Error getting members:', 'Gagal mendapatkan data members')
    }
  }

  async create(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const body = await request.json()
      const member = await this.adminService.createMember(body)
      return this.json({ member }, { status: 201 })
    } catch (error) {
      return this.handleError(error, 'Error creating member:', 'Gagal membuat member')
    }
  }

  async detail(id: string) {
    try {
      await this.requireCurrentAdmin()
      console.log('Fetching member with id:', id)
      const member = await this.adminService.getMemberDetail(id)
      console.log('Member found:', member)
      return this.json({ member })
    } catch (error) {
      console.error('Error getting member detail:', error)
      return this.handleError(error, 'Error getting member:', 'Gagal mendapatkan data member')
    }
  }

  async update(request: NextRequest, id: string) {
    try {
      await this.requireCurrentAdmin()
      const body = await request.json()
      const member = await this.adminService.updateMember(id, body)
      return this.json({ member })
    } catch (error) {
      return this.handleError(error, 'Error updating member:', 'Gagal mengupdate member')
    }
  }

  async remove(id: string) {
    try {
      await this.requireCurrentAdmin()
      await this.adminService.deleteMember(id)
      return this.json({ success: true, message: 'Member berhasil dihapus' })
    } catch (error) {
      return this.handleError(error, 'Error deleting member:', 'Gagal menghapus member')
    }
  }
}

