export function safeAuthNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/dashboard'
  try {
    const url = new URL(value, 'https://getguac.app')
    return url.origin === 'https://getguac.app' ? url.pathname + url.search + url.hash : '/dashboard'
  } catch { return '/dashboard' }
}
