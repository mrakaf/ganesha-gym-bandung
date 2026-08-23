export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { AdminMemberController } from '@/src/controllers/admin/member-controller'

const adminMemberController = new AdminMemberController()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return adminMemberController.detail(params.id)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return adminMemberController.update(request, params.id)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    {
      success: false,
      error: 'Fitur hapus member dinonaktifkan. Member yang jatuh tempo lebih dari 14 hari akan otomatis dinonaktifkan (status Nonaktif).',
    },
    { status: 405 }
  )
}

