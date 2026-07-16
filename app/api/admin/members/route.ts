export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminMemberController } from '@/src/controllers/admin/member-controller'

const adminMemberController = new AdminMemberController()

export async function GET(request: NextRequest) {
  return adminMemberController.list(request)
}

// POST - Create member
export async function POST(request: NextRequest) {
  return adminMemberController.create(request)
}

