export function isLoopbackBackend(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1'].includes(url.hostname) && !url.username && !url.password }
  catch { return false }
}
export function assertLocalBackend() {
  if (process.env.NODE_ENV === 'development' && process.env.FIND10_LOCAL_MODE === '1' && !isLoopbackBackend(process.env.NEXT_PUBLIC_SUPABASE_URL)) throw new Error('Find Your 10% local development requires a loopback Supabase URL. Remote database access is disabled.')
}
export function sameRequestOrigin(request) {
  try {
    const origin = new URL(request.headers.get('origin'))
    const target = new URL(request.url)
    // Next dev may normalize request.url to localhost while the browser uses
    // 127.0.0.1. The Host header preserves the actual browser destination.
    return origin.protocol === target.protocol && origin.host === (request.headers.get('host') || target.host)
  } catch { return false }
}
