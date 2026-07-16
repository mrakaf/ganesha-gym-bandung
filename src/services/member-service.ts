import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmail } from '@/src/helpers/email'
import { getPremiumAccessEnd, getPremiumAccessType, hasPremiumAccess } from '@/src/helpers/premium-access'
import { isValidUsername, normalizeUsernameCandidate } from '@/src/helpers/username'
import { AppError } from '@/src/models/app-error'
import { RegisterMemberInput } from '@/src/models/authenticated-session'
import { UpdateMemberProfileInput } from '@/src/models/profile'
import { MemberRepository } from '@/src/repositories/member-repository'
import { prisma } from '@/lib/db'
import { addAdminNotification } from '@/lib/admin-notifications'

export class MemberService {
  constructor(private readonly repo: MemberRepository = new MemberRepository()) {}

  async loginWithUsername(usernameRaw: string, password: string) {
    const username = String(usernameRaw || '').trim()
    if (!username || !password) throw new AppError('Username dan password wajib diisi', 400)

    const member = await this.repo.findByUsername(username)
    if (!member) throw new AppError('Username atau password tidak terdaftar atau salah. Silakan register terlebih dahulu.', 401)
    if (!member.password) throw new AppError('Akun ini menggunakan Google login. Silakan login dengan Google.', 401)

    const valid = await bcrypt.compare(password, member.password)
    if (!valid) throw new AppError('Username atau password tidak terdaftar atau salah. Silakan register terlebih dahulu.', 401)

    return {
      id: member.id,
      name: member.name,
      username: member.username,
      email: member.email,
      phone: member.phone,
      isActive: member.isActive,
      memberCardId: member.memberCardId,
      membershipStart: member.membershipStart,
      membershipEnd: member.membershipEnd,
    }
  }

  async registerMember(input: RegisterMemberInput) {
    const name = String(input.name || '').trim()
    const email = String(input.email || '').trim().toLowerCase()
    const username = String(input.username || '').trim()
    const password = String(input.password || '')

    if (!name || !email || !username || !password) {
      throw new AppError('Nama, email, username, dan password wajib diisi', 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Format email tidak valid', 400)
    if (!isValidUsername(username)) throw new AppError('Username cukup 3-30 karakter dan tanpa spasi', 400)
    if (password.length < 8) throw new AppError('Password minimal 8 karakter', 400)

    const existingMember = await this.repo.findByUsername(username)
    if (existingMember) throw new AppError('Username sudah terdaftar. Silakan gunakan username lain.', 400)

    const existingEmail = await this.repo.findByEmail(email)
    if (existingEmail) {
      const isLikelyGoogleAccount = !existingEmail.password && !existingEmail.username
      throw new AppError(
        isLikelyGoogleAccount
          ? 'Email ini sudah terdaftar via Google. Silakan login dengan Google atau gunakan "Lupa Password?".'
          : 'Email sudah terdaftar. Silakan login atau gunakan "Lupa Password?".',
        400
      )
    }

    const hashed = await bcrypt.hash(password, 10)
    const member = await this.repo.create({ name, email, username, password: hashed, isActive: false })
    
    // Send admin notification
    await addAdminNotification({
      type: 'info',
      title: 'Member Baru Mendaftar',
      message: `${name} telah mendaftar sebagai member baru dengan email ${email}.`,
      link: `/admin/members/${member.id}`,
    })

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      username: member.username,
      isActive: member.isActive,
    }
  }

  async checkOrCreateByEmail(emailRaw: string, nameRaw?: string) {
    const email = String(emailRaw || '').trim().toLowerCase()
    const name = String(nameRaw || '').trim()
    if (!email) throw new AppError('Email is required', 400)

    let member = await this.repo.findByEmail(email)
    if (!member) {
      member = await this.repo.create({
        email,
        name: name || email.split('@')[0],
        isActive: false,
      })
    }

    return {
      exists: true,
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        phone: member.phone,
        isActive: member.isActive,
        memberCardId: member.memberCardId,
        membershipStart: member.membershipStart,
        membershipEnd: member.membershipEnd,
        premiumAccess: hasPremiumAccess(member),
        premiumAccessType: getPremiumAccessType(member),
        premiumAccessEnd: getPremiumAccessEnd(member),
      },
      isNewMember: !member.phone,
    }
  }

