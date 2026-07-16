import { NextRequest } from 'next/server'
import { AdminPaymentController } from '@/src/controllers/admin/payment-controller'

const adminPaymentController = new AdminPaymentController()

export async function GET(request: NextRequest) {
  return adminPaymentController.list(request)
}

