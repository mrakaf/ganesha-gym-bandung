import { PremiumAccessType } from '@prisma/client'

type PremiumAccessMember = {
  membershipEnd: Date | null
  accessType: PremiumAccessType | null
  accessStart: Date | null
  accessEnd: Date | null
}

export function hasPremiumAccess(member: PremiumAccessMember, now: Date = new Date()) {
  const hasExplicitAccess = !!member.accessEnd && member.accessEnd > now
  const hasMembershipWindow = !!member.membershipEnd && member.membershipEnd > now
  return hasExplicitAccess || hasMembershipWindow
}

export function getPremiumAccessType(member: PremiumAccessMember, now: Date = new Date()) {
  const membershipActive = !!member.membershipEnd && member.membershipEnd > now
  if (membershipActive) return 'MEMBERSHIP'

  const visitActive =
    member.accessType === 'VISIT' && !!member.accessEnd && member.accessEnd > now
  if (visitActive) return 'VISIT'

  return null
}

export function getPremiumAccessEnd(member: PremiumAccessMember, now: Date = new Date()) {
  const type = getPremiumAccessType(member, now)
  if (type === 'MEMBERSHIP') return member.membershipEnd
  if (type === 'VISIT') return member.accessEnd
  return null
}
