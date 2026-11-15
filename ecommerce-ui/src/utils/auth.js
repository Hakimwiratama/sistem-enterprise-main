export function decodeAccessToken(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    if (
      typeof payload.sub !== 'string'
      || !payload.sub.trim()
      || !Number.isFinite(payload.exp)
      || payload.exp <= Date.now() / 1000
    ) return null
    return payload
  } catch {
    return null
  }
}
