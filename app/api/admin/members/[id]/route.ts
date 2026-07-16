
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
  return adminMemberController.remove(params.id)
}

