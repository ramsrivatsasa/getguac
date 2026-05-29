// Public share-link landing page — GET /share/<token>
//
// Reads a row from public.shared_items by token (RLS hides expired
// rows automatically, so we don't have to filter manually). Branches
// on payload.kind to render either the Google-Shopping-style item
// layout or the Smashlist-style list layout. Lives OUTSIDE
// (dashboard) so it renders for non-logged-in visitors.
//
// Fire-and-forget view_count bump after render (best-effort, no-await).

import { cache } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ShareItemLayout, ShareListLayout } from './layouts'

// Server-side anon client. The anon role no longer has direct access
// to `shared_items` (see migration 059 — it was a security hole). All
// reads go through the SECURITY DEFINER RPCs.
function anonSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Per-request cached so generateMetadata + the page component share
// the same fetch instead of double-querying the DB. React's cache()
// dedupes by argument shape within a single request.
const fetchShare = cache(async (token) => {
  const sb = anonSupabase()
  const { data: rows, error } = await sb.rpc('get_share_by_token', {
    target_token: token,
  })
  const row = Array.isArray(rows) ? rows[0] : rows
  if (error || !row) return null

  let sharedByName = null
  if (row.shared_by_user_id) {
    const { data: prof } = await sb
      .from('profiles')
      .select('display_name')
      .eq('id', row.shared_by_user_id)
      .maybeSingle()
    sharedByName = prof?.display_name || null
  }
  return { ...row, sharedByName }
})

// Atomic view-count bump. Called once from the page component (not
// generateMetadata) so we don't double-count when the metadata
// generator and the render both hit the function.
async function bumpView(token) {
  const sb = anonSupabase()
  sb.rpc('bump_share_view_count', { target_token: token }).then(() => {}, () => {})
}

// Build OpenGraph metadata so WhatsApp / iMessage / Slack render a rich
// preview card when the URL is shared. Pulls title + description from
// the snapshot so each share gets a unique unfurl.
export async function generateMetadata({ params }) {
  const share = await fetchShare(params.token)
  if (!share) {
    return { title: 'Share not found · GetGuac' }
  }
  const p = share.payload || {}
  const isItem = p.kind === 'item'
  const title = isItem
    ? `${p.item_title || 'A product'} · GetGuac`
    : `${share.sharedByName || 'Someone'}'s shopping list · GetGuac`
  const description = isItem
    ? (p.best_price_callout || 'See what they paid + compare nearby stores.')
    : `${p.total_items || ''} items across ${p.store_count || ''} stores — shared on GetGuac.`
  return {
    title,
    description,
    openGraph: {
      title, description,
      type: 'website',
      url: `/share/${params.token}`,
      siteName: 'GetGuac',
    },
    twitter: {
      card: 'summary_large_image',
      title, description,
    },
  }
}

export default async function SharePage({ params }) {
  const share = await fetchShare(params.token)
  if (!share) notFound()

  // Fire-and-forget atomic increment. Only runs in the page component
  // path so generateMetadata doesn't double-bump the counter.
  bumpView(params.token)

  const kind = share.payload?.kind || 'item'
  return kind === 'list'
    ? <ShareListLayout share={share} />
    : <ShareItemLayout share={share} />
}
