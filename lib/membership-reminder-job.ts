import { prisma } from '@/lib/db'
import { subDays } from 'date-fns'
import { sendEmail } from '@/lib/email'
import { addAdminNotification } from '@/lib/admin-notifications'

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

/** Untuk jeda antar-email; 0 diperbolehkan (penting di serverless dengan batas waktu singkat). */
function parseNonNegativeInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildBrandedEmailLayout(options: {
  title: string
  greetingName: string
  paragraphs: string[]
  accent: 'gold' | 'red'
  ctaText?: string
  ctaUrl?: string
}) {
  const appBaseUrl = process.env.APP_BASE_URL || ''
  const logoUrl = process.env.EMAIL_LOGO_URL || (appBaseUrl ? `${appBaseUrl}/images/logoganesha.jpeg` : '')
  const accentColor = options.accent === 'gold' ? '#f59e0b' : '#ef4444'
  const ctaButton =
    options.ctaText && options.ctaUrl
      ? `
      <div style="margin: 22px 0 6px 0;">
        <a href="${options.ctaUrl}" style="display:inline-block;background:${accentColor};color:#111827;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
          ${options.ctaText}
        </a>
      </div>
    `
      : ''

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#111827;color:#ffffff;padding:20px 24px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Ganesha Gym Bandung" width="48" height="48" style="border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.15);" />` : ''}
            <div>
              <div style="font-size:18px;font-weight:800;letter-spacing:.4px;">GANESHA GYM BANDUNG</div>
              <div style="font-size:12px;opacity:.85;">Fitness Center - Dare To Be Great</div>
            </div>
          </div>
        </div>

        <div style="padding:24px;">
          <h2 style="margin:0 0 14px 0;font-size:22px;color:#111827;">${options.title}</h2>
          <p style="margin:0 0 12px 0;">Yth. <strong>${options.greetingName}</strong>,</p>
          ${options.paragraphs.map((text) => `<p style="margin:0 0 12px 0;line-height:1.65;color:#374151;">${text}</p>`).join('')}
          ${ctaButton}

          <div style="margin-top:22px;padding-top:14px;border-top:1px solid #e5e7eb;color:#4b5563;font-size:13px;">
            Terima kasih atas perhatian Anda.<br/>
            Salam,<br/>
            <strong>Tim Ganesha Gym Bandung</strong>
          </div>
        </div>
      </div>
    </div>
  `
}

function buildReminderContent(type: string, memberName: string) {
  const appBaseUrl = process.env.APP_BASE_URL || ''
  const paymentUrl = appBaseUrl ? `${appBaseUrl}/visitor/payment` : undefined

  switch (type) {
    case 'EXPIRED':
      return {
        subject: 'Reminder Perpanjangan Membership - Ganesha Gym Bandung',
        html: buildBrandedEmailLayout({
          title: 'Membership Anda Sudah Jatuh Tempo',
          greetingName: memberName,
          accent: 'gold',
          paragraphs: [
            'Masa aktif membership Anda telah berakhir. Untuk menjaga akses fitur premium tetap aktif, silakan lakukan perpanjangan membership.',
            'Biaya perpanjangan membership adalah <strong>Rp160.000</strong>.',
            '<strong>Catatan:</strong> Jika tidak dilakukan perpanjangan lebih dari 7 hari, akun akan dinonaktifkan dan aktivasi kembali mengikuti paket Member Baru sebesar Rp200.000.',
          ],
          ctaText: paymentUrl ? 'Perpanjang Membership Sekarang' : undefined,
          ctaUrl: paymentUrl,
        }),
      }
    case 'OVERDUE_H7':
      return {
        subject: 'Pemberitahuan: Akun Dinonaktifkan (Membership Lewat 7 Hari)',
        html: buildBrandedEmailLayout({
          title: 'Akun Dinonaktifkan Otomatis',
          greetingName: memberName,
          accent: 'red',
          paragraphs: [
            'Membership Anda telah melewati masa tenggang lebih dari 7 hari, sehingga akun dinonaktifkan otomatis sesuai kebijakan sistem.',
            'Untuk mengaktifkan kembali akun, silakan melakukan registrasi ulang paket Member Baru sebesar <strong>Rp200.000</strong>.',
          ],
          ctaText: paymentUrl ? 'Aktifkan Kembali Akun' : undefined,
          ctaUrl: paymentUrl,
        }),
      }
    default:
      return {
        subject: 'Pengingat membership Ganesha Gym',
        html: `<p>Halo ${memberName}, ada pengingat terkait membership Anda.</p>`,
      }
  }
}

export type MembershipReminderJobResult =
  | {
      success: true
      sent: number
      failed: number
      processed: number
      skipped: number
      reason?: string
      limits: Record<string, unknown>
      failedDetails: Array<{ memberId: string; email: string | null; reason: string }>
      reminders: unknown[]
    }
  | { success: false; error: string; details?: string }

/**
 * Proses member dengan membership sudah lewat tanggal (EXPIRED): kirim email perpanjangan
 * atau email + nonaktif jika lewat 7 hari. Dipanggil dari cron terjadwal.
 */
export async function runMembershipReminderJob(
  type: 'EXPIRED'
): Promise<MembershipReminderJobResult> {
  try {
    if (type !== 'EXPIRED') {
      return { success: false, error: 'Tipe tidak didukung' }
    }

    const now = new Date()
    const todayStart = startOfToday()
    const dailySendLimit = parsePositiveInt(process.env.REMINDER_DAILY_SEND_LIMIT, 120)
    const batchLimit = parsePositiveInt(process.env.REMINDER_BATCH_LIMIT, 30)
    // Di Vercel/serverless, jeda panjang + banyak email sering melewati maxDuration; default jeda 0 kecuali di-override.
    const defaultDelayMs = process.env.VERCEL === '1' ? 0 : 1200
    const delayMs = parseNonNegativeInt(process.env.REMINDER_SEND_DELAY_MS, defaultDelayMs)

    const whereClause = {
      membershipEnd: { lt: now },
      isActive: true,
    }

    const members = await prisma.member.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        membershipEnd: true,
      },
    })

    const sentTodayCount = await prisma.emailReminder.count({
      where: {
        status: 'sent',
        sentAt: { gte: todayStart },
      },
    })

    const availableDailyQuota = Math.max(0, dailySendLimit - sentTodayCount)
    if (availableDailyQuota <= 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
        processed: 0,
        skipped: members.length,
        reason: 'Batas kirim email harian sudah tercapai',
        limits: {
          dailySendLimit,
          sentTodayCount,
          batchLimit,
          delayMs,
        },
        failedDetails: [],
        reminders: [],
      }
    }

    const maxProcessCount = Math.min(batchLimit, availableDailyQuota)
    const targetMembers = members.slice(0, maxProcessCount)
    const skippedByThrottle = Math.max(0, members.length - targetMembers.length)

    let sentCount = 0
    let failedCount = 0
    const reminders = []
    const failedDetails: Array<{ memberId: string; email: string | null; reason: string }> = []

    for (const [index, member] of targetMembers.entries()) {
      const alreadySentToday = await prisma.emailReminder.findFirst({
        where: {
          memberId: member.id,
          type: type as any,
          sentAt: { gte: todayStart },
        },
        select: { id: true },
      })

      if (alreadySentToday) {
        continue
      }

      const isOverdueMoreThan7Days =
        type === 'EXPIRED' &&
        !!member.membershipEnd &&
        member.membershipEnd < subDays(now, 7)

      if (isOverdueMoreThan7Days) {
        await prisma.member.update({
          where: { id: member.id },
          data: {
            isActive: false,
            mustPayRegistrationFee: true,
            membershipStart: null,
            membershipEnd: null,
            accessType: null,
            accessStart: null,
            accessEnd: null,
          },
        })
        
        // Send admin notification for member deactivation
        await addAdminNotification({
          type: 'warning',
          title: 'Member Dinonaktifkan',
          message: `${member.name} telah dinonaktifkan karena membership expired lebih dari 7 hari.`,
          link: `/admin/members/${member.id}`,
        })
      }

      const emailType = isOverdueMoreThan7Days ? 'OVERDUE_H7' : 'EXPIRED'
      const content = buildReminderContent(emailType, member.name)
      const emailResult = member.email
        ? await sendEmail({
            to: member.email,
            subject: content.subject,
            html: content.html,
          })
        : { success: false, reason: 'Email member kosong' }

      const reminder = await prisma.emailReminder.create({
        data: {
          memberId: member.id,
          type: emailType as any,
          status: emailResult.success ? 'sent' : 'pending',
        },
      })
      reminders.push(reminder)

      // Send admin notification for reminder email
      if (emailType === 'EXPIRED') {
        await addAdminNotification({
          type: 'info',
          title: 'Reminder Membership Dikirim',
          message: `Reminder membership expired telah dikirim ke ${member.name}.`,
          link: `/admin/members/${member.id}`,
        })
      }

      if (emailResult.success) sentCount++
      else {
        failedCount++
        failedDetails.push({
          memberId: member.id,
          email: member.email ?? null,
          reason: emailResult.reason || 'Email gagal dikirim',
        })
      }

      if (delayMs > 0 && index < targetMembers.length - 1) {
        await sleep(delayMs)
      }
    }

    return {
      success: true,
      sent: sentCount,
      failed: failedCount,
      processed: reminders.length,
      skipped: skippedByThrottle,
      limits: {
        dailySendLimit,
        sentTodayCount,
        availableDailyQuota,
        batchLimit,
        delayMs,
        targetThisRun: targetMembers.length,
      },
      failedDetails,
      reminders,
    }
  } catch (error: any) {
    console.error('Error sending reminders:', error)
    return {
      success: false,
      error: 'Gagal mengirim reminders',
      details: error.message,
    }
  }
}
