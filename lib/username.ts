export function normalizeUsernameCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function isValidUsername(username: string) {
  const trimmed = username.trim()
  return trimmed.length >= 3 && trimmed.length <= 30 && !/\s/.test(trimmed)
}

