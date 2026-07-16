import { AdminAuthController } from '@/src/controllers/admin/auth-controller'

const adminAuthController = new AdminAuthController()

export async function POST() {
  return adminAuthController.logout()
}

