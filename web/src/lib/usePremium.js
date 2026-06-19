'use client'
// usePremium() — true when the signed-in user has active premium (ad-free
// Tier-2). Reads premium_entitlements once per page session (module-cached)
// so dropping it into every AdSlot costs at most one query. Logged-out and
// free users resolve to false, so they keep seeing all ads.
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

let cache // Promise<boolean> — shared across all hook consumers this session.

async function fetchPremium() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    const { data } = await sb
      .from('premium_entitlements')
      .select('premium_until')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!data?.premium_until) return false
    return new Date(data.premium_until).getTime() > Date.now()
  } catch {
    return false // never block ads on an error
  }
}

export function usePremium() {
  const [premium, setPremium] = useState(false)
  useEffect(() => {
    if (!cache) cache = fetchPremium()
    let alive = true
    cache.then((v) => { if (alive) setPremium(!!v) })
    return () => { alive = false }
  }, [])
  return premium
}
