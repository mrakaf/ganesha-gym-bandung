
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { addAdminNotification } from '@/lib/admin-notifications'

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
            </div>
          </div>
        </div>
        <div style="padding:24px;">
          <h2 style="font-size:22px;margin:0 0 16px 0;color:#111827;">${options.title}</h2>
          <p style="margin:0 0 12px 0;">Halo ${options.greetingName},</p>
          ${options.paragraphs.map(p => `<p style="margin:0 0 12px 0;line-height:1.6;">${p}</p>`).join('')}
          ${ctaButton}
        </div>
        <div style="background:#f9fafb;padding:18px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;text-align:center;">
          <p style="margin:0;">Ganesha Gym Bandung</p>
          <p style="margin:4px 0 0 0;">Email ini dikirim otomatis, mohon tidak membalas.</p>
        </div>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { subject, body: emailBody } = body

    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject dan body email wajib diisi' }, { status: 400 })
    }

    const member = await prisma.member.findUnique({
      where: { id: params.id },
    })

    if (!member) {
      return NextResponse.json({ error: 'Member tidak ditemukan' }, { status: 404 })
    }

    if (!member.email) {
      return NextResponse.json({ error: 'Member tidak memiliki email' }, { status: 400 })
    }

    const htmlEmail = buildBrandedEmailLayout({
      title: subject,
      greetingName: member.name,
      paragraphs: [emailBody.replace(/<[^>]*>/g, '')],
      accent: 'gold',
    })

    const emailResult = await sendEmail({
      to: member.email,
      subject,
      html: htmlEmail,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.reason || 'Gagal kirim email' },
        { status: 500 }
      )
    }

    await prisma.emailReminder.create({
      data: {
        memberId: member.id,
        type: 'CUSTOM',
        status: 'SENT',
      },
    })

    await addAdminNotification({
      type: 'success',
      title: 'Email reminder berhasil dikirim',
      message: `Email reminder berhasil dikirim ke ${member.name} (${member.email})`,
      link: `/admin/members/${member.id}`,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending reminder:', error)
    return NextResponse.json(
      { error: 'Gagal kirim email reminder', details: error?.message },
      { status: 500 }
    )
  }
}

