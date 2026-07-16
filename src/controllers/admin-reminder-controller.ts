import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/src/helpers/email'

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

export class AdminReminderController {
  async testEmail(request: NextRequest) {
    try {
      const body = await request.json()
      const to = body?.to as string | undefined
      const mode = (body?.mode as string | undefined) || 'REAL_EXPIRED'

      if (!to) {
        return NextResponse.json({ error: 'Field "to" wajib diisi' }, { status: 400 })
      }

      const derivedName = to.split('@')[0]?.trim() || 'Member Ganesha Gym'
      const memberName = (body?.memberName as string | undefined)?.trim() || derivedName

      const appBaseUrl = process.env.APP_BASE_URL || ''
      const paymentUrl = appBaseUrl ? `${appBaseUrl}/visitor/payment` : undefined
      const isRealReminder = mode === 'REAL_EXPIRED'

      const result = await sendEmail({
        to,
        subject: isRealReminder
          ? 'Reminder Perpanjangan Membership - Ganesha Gym Bandung'
          : 'Test Email Resmi - Ganesha Gym Bandung',
        html: isRealReminder
          ? buildBrandedEmailLayout({
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
            })
          : `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;color:#111827;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
              <div style="background:#111827;color:#ffffff;padding:20px 24px;">
                <h2 style="margin:0;font-size:20px;">GANESHA GYM BANDUNG</h2>
                <p style="margin:6px 0 0 0;font-size:12px;opacity:.85;">Fitness Center - Dare To Be Great</p>
              </div>
              <div style="padding:24px;">
                <h3 style="margin:0 0 10px 0;">Pengujian Email Berhasil</h3>
                <p style="margin:0 0 10px 0;line-height:1.65;color:#374151;">Email ini dikirim dari sistem reminder membership Ganesha Gym Bandung.</p>
                <p style="margin:0 0 10px 0;line-height:1.65;color:#374151;">Apabila email ini masuk inbox, konfigurasi pengiriman email sudah siap digunakan.</p>
              </div>
            </div>
          </div>
        `,
      })

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.reason || 'Email gagal dikirim' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: isRealReminder
          ? 'Email simulasi reminder real berhasil dikirim'
          : 'Test email berhasil dikirim',
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Gagal kirim test email', details: error?.message || 'Unknown error' },
        { status: 500 }
      )
    }
  }
}

