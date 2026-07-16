import nodemailer from 'nodemailer'

type SendEmailParams = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(params: SendEmailParams) {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT || 587)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser

  // Priority 1: SMTP (recommended for quick inbox testing, e.g. Gmail App Password)
  if (smtpHost && smtpUser && smtpPass && smtpFrom) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      await transporter.sendMail({
        from: smtpFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
      })

      return { success: true }
    } catch (error: any) {
      return {
        success: false,
        reason: `SMTP gagal: ${error?.message || 'Unknown SMTP error'}`,
      }
    }
  }

  // Priority 2: Resend API
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Ganesha Gym <noreply@ganeshagym.com>'

  if (!apiKey) {
    return {
      success: false,
      reason: 'Konfigurasi email belum lengkap. Isi SMTP_* atau RESEND_API_KEY.',
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    return {
      success: false,
      reason: `Resend API gagal: ${errorBody}`,
    }
  }

  return { success: true }
}
