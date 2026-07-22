import * as bcrypt from 'bcryptjs'
import { AppError } from '@/src/models/app-error'
import { ListMembersQuery, ListPaymentsQuery } from '@/src/models/admin'
import { AdminRepository } from '@/src/repositories/admin-repository'
import { applyBenefitsForPaidPayment } from '@/src/helpers/payment-activation'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import crypto from 'node:crypto'
import { endOfDay, startOfDay, startOfMonth } from 'date-fns'
import { addAdminNotification } from '@/lib/admin-notifications'

// Helper to sanitize notification for API (simple version)
function sanitizeNotificationForApi(notification: any) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    link: notification.link,
    createdAt: notification.createdAt,
  }
}

export class AdminService {
  constructor(private readonly repo: AdminRepository = new AdminRepository()) {}

  async login(emailRaw: string, password: string) {
    const email = String(emailRaw || '').trim().toLowerCase()
    if (!email || !password) throw new AppError('Email dan password wajib diisi', 400)
    const admin = await this.repo.findUserByEmail(email)
    if (!admin) throw new AppError('Email atau password salah', 401)
    if (!admin.password) throw new AppError('Password admin tidak ditemukan di database.', 500)
    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) throw new AppError('Email atau password salah', 401)
    return { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
  }

  async getCurrentAdmin(sessionId: string | undefined) {
    if (!sessionId) throw new AppError('Unauthorized', 401)
    const admin = await this.repo.findUserByIdMinimal(sessionId)
    if (!admin) throw new AppError('Unauthorized', 401)
    return admin
  }

