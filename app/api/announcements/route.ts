import { prisma } from '@/lib/db'

export async function GET() {
  try {
    let latestAnnouncement = null
    try {
      // Try first with expiresAt filter
      latestAnnouncement = await prisma.announcement.findFirst({
        orderBy: {
          sentAt: 'desc',
        },
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      })
    } catch (e) {
      // If that fails (column doesn't exist), try without filter
      console.log('expiresAt column might not exist, falling back to simple query')
      latestAnnouncement = await prisma.announcement.findFirst({
        orderBy: {
          sentAt: 'desc',
        },
      })
    }

    return Response.json({
      success: true,
      announcement: latestAnnouncement,
    })
  } catch (error) {
    console.error('Error fetching latest announcement:', error)
    return Response.json(
      { error: 'Gagal mengambil pengumuman' },
      { status: 500 }
    )
  }
}
