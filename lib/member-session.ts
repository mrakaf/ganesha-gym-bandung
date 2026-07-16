export const MEMBER_SESSION_KEY = 'member_session_v1'

export type MemberSession = {
  id: string
  name: string
  username: string | null
  email: string | null
}

export function getMemberSession(): MemberSession | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(MEMBER_SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as MemberSession
    if (!parsed?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function setMemberSession(session: MemberSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(session))
}

export function clearMemberSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(MEMBER_SESSION_KEY)
}

