import { randomUUID } from 'node:crypto'

// Supabase can obscure an already registered address with an empty identity
// list. Only an actual new identity qualifies, never that generic OK response.
export function googleAdsSignupId(user, { existing = false, now = Date.now(), enabled = process.env.NEXT_PUBLIC_GOOGLE_ADS_ENABLED === '1' } = {}) {
  const age = now - Date.parse(user?.created_at || '')
  if (!enabled || existing || !user?.id || !user.identities?.length || !Number.isFinite(age) || age < 0 || age >= 300000) return null
  return randomUUID()
}