  async updateMemberByEmail(emailRaw: string, data: UpdateMemberProfileInput) {
    const email = String(emailRaw || '').trim().toLowerCase()
    if (!email) throw new AppError('Email is required', 400)

    // Hitung experience level otomatis jika gymExperienceMonths diberikan
    let experienceLevel = data.experienceLevel
    if (data.gymExperienceMonths !== undefined && !experienceLevel) {
      if (data.gymExperienceMonths < 3) experienceLevel = 'PEMULA'
      else if (data.gymExperienceMonths < 12) experienceLevel = 'MENENGAH'
      else experienceLevel = 'ADVANCED'
    }

    // Parse dateOfBirth atau hitung dari age jika diberikan
    let dateOfBirth: Date | undefined
    if (data.age !== undefined && data.age !== null) {
      // Hitung tanggal lahir dari umur: tanggal hari ini minus umur tahun
      dateOfBirth = new Date()
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - data.age)
    } else if (data.dateOfBirth) {
      dateOfBirth = typeof data.dateOfBirth === 'string' ? new Date(data.dateOfBirth) : data.dateOfBirth
    }

    const member = await this.repo.updateByEmail(email, {
      name: data.name || undefined,
      phone: data.phone || undefined,
      height: data.height,
      weight: data.weight,
      gymExperienceMonths: data.gymExperienceMonths,
      experienceLevel: experienceLevel as any,
      gender: data.gender as any,
      dateOfBirth,
    })

