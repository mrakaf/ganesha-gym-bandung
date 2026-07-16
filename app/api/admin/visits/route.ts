export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server'
import { AdminVisitController } from '@/src/controllers/admin/visit-controller'

const adminVisitController = new AdminVisitController()

export async function GET(request: NextRequest) {
  return adminVisitController.list(request)
}

export async function POST(request: NextRequest) {
  return adminVisitController.create(request)
}

