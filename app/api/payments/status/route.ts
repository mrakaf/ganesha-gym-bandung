import { NextRequest } from 'next/server'
import { PaymentController } from '@/src/controllers/payment-controller'

const paymentController = new PaymentController()

export async function GET(request: NextRequest) {
  return paymentController.status(request)
}
