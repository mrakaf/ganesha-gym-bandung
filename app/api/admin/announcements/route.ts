import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { sentAt: 'desc' },
    })

    return Response.json({
      success: true,
      announcements,
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return Response.json(
      { error: 'Gagal mengambil daftar pengumuman' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, expiresAt } = body

    if (!title?.trim() || !content?.trim()) {
      return Response.json(
        { error: 'Judul dan isi pengumuman wajib diisi' },
        { status: 400 }
      )
    }

    // Get total active members for recipient count
    const totalActiveMembers = await prisma.member.count({
      where: { isActive: true },
    })

    const announcementData: any = {
      title: title.trim(),
      content: content.trim(),
      recipientCount: totalActiveMembers,
    }

    if (expiresAt) {
      announcementData.expiresAt = new Date(expiresAt)
    }

    const announcement = await prisma.announcement.create({
      data: announcementData,
    })

    return Response.json({
      success: true,
      message: 'Pengumuman berhasil dikirim',
      announcement,
    })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return Response.json(
      { error: 'Gagal membuat pengumuman' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      await prisma.announcement.deleteMany()
      return Response.json({
        success: true,
        message: 'Semua pengumuman berhasil dihapus',
      })
    }

    if (!id) {
      return Response.json(
        { error: 'ID pengumuman wajib diisi' },
        { status: 400 }
      )
    }

    await prisma.announcement.delete({
      where: { id },
    })

    return Response.json({
      success: true,
      message: 'Pengumuman berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return Response.json(
      { error: 'Gagal menghapus pengumuman' },
      { status: 500 }
    )
  }
}
