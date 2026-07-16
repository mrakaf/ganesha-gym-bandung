export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminReportController } from '@/src/controllers/admin/report-controller'

const adminReportController = new AdminReportController()

export async function GET(request: NextRequest) {
  return adminReportController.financialReport(request)
}
