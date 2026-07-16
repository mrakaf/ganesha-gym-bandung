export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminAuthController } from '@/src/controllers/admin/auth-controller'

const adminAuthController = new AdminAuthController()

export async function POST(request: NextRequest) {
  return adminAuthController.login(request)
}

