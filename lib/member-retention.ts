
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

export type RetentionStatus = 'AMAN' | 'PERLU_DIPERHATIKAN' | 'RISIKO_TINGGI'

export interface MemberRetentionData {
  id: string
  name: string
  email: string | null
  phone: string | null
  lastVisitDate: Date | null
  daysSinceLastVisit: number | null
  membershipEnd: Date | null
  retentionStatus: RetentionStatus
}

export function calculateRetentionStatus(member: any): MemberRetentionData {
  // Ambil kunjungan terakhir
  const sortedVisits = [...(member.visits || [])].sort(
    (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
  )
  const lastVisit = sortedVisits[0]
  const lastVisitDate = lastVisit ? new Date(lastVisit.visitDate) : null
  const daysSinceLastVisit = lastVisitDate
    ? Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Periksa status membership
  const membershipEnd = member.membershipEnd ? new Date(member.membershipEnd) : null
  const daysUntilMembershipEnd = membershipEnd
    ? Math.floor((membershipEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  let retentionStatus: RetentionStatus = 'AMAN'

  // Logika status risiko:
  if (
    (daysSinceLastVisit && daysSinceLastVisit > 14) || // Tidak datang lebih dari 14 hari
    (daysUntilMembershipEnd && daysUntilMembershipEnd <= 7 && daysUntilMembershipEnd > 0) // Membership mau habis dalam 7 hari
  ) {
    retentionStatus = 'RISIKO_TINGGI'
  } else if (
    (daysSinceLastVisit && daysSinceLastVisit > 7 && daysSinceLastVisit <= 14) || // Tidak datang 7-14 hari
    (daysUntilMembershipEnd && daysUntilMembershipEnd <= 14 && daysUntilMembershipEnd > 7) // Membership mau habis dalam 14 hari
  ) {
    retentionStatus = 'PERLU_DIPERHATIKAN'
  }

  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    lastVisitDate,
    daysSinceLastVisit,
    membershipEnd,
    retentionStatus
  }
}

export function getRetentionStatusColor(status: RetentionStatus) {
  switch (status) {
    case 'AMAN': return { label: 'Aman', color: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' }
    case 'PERLU_DIPERHATIKAN': return { label: 'Perlu Diperhatikan', color: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' }
    case 'RISIKO_TINGGI': return { label: 'Risiko Tinggi', color: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
  }
}

export function getRetentionRecommendation(member: MemberRetentionData) {
  const recommendations = []

  if (member.daysSinceLastVisit && member.daysSinceLastVisit > 14) {
    recommendations.push({
      type: 'absent',
      title: 'Sudah lama tidak datang',
      message: `Member ini sudah ${member.daysSinceLastVisit} hari tidak datang ke gym.`,
      action: 'Kirim email pengingat untuk datang kembali',
      emailSubject: `Hai ${member.name}, kami kangen! 🥺`,
      emailBody: `
<p>Hai ${member.name},</p>
<p>Udah ${member.daysSinceLastVisit} hari kamu gak dateng ke Ganesha Gym—kami kangen banget! 🥺</p>
<p>Kamu punya promo spesial: Diskon 10% untuk pembayaran selanjutnya! Ayo segera datang dan nikmati latihan kamu kembali!</p>
<p>Salam hangat,<br/>Tim Ganesha Gym
`
    })
  }

  if (member.membershipEnd) {
    const daysUntil = Math.floor((member.membershipEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 7 && daysUntil > 0) {
      recommendations.push({
        type: 'expiring',
        title: 'Membership akan segera berakhir',
        message: `Membership member ini akan berakhir dalam ${daysUntil} hari.`,
        action: 'Kirim email perpanjangan membership',
        emailSubject: `Yuk perpanjang membershipmu! 🎉`,
        emailBody: `
<p>Hai ${member.name},</p>
<p>Membershipmu di Ganesha Gym akan segera berakhir! Jangan sampai kehabisan ya!</p>
<p>Kami punya promo spesial buat kamu: Diskon 10% untuk perpanjangan membership! Segera hubungi admin untuk informasi lebih lanjut.</p>
<p>Salam hangat,<br/>Tim Ganesha Gym
`
      })
    } else if (daysUntil <= 14 && daysUntil > 7) {
      recommendations.push({
        type: 'expiring',
        title: 'Membership akan segera berakhir',
        message: `Membership member ini akan berakhir dalam ${daysUntil} hari.`,
        action: 'Kirim email peringatan perpanjangan',
        emailSubject: `Reminder: Membershipmu mau habis! 📅`,
        emailBody: `
<p>Hai ${member.name},</p>
<p>Ingetin aja nih, membershipmu di Ganesha Gym akan berakhir dalam ${daysUntil} hari!</p>
<p>Silakan perpanjang membershipmu sebelum berakhir ya!</p>
<p>Salam hangat,<br/>Tim Ganesha Gym
`
      })
    }
  }

  return recommendations
}

