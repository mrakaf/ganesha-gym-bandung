import { NextRequest } from 'next/server'
import { PasswordResetLinkController } from '@/src/controllers/member/password-reset-link-controller'

const passwordResetLinkController = new PasswordResetLinkController()

export async function POST(request: NextRequest) {
  return passwordResetLinkController.requestLink(request)
}

