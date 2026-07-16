/**
 * Notifikasi admin: tautan selalu sebagai path site-root (mis. /admin/payments)
 * supaya tidak terpaku ke http://localhost:3000 atau domain salah.
 */
export function toRelativeAdminPath(link: string | undefined | null): string | undefined {
  if (link == null) return undefined
  const trimmed = String(link).trim()
  if (trimmed === '') return undefined
  if (trimmed.startsWith('//')) return undefined
  if (trimmed.toLowerCase().startsWith('javascript:')) return undefined

  if (!/^https?:\/\//i.test(trimmed)) {
    if (!trimmed.startsWith('/')) return undefined
    return trimmed
  }

  try {
    const u = new URL(trimmed)
    return `${u.pathname}${u.search}${u.hash || ''}` || '/'
  } catch {
    return undefined
  }
}
