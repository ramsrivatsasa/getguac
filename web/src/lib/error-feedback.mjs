export const ERROR_EVENT = 'guac-error-feedback'
export function safeErrorText(value, max = 1000) {
  return String(value || '').replace(/https?:\/\/[^\s)]+/g, raw => { try { const u = new URL(raw); return u.origin + u.pathname } catch { return '[URL]' } })
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted token]')
    .replace(/\b(password|token|secret|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted email]').slice(0, max)
}
export function errorPath(value) {
  try { return new URL(value, 'https://getguac.app').pathname.slice(0, 250) } catch { return '/' }
}
export function showAppError(error, context = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { tag: 'application', message: safeErrorText(error?.message || error || 'The action failed.'), errorDetail: safeErrorText(error?.message || error || 'The action failed.'), stack: safeErrorText(error?.stack, 2000), url: window.location.pathname, ...context } }))
}
export function errorReportDescription(issue) {
  if (!issue || (issue.manual && !issue.errorDetail)) return ''
  return safeErrorText([issue.message, issue.errorDetail && issue.errorDetail !== issue.message ? issue.errorDetail : '', issue.endpoint ? `Request: ${issue.endpoint}${issue.status ? ` (${issue.status})` : ''}` : '', issue.url ? `Page: ${errorPath(issue.url)}` : ''].filter(Boolean).join('\n'))
}