    return {
      id: member.id,
      email: member.email,
      name: member.name,
      phone: member.phone,
      isActive: member.isActive,
      memberCardId: member.memberCardId,
      membershipStart: member.membershipStart,
      membershipEnd: member.membershipEnd,
      height: member.height,
      weight: member.weight,
      gymExperienceMonths: member.gymExperienceMonths,
      experienceLevel: member.experienceLevel,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
    }
  }

  async getProfile(email?: string | null, username?: string | null) {
    if (!email && !username) throw new AppError('email atau username wajib diisi', 400)
    const member = await this.repo.findProfileByEmailOrUsername(email, username)
    if (!member) throw new AppError('Member tidak ditemukan', 404)

    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)
    const thisMonthVisits = member.visits.filter((v) => v.visitDate >= thisMonthStart).length
    const hasMembershipHistory = member.payments.some((p) => p.type === 'MEMBERSHIP_NEW' || p.type === 'MEMBERSHIP_RENEWAL')
    const mustPayRegistrationFee = !!member.mustPayRegistrationFee

    // Cek apakah member memiliki payment visit yang belum dipakai
    const hasUnusedVisitPayment = member.payments.some((p) => p.type === 'VISIT' && p.status === 'PAID' && !p.isVisitUsed)
    // Cek apakah member memiliki payment visit QRIS yang belum dipakai (untuk menampilkan QR Code check-in)
    const hasUnusedQrisVisitPayment = member.payments.some((p) => p.type === 'VISIT' && p.status === 'PAID' && !p.isVisitUsed)
    // Cek apakah member sudah check-in HARI INI
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const hasCheckedInToday = member.visits.some((v) => {
      const visitDate = new Date(v.visitDate)
      visitDate.setHours(0, 0, 0, 0)
      return visitDate.getTime() === today.getTime() && v.checkInStatus === 'CHECKED_IN'
    })

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      memberCardId: member.memberCardId,
      isActive: member.isActive,
      membershipStart: member.membershipStart,
      membershipEnd: member.membershipEnd,
      totalVisits: member.visits.length,
      thisMonthVisits,
      totalPayments: member.payments.length,
      hasMembershipHistory,
      mustPayRegistrationFee,
      recommendedMembershipPaymentType: mustPayRegistrationFee || !hasMembershipHistory ? 'MEMBERSHIP_NEW' : 'MEMBERSHIP_RENEWAL',
      premiumAccess: hasPremiumAccess(member),
      premiumAccessType: getPremiumAccessType(member),
      premiumAccessEnd: getPremiumAccessEnd(member),
      accessType: member.accessType,
      accessStart: member.accessStart,
      accessEnd: member.accessEnd,
      hasUnusedVisitPayment,
      hasUnusedQrisVisitPayment,
      hasCheckedInToday,
      height: member.height,
      weight: member.weight,
      gymExperienceMonths: member.gymExperienceMonths,
      experienceLevel: member.experienceLevel,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
    }
  }

  async requestPasswordReset(emailRaw: string | undefined, origin: string) {
    const email = String(emailRaw || '').trim().toLowerCase()
    if (!email) return

    const member = await this.repo.findByEmail(email)
    if (!member?.email) return

    await this.repo.cleanupPasswordResetTokens(member.id)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = this.sha256Hex(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await this.repo.createPasswordResetToken(member.id, tokenHash, expiresAt)

    const appBaseUrl = process.env.APP_BASE_URL || origin
    const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`
    await sendEmail({
      to: member.email,
      subject: 'Reset Password - Ganesha Gym Bandung',
      html: this.buildResetEmailHtml({
        appBaseUrl,
        resetUrl,
        name: member.name || 'Member',
      }),
    })
  }

  async resetPassword(token: string, password: string) {
    if (!token || typeof token !== 'string') throw new AppError('Token reset tidak valid', 400)
    if (!password || password.length < 8) throw new AppError('Password minimal 8 karakter', 400)

    const tokenHash = this.sha256Hex(token)
    const now = new Date()
    const record = await this.repo.findPasswordResetToken(tokenHash)
    if (!record || record.usedAt || record.expiresAt < now) {
      throw new AppError('Link reset sudah tidak berlaku. Silakan minta link baru.', 400)
    }

    const member = await this.repo.findById(record.memberId)
    if (!member) throw new AppError('Akun tidak ditemukan', 404)

    const hashed = await bcrypt.hash(password, 10)
    let nextUsername = member.username ?? null
    if (!nextUsername && member.email) {
      nextUsername = await this.generateUniqueUsernameFromEmail(member.email)
    }

    await prisma.$transaction([
      prisma.member.update({
        where: { id: member.id },
        data: { password: hashed, ...(nextUsername ? { username: nextUsername } : {}) },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    ])

    return { username: nextUsername }
  }

  private sha256Hex(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex')
  }

  private async generateUniqueUsernameFromEmail(email: string) {
    const prefix = email.split('@')[0] || 'user'
    const base = normalizeUsernameCandidate(prefix).slice(0, 20) || 'user'

    const check = async (candidate: string) => {
      if (!isValidUsername(candidate)) return null
      const existing = await this.repo.findUsername(candidate)
      return existing ? null : candidate
    }

    const first = await check(base)
    if (first) return first
    for (let i = 1; i <= 9999; i++) {
      const suffix = String(i)
      const trimmed = base.slice(0, Math.max(0, 20 - suffix.length - 1))
      const candidate = `${trimmed}_${suffix}`
      const ok = await check(candidate)
      if (ok) return ok
    }
    return null
  }

  private buildResetEmailHtml(options: { appBaseUrl: string; resetUrl: string; name: string }) {
    const logoUrl = `${options.appBaseUrl}/images/logoganesha.jpeg`
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;color:#111827;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <div style="background:#111827;color:#ffffff;padding:20px 24px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="${logoUrl}" alt="Ganesha Gym Bandung" width="48" height="48" style="border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.15);" />
              <div>
                <div style="font-size:18px;font-weight:800;letter-spacing:.4px;">GANESHA GYM BANDUNG</div>
                <div style="font-size:12px;opacity:.85;">Reset Password</div>
              </div>
            </div>
          </div>
          <div style="padding:24px;">
            <h2 style="margin:0 0 14px 0;font-size:22px;color:#111827;">Reset Password</h2>
            <p style="margin:0 0 12px 0;">Yth. <strong>${options.name}</strong>,</p>
            <p style="margin:0 0 12px 0;line-height:1.65;color:#374151;">
              Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk membuat password baru.
            </p>
            <div style="margin: 22px 0 6px 0;">
              <a href="${options.resetUrl}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
                Reset Password
              </a>
            </div>
            <p style="margin:14px 0 0 0;line-height:1.65;color:#6b7280;font-size:13px;">
              Link ini hanya berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.
            </p>
          </div>
        </div>
      </div>
    `
  }
}

