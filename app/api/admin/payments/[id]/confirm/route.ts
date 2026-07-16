export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminPaymentController } from '@/src/controllers/admin/payment-controller'

const adminPaymentController = new AdminPaymentController()

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return adminPaymentController.confirmCash(params.id)
}
