/**
 * Format tampilan nomor kartu member (contoh: 1/04 → 01/04, 371/04 tetap 371/04).
 * Nilai di database tidak diubah — hanya untuk UI/ekspor.
 */
export function formatMemberCardDisplay(memberCardId: string | null | undefined): string {
  if (memberCardId == null || String(memberCardId).trim() === '') return ''
  const trimmed = String(memberCardId).trim()
  const m = trimmed.match(/^(\d+)\/(\d+)$/)
  if (!m) return trimmed
  const seq = m[1]
  const suffix = m[2]
  return `${seq.padStart(2, '0')}/${suffix}`
}
