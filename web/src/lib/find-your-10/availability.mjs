import { isLoopbackBackend } from './local-boundary.mjs'

export function find10Enabled(env = process.env) {
  return (env.NODE_ENV === 'development' && env.FIND10_LOCAL_MODE === '1') ||
    (env.NODE_ENV === 'production' && env.FIND10_PRODUCTION_ENABLED === '1')
}

export function find10BackendAllowed(env = process.env) {
  if (!find10Enabled(env)) return false
  if (env.NODE_ENV === 'development') return isLoopbackBackend(env.NEXT_PUBLIC_SUPABASE_URL)
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL)
    return url.protocol === 'https:' && url.hostname === 'qchkwojgvfhlbdtpzzig.supabase.co' && !url.username && !url.password
  } catch { return false }
}
