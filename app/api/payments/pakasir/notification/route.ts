export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { PaymentController } from '@/src/controllers/payment-controller'

/**
 * Webhook notification dari PaKasir
 * Endpoint: POST /api/payments/pakasir/notification
 *
 * Konfigurasikan URL ini di dashboard proyek PaKasir Anda.
 */
const paymentController = new PaymentController()

export async function POST(request: NextRequest) {
  return paymentController.notification(request)
}

