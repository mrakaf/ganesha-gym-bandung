import { AdminAuthController } from '@/src/controllers/admin/auth-controller'

const adminAuthController = new AdminAuthController()

export async function GET() {
  return adminAuthController.me()
}

