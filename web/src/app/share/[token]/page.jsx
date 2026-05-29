// Public share-link landing page — GET /share/<token>
//
// Reads a row from public.shared_items by token (RLS hides expired
// rows automatically, so we don't have to filter manually). Branches
// on payload.kind to render either the Google-Shopping-style item
// layout or the Smashlist-style list layout. Lives OUTSIDE
// (dashboard) so it renders for non-logged-in visitors.
//
// Fire-and-forget view_count bump after render (best-effort, no-await).

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ShareItemLayout, ShareListLayout } from './layouts'

// Server-side anon client. RLS gates reads to live tokens only.
function anonSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Fetch the row + the sharer's display name (so we can say "Ramya shared…").
async function fetchShare(token) {
  const sb = anonSupabase()
  const { data, error } = await sb
    .from('shared_items')
    .select('token, payload, shared_by_user_id, created_at, view_count, expires_at')
    .eq('token', token)
    .maybeSingle()
  if (error || !data) return null

  let sharedByName = null
  if (data.shared_by_user_id) {
    const { data: prof } = await sb
      .from('profiles')
      .select('display_name')
      .eq('id', data.shared_by_user_id)
      .maybeSingle()
    sharedByName = prof?.display_name || null
  }

  // Fire-and-forget view-count bump. RLS allows anon updates of
  // view_count on live rows, so this just works without auth.
  sb.from('shared_items')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('token', token)
    .then(() => {}, () => {})

  return { ...data, sharedByName }
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

  const kind = share.payload?.kind || 'item'
  return kind === 'list'
    ? <ShareListLayout share={share} />
    : <ShareItemLayout share={share} />
}
