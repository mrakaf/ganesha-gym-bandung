import { prisma } from '@/lib/db'

export async function addAdminNotification(input: {
  type?: string
  title: string
  message: string
  link?: string
}) {
  return await prisma.adminNotification.create({
    data: {
      type: input.type || 'info',
      title: input.title,
      message: input.message,
      link: input.link,
    },
  })
}
