import { createClient } from '@supabase/supabase-js'
import { assertLocalBackend, isLoopbackBackend } from '../find-your-10/local-boundary.mjs'
export function agentAdmin({ deadlineAt } = {}) {
  assertLocalBackend()
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options) => {
      const remaining = deadlineAt ? Math.max(1, deadlineAt - Date.now()) : 15000
      const timeout = AbortSignal.timeout(Math.min(15000, remaining))
      return fetch(url, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout })
    } } })
}
export function schedulerAuthorized(request) {
  const local = process.env.NODE_ENV === 'development' && process.env.FIND10_LOCAL_MODE === '1' && isLoopbackBackend(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const secret = process.env.CRON_SECRET || (local ? process.env.SUPABASE_SERVICE_ROLE_KEY : '')
  return Boolean(secret && (request.headers.get('authorization') === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret))
}
