export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminVisitController } from '@/src/controllers/admin/visit-controller'

const adminVisitController = new AdminVisitController()

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return adminVisitController.update(request, params.id)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return adminVisitController.delete(request, params.id)
}
