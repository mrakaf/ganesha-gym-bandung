export const dynamic = 'force-dynamic';
import { AdminReportController } from '@/src/controllers/admin/report-controller'

const adminReportController = new AdminReportController()

export async function GET() {
  return adminReportController.dashboardStats()
}

