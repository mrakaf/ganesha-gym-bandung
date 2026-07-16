import { NextRequest } from 'next/server'
import { AdminService } from '@/src/services/admin-service'
import { AdminBaseController } from '@/src/controllers/admin/base'

export class AdminPaymentController extends AdminBaseController {
  constructor(adminService: AdminService = new AdminService()) {
    super(adminService)
  }

  async list(request: NextRequest) {
    try {
      await this.requireCurrentAdmin()
      const searchParams = request.nextUrl.searchParams
      const data = await this.adminService.listPayments({
        search: searchParams.get('search') || undefined,
        status: searchParams.get('status') || undefined,
        type: searchParams.get('type') || undefined,
        paymentMethod: searchParams.get('paymentMethod') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '20',
      })
      return this.json(data)
    } catch (error) {
      return this.handleError(error, 'Error getting payments:', 'Gagal mendapatkan data payments')
    }
  }

  async confirmCash(id: string) {
    try {
      await this.requireCurrentAdmin()
      await this.adminService.confirmCashPayment(id)
      return this.json({ success: true })
    } catch (error) {
      return this.handleError(error, 'Confirm cash payment error:', 'Gagal mengonfirmasi pembayaran')
    }
  }
}

