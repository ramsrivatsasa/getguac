'use client'
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  const backend = process.env.NEXT_PUBLIC_SUPABASE_URL
  const local = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(new URL(backend).hostname)
  // Keep the database loopback-only; LAN browsers use the app's local proxy.
  const url = local ? `${window.location.origin}/_local/supabase` : backend
  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    local ? { cookieOptions: { name: `sb-${new URL(backend).hostname.split('.')[0]}-auth-token` } } : undefined
  )
}
