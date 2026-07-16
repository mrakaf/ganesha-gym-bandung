import { NextRequest } from 'next/server'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminReportController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async dashboardStats() {
    try {
      await this.requireCurrentAdmin()
      const stats = await this.adminService.getDashboardStats()
      return this.json(stats)
    } catch (error) {
      return this.handleError(error, 'Error getting dashboard stats:', 'Gagal mendapatkan statistik dashboard')
    }
  }

  async financialReport(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const searchParams = new URL(request.url).searchParams
      const report = await this.adminService.getFinancialReport(
        searchParams.get('startDate'),
        searchParams.get('endDate')
      )
      return this.json(report)
    } catch (error) {
      return this.handleError(error, 'laporan keuangan:', 'Gagal memuat laporan')
    }
  }
}