  async requestPasswordReset(emailRaw: string | undefined, origin: string) {
    const email = String(emailRaw || '').trim().toLowerCase()
    if (!email) return

    const admin = await this.repo.findUserByEmail(email)
    if (!admin?.email) return

    await this.cleanupAdminPasswordResetTokens(admin.id)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = this.sha256Hex(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await this.repo.createAdminPasswordResetToken(admin.id, tokenHash, expiresAt)

    const appBaseUrl = process.env.APP_BASE_URL || origin
    const resetUrl = `${appBaseUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`
    await sendEmail({
      to: admin.email,
      subject: 'Reset Password Admin - Ganesha Gym Bandung',
      html: this.buildAdminResetEmailHtml({
        appBaseUrl,
        resetUrl,
        name: admin.name || 'Admin',
      }),
    })
  }

  async resetPassword(token: string, password: string) {
    if (!token || typeof token !== 'string') throw new AppError('Token reset tidak valid', 400)
    if (!password || password.length < 8) throw new AppError('Password minimal 8 karakter', 400)

    const tokenHash = this.sha256Hex(token)
    const now = new Date()
    const record = await this.repo.findAdminPasswordResetToken(tokenHash)
    if (!record || record.usedAt || record.expiresAt < now) {
      throw new AppError('Link reset sudah tidak berlaku. Silakan minta link baru.', 400)
    }

    const admin = await this.repo.findUserById(record.userId)
    if (!admin) throw new AppError('Admin tidak ditemukan', 404)

    const hashed = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: admin.id },
        data: { password: hashed },
      }),
      prisma.adminPasswordResetToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    ])

    return { email: admin.email }
  }

  private sha256Hex(value: string) {
    const { createHash } = require('crypto')
    return createHash('sha256').update(value).digest('hex')
  }

  private async cleanupAdminPasswordResetTokens(userId: string) {
    await prisma.adminPasswordResetToken.deleteMany({
      where: { userId },
    })
  }

  private buildAdminResetEmailHtml(options: { appBaseUrl: string; resetUrl: string; name: string }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; color: #856404; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ganesha Gym</h1>
            <p>Admin Dashboard</p>
          </div>
          <div class="content">
            <h2>Reset Password</h2>
            <p>Halo ${options.name},</p>
            <p>Kami menerima permintaan untuk reset password akun admin Anda. Klik tombol di bawah untuk membuat password baru:</p>
            <div style="text-align: center;">
              <a href="${options.resetUrl}" class="button">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Atau copy link berikut ke browser Anda:</p>
            <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${options.resetUrl}</p>
            <div class="warning">
              <strong>Perhatian:</strong> Link ini hanya berlaku selama 1 jam. Jika Anda tidak melakukan permintaan ini, abaikan email ini.
            </div>
            <p>Jika tombol tidak bekerja, copy paste link di atas ke browser Anda.</p>
            <p>Terima kasih,<br/>Tim Ganesha Gym</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Ganesha Gym. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  async listMembers(query: ListMembersQuery) {
    const search = query.search || ''
    const filter = query.filter || 'all'
    const page = query.page || 1
    const limit = query.limit || 20
    const skip = (page - 1) * limit
    const where: any = {} // Remove the payments.some filter!
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { memberCardId: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (filter === 'active') where.isActive = true
    else if (filter === 'inactive') where.isActive = false
    else if (filter === 'expired' || filter === 'overdue') {
      where.membershipEnd = { lt: new Date() }
      where.isActive = true
    }
    const [members, total] = await Promise.all([
      this.repo.findMembers(where, skip, limit),
      this.repo.countMembers(where),
    ])
    // Calculate retention status for each member
    const membersWithRetention = members.map((member) => {
      const lastVisitDate = member.visits[0]?.visitDate
      const daysSinceLastVisit = lastVisitDate
        ? Math.floor((new Date().getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
        : null
      
      const membershipEnd = member.membershipEnd
      const daysUntilMembershipEnd = membershipEnd
        ? Math.floor((new Date(membershipEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null
      
      let retentionStatus: 'AMAN' | 'PERLU_DIPERHATIKAN' | 'RISIKO_TINGGI' = 'AMAN'
      if (
        (daysSinceLastVisit && daysSinceLastVisit > 14) ||
        (daysUntilMembershipEnd && daysUntilMembershipEnd <= 7 && daysUntilMembershipEnd > 0)
      ) {
        retentionStatus = 'RISIKO_TINGGI'
      } else if (
        (daysSinceLastVisit && daysSinceLastVisit > 7 && daysSinceLastVisit <=14) ||
        (daysUntilMembershipEnd && daysUntilMembershipEnd <=14 && daysUntilMembershipEnd >7)
      ) {
        retentionStatus = 'PERLU_DIPERHATIKAN'
      }
      
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        username: member.username,
        phone: member.phone,
        memberCardId: member.memberCardId,
        isActive: member.isActive,
        membershipStart: member.membershipStart,
        membershipEnd: member.membershipEnd,
        createdAt: member.createdAt,
        visitCount: member._count.visits,
        paymentCount: member._count.payments,
        lastVisitDate,
        retentionStatus,
      }
    })
    
    return {
      members: membersWithRetention,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async createMember(input: any) {
    const name = String(input?.name || '').trim()
    if (!name) throw new AppError('Nama wajib diisi', 400)
    const email = input?.email ? String(input.email).trim().toLowerCase() : null
    const username = input?.username ? String(input.username).trim() : null
    const memberCardId = input?.memberCardId ? String(input.memberCardId).trim() : null
    if (email && (await this.repo.findMemberByEmail(email))) throw new AppError('Email sudah digunakan', 400)
    if (username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new AppError('Username harus 3-20 karakter, hanya huruf, angka, dan underscore', 400)
      if (await this.repo.findMemberByUsername(username)) throw new AppError('Username sudah digunakan', 400)
    }
    if (memberCardId && (await this.repo.findMemberByCardId(memberCardId))) throw new AppError('Member Card ID sudah digunakan', 400)
    const data = {
      name,
      email,
      username,
      phone: input?.phone ? String(input.phone).trim() : null,
      memberCardId,
      isActive: input?.isActive !== undefined ? !!input.isActive : true,
      membershipStart: input?.membershipStart ? new Date(input.membershipStart) : null,
      membershipEnd: input?.membershipEnd ? new Date(input.membershipEnd) : null,
    }

    const member = memberCardId
      ? await this.repo.createMember(data)
      : await this.repo.createMemberWithAutoCard(data, { cardSuffix: '04' })
    
    // Send admin notification when admin creates a new member
    await addAdminNotification({
      type: 'info',
      title: 'Member Baru Ditambahkan',
      message: `${name} telah ditambahkan sebagai member baru oleh admin.`,
      link: `/admin/members/${member.id}`,
    })

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      username: member.username,
      phone: member.phone,
      memberCardId: member.memberCardId,
      isActive: member.isActive,
      membershipStart: member.membershipStart,
      membershipEnd: member.membershipEnd,
      createdAt: member.createdAt,
      visitCount: member._count.visits,
      paymentCount: member._count.payments,
    }
  }

  async getMemberDetail(id: string) {
    const member = await this.repo.findMemberByIdDetail(id)
    if (!member) throw new AppError('Member tidak ditemukan', 404)
    
    // Calculate retention status and recommendations
    const lastVisitDate = member.visits[0]?.visitDate
    const daysSinceLastVisit = lastVisitDate
      ? Math.floor((new Date().getTime() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    const membershipEnd = member.membershipEnd
    const daysUntilMembershipEnd = membershipEnd
      ? Math.floor((new Date(membershipEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    let retentionStatus: 'AMAN' | 'PERLU_DIPERHATIKAN' | 'RISIKO_TINGGI' = 'AMAN'
    if (
      (daysSinceLastVisit && daysSinceLastVisit > 14) ||
      (daysUntilMembershipEnd && daysUntilMembershipEnd <= 7 && daysUntilMembershipEnd > 0)
    ) {
      retentionStatus = 'RISIKO_TINGGI'
    } else if (
      (daysSinceLastVisit && daysSinceLastVisit > 7 && daysSinceLastVisit <=14) ||
      (daysUntilMembershipEnd && daysUntilMembershipEnd <=14 && daysUntilMembershipEnd >7)
    ) {
      retentionStatus = 'PERLU_DIPERHATIKAN'
    }

    // Generate recommendations
    const retentionRecommendations = []
    if (membershipEnd) {
      const daysUntil = Math.floor((new Date(membershipEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil <= 7 && daysUntil > 0) {
        retentionRecommendations.push({
          type: 'expiring',
          title: 'Membership akan segera berakhir',
          message: `Membership ${member.name} akan berakhir dalam ${daysUntil} hari.`,
          action: 'Kirim email perpanjangan membership',
          emailSubject: `Yuk perpanjang membershipmu! 🎉`,
          emailBody: `<p>Hai ${member.name},</p>
<p>Membershipmu di Ganesha Gym akan segera berakhir! Jangan sampai kehabisan ya!</p>
<p>Kami punya promo spesial buat kamu: Diskon 10% untuk perpanjangan membership! Segera hubungi admin untuk informasi lebih lanjut.</p>
<p>Salam hangat,<br/>Tim Ganesha Gym</p>`
        })
      } else if (daysUntil <= 14 && daysUntil >7) {
        retentionRecommendations.push({
          type: 'expiring',
          title: 'Membership akan segera berakhir',
          message: `Membership ${member.name} akan berakhir dalam ${daysUntil} hari.`,
          action: 'Kirim email peringatan perpanjangan',
          emailSubject: `Reminder: Membershipmu mau habis! 📅`,
          emailBody: `<p>Hai ${member.name},</p>
<p>Ingetin aja nih, membershipmu di Ganesha Gym akan berakhir dalam ${daysUntil} hari!</p>
<p>Silakan perpanjang membershipmu sebelum berakhir ya!</p>
<p>Salam hangat,<br/>Tim Ganesha Gym</p>`
        })
      }
    }

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      username: member.username,
      phone: member.phone,
      memberCardId: member.memberCardId,
      isActive: member.isActive,
      membershipStart: member.membershipStart,
      membershipEnd: member.membershipEnd,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      visitCount: member._count.visits,
      paymentCount: member._count.payments,
      recentVisits: member.visits,
      recentPayments: member.payments,
      lastVisitDate,
      retentionStatus,
      retentionRecommendations,
      emailReminders: (member as any).reminders || []
    }
  }

  async updateMember(id: string, input: any) {
    const existing = await this.repo.findMemberById(id)
    if (!existing) throw new AppError('Member tidak ditemukan', 404)
    const data: any = {}
    if (input.name !== undefined) data.name = input.name
    if (input.phone !== undefined) data.phone = input.phone
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.membershipStart !== undefined) data.membershipStart = input.membershipStart ? new Date(input.membershipStart) : null
    if (input.membershipEnd !== undefined) data.membershipEnd = input.membershipEnd ? new Date(input.membershipEnd) : null
    if (input.email !== undefined && input.email !== existing.email) {
      const email = input.email ? String(input.email).trim().toLowerCase() : null
      if (email && (await this.repo.findMemberByEmail(email))) throw new AppError('Email sudah digunakan oleh member lain', 400)
      data.email = email
    }
    if (input.username !== undefined && input.username !== existing.username) {
      const username = input.username ? String(input.username).trim() : null
      if (username) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new AppError('Username harus 3-20 karakter, hanya huruf, angka, dan underscore', 400)
        if (await this.repo.findMemberByUsername(username)) throw new AppError('Username sudah digunakan oleh member lain', 400)
      }
      data.username = username
    }
    if (input.memberCardId !== undefined && input.memberCardId !== existing.memberCardId) {
      const cardId = input.memberCardId ? String(input.memberCardId).trim() : null
      if (cardId && (await this.repo.findMemberByCardId(cardId))) throw new AppError('Member Card ID sudah digunakan oleh member lain', 400)
      data.memberCardId = cardId
    }
    const member = await this.repo.updateMemberById(id, data)
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      username: member.username,
      phone: member.phone,
      memberCardId: member.memberCardId,
      isActive: member.isActive,
      membershipStart: member.membershipStart,
      membershipEnd: member.membershipEnd,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      visitCount: member._count.visits,
      paymentCount: member._count.payments,
    }
  }

  async deleteMember(id: string) {
    const member = await this.repo.findMemberById(id)
    if (!member) throw new AppError('Member tidak ditemukan', 404)
    await this.repo.deleteMemberById(id)
  }

  async listPayments(query: ListPaymentsQuery) {
    const page = parseInt(String(query.page || '1'))
    const limit = parseInt(String(query.limit || '20'))
    const skip = (page - 1) * limit
    const where: any = {}
    if (query.status) where.status = query.status
    if (query.search) {
      where.OR = [
        { member: { name: { contains: query.search, mode: 'insensitive' } } },
        { member: { email: { contains: query.search, mode: 'insensitive' } } },
        { orderId: { contains: query.search, mode: 'insensitive' } },
      ]
    }
    if (query.type) where.type = query.type === 'MEMBER' ? { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] } : query.type
    if (query.paymentMethod) {
      const pm = String(query.paymentMethod).toLowerCase()
      if (pm === 'qris' || pm === 'cash') where.paymentMethod = pm
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {}
      const utcOffset = 7 * 60 * 60 * 1000 // WIB is UTC+7
      if (query.startDate) {
        const [year, month, day] = query.startDate.split('-').map(Number)
        const startLocal = startOfDay(new Date(year, month - 1, day))
        where.createdAt.gte = new Date(startLocal.getTime() - utcOffset)
      }
      if (query.endDate) {
        const [year, month, day] = query.endDate.split('-').map(Number)
        const endLocal = endOfDay(new Date(year, month - 1, day))
        where.createdAt.lte = new Date(endLocal.getTime() - utcOffset)
      }
    }
    const [payments, total] = await Promise.all([this.repo.findPayments(where, skip, limit), this.repo.countPayments(where)])
    return {
      payments: payments.map((payment) => ({
        id: payment.id,
        memberId: payment.memberId,
        member: payment.member,
        type: payment.type,
        amount: Number(payment.amount),
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        orderId: payment.orderId,
        description: payment.description,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async confirmCashPayment(paymentId: string) {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } })
      if (!payment) throw new AppError('Pembayaran tidak ditemukan', 404)
      if (payment.paymentMethod?.toLowerCase() !== 'cash') throw new AppError('Konfirmasi manual hanya untuk pembayaran tunai', 400)
      if (payment.status !== 'PENDING') throw new AppError('Pembayaran sudah diproses (bukan pending)', 400)
      if (!payment.memberId) {
        throw new AppError(
          'Pembayaran ini tidak terhubung ke data member (memberId kosong). Buat transaksi baru dari halaman pembayaran visitor atau hubungi developer untuk memperbaiki data.',
          400
        )
      }
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date() } })
      await applyBenefitsForPaidPayment(tx, { memberId: payment.memberId, type: payment.type, orderId: payment.orderId, paymentMethod: payment.paymentMethod })
    })
    const settled = await this.repo.findPaymentById(paymentId)
    await this.addNotification({
      type: 'success',
      title: 'Pembayaran tunai dikonfirmasi',
      message: settled?.orderId ? `Pembayaran tunai ${settled.orderId} telah ditandai lunas.` : `Pembayaran tunai ${paymentId.slice(0, 12)}... telah ditandai lunas.`,
      link: '/admin/payments?status=PAID',
    })
  }

  async getDashboardStats() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const dayOfMonth = now.getDate()
    
    const [totalMembers, activeMembers, totalVisits, visitsThisMonth, totalPayments, paymentsThisMonth, pendingPayments, expiredMembers] = await Promise.all([
      this.repo.countMembers({ payments: { some: { type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] } } } }),
      this.repo.countMembers({ isActive: true, payments: { some: { type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] } } } }),
      this.repo.countVisits(),
      this.repo.countVisits({ visitDate: { gte: monthStart } }),
      this.repo.countPayments({ status: 'PAID' }),
      this.repo.countPayments({ status: 'PAID', paidAt: { gte: monthStart } }),
      this.repo.countPayments({ status: 'PENDING', paymentMethod: 'cash' }), // Hanya hitung pending tunai
      this.repo.countMembers({ membershipEnd: { lt: now }, isActive: true, payments: { some: { type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] } } } }),
    ])
    const revenue = await this.repo.aggregateRevenue({ status: 'PAID', paidAt: { gte: monthStart } })
    const overdueMembers = await this.repo.findOverdueMembers(10)
    const trulyOverdue = overdueMembers.filter((member) => {
      const lastPayment = member.payments[0]
      if (!lastPayment || !lastPayment.paidAt || !member.membershipEnd) return true
      return lastPayment.paidAt < member.membershipEnd
    })

    // Generate Chart Data (6 bulan terakhir)
    const chartData = { labels: [] as string[], revenue: [] as number[], visits: [] as number[], memberGrowth: [] as number[] }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const targetMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const targetMonthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59)
      
      // Label bulan
      chartData.labels.push(monthNames[targetDate.getMonth()])
      
      // Revenue bulan ini
      const monthRevenue = await this.repo.aggregateRevenue({
        status: 'PAID',
        paidAt: { gte: targetMonthStart, lte: targetMonthEnd }
      })
      chartData.revenue.push(Number(monthRevenue._sum.amount || 0))
      
      // Kunjungan bulan ini
      const monthVisits = await this.repo.countVisits({
        visitDate: { gte: targetMonthStart, lte: targetMonthEnd }
      })
      chartData.visits.push(monthVisits)

      // Member baru bulan ini (hanya yang punya MEMBERSHIP payment)
      const newMembersThisMonth = await prisma.member.count({
        where: {
          createdAt: {
            gte: targetMonthStart,
            lte: targetMonthEnd
          },
          payments: {
            some: {
              type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] }
            }
          }
        }
      })
      chartData.memberGrowth.push(newMembersThisMonth)
    }

    // Pendapatan Bulan Ini Sejauh Ini
    const revenueSoFar = Number(revenue._sum.amount || 0)

    // 2. Top Members (paling banyak kunjungi, hanya yang punya MEMBERSHIP payment)
    const topMembers = await prisma.member.findMany({
      where: {
        payments: {
          some: {
            type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] }
          }
        }
      },
      take: 5,
      include: { _count: { select: { visits: true } } },
      orderBy: { visits: { _count: 'desc' } },
    })

    // 3. Member Berisiko Keluar (expired dalam 3 hari, hanya yang punya MEMBERSHIP payment)
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const atRiskMembers = await prisma.member.findMany({
      where: {
        membershipEnd: { gte: now, lte: threeDaysLater },
        isActive: true,
        payments: {
          some: {
            type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] }
          }
        }
      },
      take: 10,
    })

    // Generate Smart Insights
    const insights = this.generateDashboardInsights({
      chartData,
      revenueThisMonth: revenueSoFar,
      visitsThisMonth,
      totalMembers,
      activeMembers
    })

    // Generate Smart Tasks
    const smartTasks = await this.generateSmartTasks(now)

    return {
      stats: { 
        totalMembers, 
        activeMembers, 
        totalVisits, 
        visitsThisMonth, 
        totalPayments, 
        paymentsThisMonth, 
        pendingPayments, 
        expiredMembers, 
        overdueMembers: trulyOverdue.length, 
        revenueThisMonth: revenueSoFar,
        chartData,
        insights, // Tambahkan insights
      },
      overdueMembersList: trulyOverdue.map((member) => ({ id: member.id, name: member.name, email: member.email, phone: member.phone, membershipEnd: member.membershipEnd, memberCardId: member.memberCardId })),
      topMembers: topMembers.map(member => ({ 
        id: member.id, 
        name: member.name, 
        visitCount: member._count.visits 
      })),
      atRiskMembers: atRiskMembers.map(member => ({ 
        id: member.id, 
        name: member.name, 
        email: member.email, 
        phone: member.phone, 
        membershipEnd: member.membershipEnd, 
        memberCardId: member.memberCardId 
      })),
      smartTasks,
    }
  }

  async listNotifications(filter: string) {
    const where: any = {}
    if (filter === 'unread') where.read = false
    else if (filter === 'read') where.read = true
    
    const list = await prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    
    return list.map(sanitizeNotificationForApi)
  }
  
  async createNotification(input: any) {
    const created = await prisma.adminNotification.create({
      data: {
        type: input?.type || 'info',
        title: input?.title,
        message: input?.message,
        link: input?.link,
      },
    })
    return sanitizeNotificationForApi(created)
  }
  
  async markAllNotificationsRead() {
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    })
  }
  
  async markNotificationRead(id: string) {
    try {
      await prisma.adminNotification.update({
        where: { id },
        data: { read: true },
      })
      return true
    } catch (e) {
      return false
    }
  }
  
  async getUnreadNotificationsCount() {
    return await prisma.adminNotification.count({ where: { read: false } })
  }
  
  async deleteNotification(id: string) {
    try {
      await prisma.adminNotification.delete({ where: { id } })
      return true
    } catch (e) {
      return false
    }
  }

  async deleteAllNotifications(filter?: string) {
    try {
      const where: any = {}
      if (filter === 'unread') where.read = false
      else if (filter === 'read') where.read = true
      
      await prisma.adminNotification.deleteMany({ where })
      return true
    } catch (e) {
      return false
    }
  }

  // Method untuk generate Smart Insights
  private generateDashboardInsights(data: {
    chartData: {
      labels: string[]
      revenue: number[]
      visits: number[]
      memberGrowth: number[]
    }
    revenueThisMonth: number
    visitsThisMonth: number
    totalMembers: number
    activeMembers: number
  }) {
    const { chartData, revenueThisMonth, visitsThisMonth, totalMembers, activeMembers } = data
    
    // 1. Insight untuk Revenue
    const revenueInsight = this.generateRevenueInsight(chartData.revenue, chartData.labels)
    
    // 2. Insight untuk Kunjungan
    const visitsInsight = this.generateVisitsInsight(chartData.visits, chartData.labels, visitsThisMonth)
    
    // 3. Insight untuk Pertumbuhan Member
    const memberGrowthInsight = this.generateMemberGrowthInsight(chartData.memberGrowth, chartData.labels, totalMembers, activeMembers)

    return {
      revenue: revenueInsight,
      visits: visitsInsight,
      memberGrowth: memberGrowthInsight
    }
  }

  private generateRevenueInsight(revenue: number[], labels: string[]) {
    const currentMonthRevenue = revenue[revenue.length - 1]
    const lastMonthRevenue = revenue[revenue.length - 2]
    const currentMonthLabel = labels[labels.length - 1]
    const lastMonthLabel = labels[labels.length - 2]

    if (!lastMonthRevenue || lastMonthRevenue === 0) {
      return `Pendapatan bulan ${currentMonthLabel} adalah Rp ${currentMonthRevenue.toLocaleString('id-ID')}.`
    }

    const change = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100

    if (change > 0) {
      return `Pendapatan bulan ${currentMonthLabel} naik ${Math.abs(change).toFixed(1)}% dibanding bulan ${lastMonthLabel}! Pertahankan performa ini! 🎉`
    } else if (change < 0) {
      return `Pendapatan bulan ${currentMonthLabel} turun ${Math.abs(change).toFixed(1)}% dibanding bulan ${lastMonthLabel}. Perlu evaluasi strategi. ⚠️`
    } else {
      return `Pendapatan bulan ${currentMonthLabel} sama dengan bulan ${lastMonthLabel}. Tetap konsisten! ✅`
    }
  }

  private generateVisitsInsight(visits: number[], labels: string[], visitsThisMonth: number) {
    const currentMonthVisits = visits[visits.length - 1]
    const lastMonthVisits = visits[visits.length - 2]
    const currentMonthLabel = labels[labels.length - 1]
    const lastMonthLabel = labels[labels.length - 2]

    if (!lastMonthVisits || lastMonthVisits === 0) {
      return `Kunjungan bulan ${currentMonthLabel} sebanyak ${currentMonthVisits} kunjungan.`
    }

    const change = ((currentMonthVisits - lastMonthVisits) / lastMonthVisits) * 100

    if (change > 0) {
      return `Kunjungan bulan ${currentMonthLabel} naik ${Math.abs(change).toFixed(1)}% dibanding bulan ${lastMonthLabel}! Total kunjungan bulan ini: ${visitsThisMonth} 🔥`
    } else if (change < 0) {
      return `Kunjungan bulan ${currentMonthLabel} turun ${Math.abs(change).toFixed(1)}% dibanding bulan ${lastMonthLabel}. Ayo promosikan lebih giat! 📢`
    } else {
      return `Kunjungan bulan ${currentMonthLabel} sama dengan bulan ${lastMonthLabel}. Tetap semangat! 💪`
    }
  }

  private generateMemberGrowthInsight(memberGrowth: number[], labels: string[], totalMembers: number, activeMembers: number) {
    const currentMonthNewMembers = memberGrowth[memberGrowth.length - 1]
    const lastMonthNewMembers = memberGrowth[memberGrowth.length - 2]
    const currentMonthLabel = labels[labels.length - 1]
    const lastMonthLabel = labels[labels.length - 2]
    const activeRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0

    let baseMessage = `Total member saat ini: ${totalMembers}, dengan ${activeRate}% member aktif. `

    if (!lastMonthNewMembers || lastMonthNewMembers === 0) {
      return baseMessage + `Member baru bulan ${currentMonthLabel}: ${currentMonthNewMembers} orang.`
    }

    const change = ((currentMonthNewMembers - lastMonthNewMembers) / lastMonthNewMembers) * 100

    if (change > 0) {
      return baseMessage + `Member baru bulan ${currentMonthLabel} (${currentMonthNewMembers} orang) naik ${Math.abs(change).toFixed(1)}% dibanding bulan ${lastMonthLabel}! Pertumbuhan yang bagus! 🌟`
    } else if (change < 0) {
      return baseMessage + `Member baru bulan ${currentMonthLabel} (${currentMonthNewMembers} orang) turun ${Math.abs(change).toFixed(1)}% dibanding bulan ${lastMonthLabel}. Perlu strategi menarik member baru! 🤝`
    } else {
      return baseMessage + `Member baru bulan ${currentMonthLabel} sama dengan bulan ${lastMonthLabel} (${currentMonthNewMembers} orang). Tetap konsisten! ✨`
    }
  }

  // Method untuk generate Smart Tasks
  private async generateSmartTasks(now: Date) {
    const tasks: { priority: 'high' | 'medium' | 'low'; type: string; title: string; description: string; items: string[]; link: string }[] = []

    // 1. Cek pembayaran cash pending (PRIORITAS TINGGI)
    const pendingCashPayments = await prisma.payment.findMany({
      where: { status: 'PENDING', paymentMethod: 'cash' },
      include: { member: true },
      take: 5,
    })

    if (pendingCashPayments.length > 0) {
      tasks.push({
        priority: 'high',
        type: 'cash_payments',
        title: `${pendingCashPayments.length} Pembayaran Tunai Belum Dikonfirmasi!`,
        description: 'Segera konfirmasi pembayaran tunai berikut agar akses member aktif.',
        items: pendingCashPayments.map(p => p.member?.name || 'Unknown Member'),
        link: '/admin/payments?status=PENDING&paymentMethod=cash',
      })
    }

    // 2. Cek member expiring dalam 3 hari (PRIORITAS TINGGI)
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const expiringMembers = await prisma.member.findMany({
      where: {
        membershipEnd: { gte: now, lte: threeDaysLater },
        isActive: true,
        payments: { some: { type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] } } },
      },
      take: 5,
    })

    if (expiringMembers.length > 0) {
      tasks.push({
        priority: 'high',
        type: 'expiring_members',
        title: `${expiringMembers.length} Member Akan Expired Dalam 3 Hari!`,
        description: 'Segera hubungi member berikut untuk perpanjangan membership.',
        items: expiringMembers.map(m => m.name),
        link: '/admin/members',
      })
    }

    // 3. Cek member expired (sudah kedaluwarsa)
    const expiredMembers = await prisma.member.findMany({
      where: {
        membershipEnd: { lt: now },
        payments: { some: { type: { in: ['MEMBERSHIP_NEW', 'MEMBERSHIP_RENEWAL'] } } },
      },
      take: 5,
    })

    if (expiredMembers.length > 0) {
      tasks.push({
        priority: 'medium',
        type: 'expired_members',
        title: `${expiredMembers.length} Member Sudah Kedaluwarsa!`,
        description: 'Tindak lanjuti member berikut: hapus atau tawarkan perpanjangan membership.',
        items: expiredMembers.map(m => m.name),
        link: '/admin/members?filter=expired',
      })
    }

    return tasks
  }
  
  // Helper function to add admin notification (for internal use)
  private async addNotification(input: {
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
  async listExercises() { const exercises = await this.repo.findAllExercises(); return { exercises, count: exercises.length } }
  async updateExerciseInstruction(exerciseId: string, instructionsId: unknown) {
    if (instructionsId === undefined) throw new AppError('instructionsId is required', 400)
    try { return await this.repo.updateExerciseInstruction(exerciseId, instructionsId ? String(instructionsId) : null) } catch (error: any) { if (error?.code === 'P2025') throw new AppError('Exercise tidak ditemukan', 404); throw error }
  }
  async listVisits(query: any) {
    const page = parseInt(String(query.page || '1')); const limit = parseInt(String(query.limit || '20')); const skip = (page - 1) * limit; const where: any = {}
    if (query.name) {
      where.OR = [
        { visitorName: { contains: query.name, mode: 'insensitive' } },
        { member: { name: { contains: query.name, mode: 'insensitive' } } },
      ];
    }
    if (query.startDate || query.endDate) { 
      where.visitDate = {}; 
      const utcOffset = 7 * 60 * 60 * 1000 // WIB is UTC+7
      if (query.startDate) {
        const [year, month, day] = query.startDate.split('-').map(Number)
        const startLocal = startOfDay(new Date(year, month - 1, day))
        where.visitDate.gte = new Date(startLocal.getTime() - utcOffset)
      }
      if (query.endDate) {
        const [year, month, day] = query.endDate.split('-').map(Number)
        const endLocal = endOfDay(new Date(year, month - 1, day))
        where.visitDate.lte = new Date(endLocal.getTime() - utcOffset)
      }
    }
    const [visits, total] = await Promise.all([this.repo.findVisits(where, skip, limit), this.repo.countVisitsByWhere(where)])
    return { visits, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }
  async createVisit(input: any) {
    if (!input?.name) throw new AppError('Nama pengunjung wajib diisi', 400)
    const visitDate = input.visitDate ? new Date(input.visitDate) : new Date()
    const amount = input.amount ? Number(input.amount) : 25000
    const paymentMethod = input.paymentMethod ? String(input.paymentMethod).toLowerCase() : 'cash'
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date()
    const email = input.email ? String(input.email).toLowerCase() : null

    // Cari member berdasarkan email jika ada
    let memberId = null
    if (email) {
      const existingMember = await prisma.member.findUnique({ where: { email } })
      if (existingMember) {
        memberId = existingMember.id
      } else {
        // Buat member baru jika tidak ditemukan
        const newMember = await prisma.member.create({
          data: {
            name: String(input.name),
            email,
            isActive: true,
          },
        })
        memberId = newMember.id
      }
    }

    // Gunakan transaksi untuk membuat visit dan payment
    const result = await prisma.$transaction(async (tx) => {
      const visit = await tx.visit.create({
        data: {
          visitorName: String(input.name),
          memberId,
          visitDate,
          createdAt: visitDate,
          notes: input.notes || null,
        },
      })

      const payment = await tx.payment.create({
        data: {
          memberId,
          type: 'VISIT',
          amount,
          status: 'PAID',
          paymentMethod,
          paidAt,
          description: `Pembayaran kunjungan ${String(input.name)}`,
        },
      })

      // Terapkan benefits jika ada
      if (memberId) {
        await applyBenefitsForPaidPayment(tx, { memberId, type: 'VISIT', orderId: null, paymentMethod, existingVisitId: visit.id })
      }

      return { visit, payment }
    })

    return result.visit
  }
  async updateVisit(id: string, input: any) {
    if (!id) throw new AppError('Visit ID is required', 400)
    const existing = await this.repo.findVisitById(id)
    if (!existing) throw new AppError('Visit tidak ditemukan', 404)
    const data: any = {}
    if (input.name !== undefined) data.visitorName = String(input.name)
    if (input.visitDate) {
      const newDate = new Date(input.visitDate)
      data.visitDate = newDate
      data.createdAt = newDate // Sinkronisasi createdAt agar tampilan "Dibuat" ikut berubah
    }
    if (input.notes !== undefined) data.notes = input.notes || null
    return this.repo.updateVisit(id, data)
  }
  async deleteVisit(id: string) {
    if (!id) throw new AppError('Visit ID is required', 400)
    const existing = await this.repo.findVisitById(id)
    if (!existing) throw new AppError('Visit tidak ditemukan', 404)
    await this.repo.deleteVisit(id)
    return { message: 'Visit berhasil dihapus' }
  }
  async getFinancialReport(startParam?: string | null, endParam?: string | null) {
    const now = new Date(); 
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    let start: Date;
    let end: Date;
    
    if (startParam) {
      const [year, month, day] = startParam.split('-').map(Number)
      start = startOfDay(new Date(year, month - 1, day))
    } else {
      start = startOfDay(defaultStart)
    }
    
    if (endParam) {
      const [year, month, day] = endParam.split('-').map(Number)
      end = endOfDay(new Date(year, month - 1, day))
    } else {
      end = endOfDay(now)
    }
    
    if (start > end) throw new AppError('Rentang tanggal tidak valid (mulai lebih besar dari selesai)', 400)
    const payments = await this.repo.findPaidPaymentsInRange(start, end)
    let totalAmount = 0; const byType: Record<string, { count: number; amount: number }> = {}
    for (const p of payments) { const amt = Number(p.amount); totalAmount += amt; if (!byType[p.type]) byType[p.type] = { count: 0, amount: 0 }; byType[p.type].count += 1; byType[p.type].amount += amt }
    return { startDate: start.toISOString(), endDate: end.toISOString(), payments: payments.map((p) => ({ id: p.id, type: p.type, amount: Number(p.amount), paymentMethod: p.paymentMethod, description: p.description, orderId: p.orderId, paidAt: p.paidAt?.toISOString() ?? null, member: p.member })), summary: { totalTransactions: payments.length, totalAmount, byType } }
  }
}

