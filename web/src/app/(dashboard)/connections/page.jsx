'use client'
// /connections — Retailer connection setup page. Users see a list
// of supported retailers + setup instructions to forward each one's
// receipts to their GetGuac email alias.
//
// Status is tracked per-user via the `user_connections` table
// (migration_063_user_connections.sql). The actual receipt delivery
// happens via the existing email-alias inbox pipeline — Connections
// just helps users discover + set up the forwarding for each store.
//
// Pairs with mobile/lib/screens/connections/connections_screen.dart
// reading the same retailer catalog.

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronRight, Check, Copy, Mail, Plus, X, Smartphone, Link2, ShoppingCart } from 'lucide-react'

// Retailers that the mobile WebView credential-linker supports.
// Kept in sync with mobile/lib/data/retailer_extractors.dart.
// Web can't run cross-origin JS inside the retailer's site (browser
// same-origin policy), so the web CTA here just points to the mobile
// app instead of attempting the link itself.
const LINKABLE_IN_MOBILE = new Set(['amazon', 'walmart', 'costco', 'instacart'])
import { createClient } from '../../../lib/supabase/client'
import { RETAILERS } from '../../../lib/retailers'
import { retailerCapability } from '../../../lib/retailer-capabilities'
import { StoreLogo } from '../../../components/StoreLogo'
import { track } from '../../../lib/analytics'
import mascotBus from '../../../lib/mascotEventBus'
import AnimatedMascot from '../../../components/AnimatedMascot'

export default function ConnectionsPage() {
  const sb = createClient()
  const qc = useQueryClient()
  const [openRetailer, setOpenRetailer] = useState(null)
  const [aliasEmail, setAliasEmail] = useState('')
  const [aliasLoaded, setAliasLoaded] = useState(false)
  const alternateAliasEmail = aliasEmail ? aliasEmail.replace('.g@', '+g@') : ''

  // Pull the user's email alias (so we can show it in setup steps).
  useEffect(() => {
    (async () => {
      try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      // Profile holds the user's GetGuac alias (table: profiles.email_alias)
      const { data: prof } = await sb.from('profiles')
        .select('email_alias').eq('id', user.id).maybeSingle()
      if (prof?.email_alias) {
        // The `.g` address is the retailer-friendly auto-parsing endpoint.
        // Keep `+g` available as an alternate for mail systems that support
        // plus addressing; some retailer forms reject the `+` character.
        // (see /how-email-works). The bare `you@getguac.app` is for
        // regular mail that stays in the inbox untouched. Retailers
        // ALWAYS get the .g retailer-friendly variant so Guac-AI runs on
        // every receipt. +g remains a supported alternate.
        setAliasEmail(`${prof.email_alias}.g@getguac.app`)
      }
      } finally {
        setAliasLoaded(true)
      }
    })()
  }, [sb])

  // Connection-state map. Read-once; status mutations invalidate.
  const { data: connections = new Map() } = useQuery({
    queryKey: ['user_connections'],
    queryFn: async () => {
      const { data } = await sb.from('user_connections')
        .select('retailer_id, status, receipts_seen, verified_at')
      const m = new Map()
      for (const c of (data || [])) m.set(c.retailer_id, c)
      return m
    },
    staleTime: 1000 * 60,
    select: (raw) => raw instanceof Map ? raw : new Map(),
  })

  const setStatus = useMutation({
    mutationFn: async ({ retailerId, status }) => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Sign in first')
      const { error } = await sb.from('user_connections').upsert({
        user_id: user.id,
        retailer_id: retailerId,
        status,
      }, { onConflict: 'user_id,retailer_id' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_connections'] }),
    onError: (e) => toast.error(e.message),
  })

  const grouped = useMemo(() => {
    const active = []
    const available = []
    for (const r of RETAILERS) {
      const conn = connections.get(r.id)
      if (conn?.status === 'active' || conn?.status === 'verified') active.push(r)
      else available.push(r)
    }
    return { active, available }
  }, [connections])

  function copyAlias() {
    if (!aliasEmail) return
    navigator.clipboard?.writeText(aliasEmail)
    toast.success('Alias copied')
  }

  return (
    // Left-aligned hug to the sidebar — was mx-auto centered which
    // left a big dead zone on wide screens.
    <div className="max-w-3xl pb-20">
      <header className="flex items-start gap-4 mb-6">
        <AnimatedMascot expression="sitting" size={70} />
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Connections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import reviewed order history in the mobile app or forward receipt emails from your own inbox.
          </p>
        </div>
      </header>

      {/* Email-alias card — the "common destination" for every forwarder.
          Flat white to match the rest of the canvas; the emerald icon
          tile is the only brand accent. */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-guac-700 text-white flex items-center justify-center">
            <Mail size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your GetGuac inbox</p>
            <p className="font-bold text-gray-900 truncate text-base">
              {aliasEmail || (aliasLoaded ? 'Choose your GetGuac email first' : 'Loading your alias…')}
            </p>
            {alternateAliasEmail && (
              <p className="text-xs text-gray-500 truncate">Also accepts {alternateAliasEmail}</p>
            )}
          </div>
          {aliasEmail && (
            <button
              onClick={copyAlias}
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-guac-row inline-flex items-center gap-1.5"
            >
              <Copy size={13} /> Copy
            </button>
          )}
          {aliasLoaded && !aliasEmail && <Link href="/profile" className="rounded-lg border border-guac-line2 bg-guac-50 px-3 py-2 text-xs font-black text-guac-700">Set up email</Link>}
        </div>
        <p className="text-xs text-gray-600 mt-3 leading-relaxed">
          The <span className="font-mono font-bold">.g</span> address auto-parses every receipt that lands
          here. Your regular <span className="font-mono">@getguac.app</span> address (without <span className="font-mono">.g</span> or <span className="font-mono">+g</span>) is for
          signups + personal mail and stays untouched. For email capture, create a forwarding rule in
          the email account that already receives your retailer confirmations.
        </p>
      </section>

      {/* Active connections */}
      {grouped.active.length > 0 && (
        <section className="mb-7">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Active ({grouped.active.length})
          </h2>
          <div className="grid gap-2">
            {grouped.active.map(r => (
              <RetailerRow
                key={r.id}
                retailer={r}
                conn={connections.get(r.id)}
                onClick={() => setOpenRetailer(r)}
                onDismiss={() => setStatus.mutate({ retailerId: r.id, status: 'dismissed' })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available retailers */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Available
        </h2>
        <div className="grid gap-2">
          {grouped.available.map(r => (
            <RetailerRow
              key={r.id}
              retailer={r}
              conn={connections.get(r.id)}
              onClick={() => setOpenRetailer(r)}
              onDismiss={null}
            />
          ))}
        </div>
      </section>

      {/* Setup modal */}
      {openRetailer && (
        <SetupDialog
          retailer={openRetailer}
          alias={aliasEmail}
          existingStatus={connections.get(openRetailer.id)?.status}
          onClose={() => setOpenRetailer(null)}
          onMarkActive={() => {
            setStatus.mutate({ retailerId: openRetailer.id, status: 'active' })
            track('connection_marked_active', { retailer_id: openRetailer.id })
            toast.success(`${openRetailer.name} marked active`)
            mascotBus.bounce()
            setOpenRetailer(null)
          }}
        />
      )}
    </div>
  )
}

function RetailerRow({ retailer, conn, onClick, onDismiss }) {
  const isActive = conn?.status === 'active' || conn?.status === 'verified'
  const isVerified = conn?.status === 'verified'
  const capability = retailerCapability(retailer.id)
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-guac-line2 hover:shadow-sm transition-all"
    >
      <StoreLogo
        storeName={retailer.name}
        fallbackEmoji="🏪"
        size={42}
        emojiClassName="bg-gray-100 text-gray-700"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900">{retailer.name}</p>
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-guac-100 text-guac-700">
              <Check size={9} /> VERIFIED
            </span>
          )}
          {LINKABLE_IN_MOBILE.has(retailer.id) && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-guac-50 text-guac-700 border border-guac-line2">
              <Link2 size={9} /> LINKABLE
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-violet-50 text-violet-700 border border-violet-100">
            <ShoppingCart size={9} /> {capability.label.toUpperCase()}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
          {retailer.captureOnly ? 'Camera-only — no email setup' : retailer.category.replace('-', ' ')}
          {conn?.receipts_seen > 0 && ` · ${conn.receipts_seen} receipts in`}
        </p>
      </div>
      {isActive && onDismiss ? (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss() }}
          className="text-gray-300 hover:text-gray-500 p-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      ) : (
        <div className="w-8 h-8 rounded-full bg-guac-700 text-white flex items-center justify-center">
          <Plus size={16} />
        </div>
      )}
    </div>
  )
}

function SetupDialog({ retailer, alias, existingStatus, onClose, onMarkActive }) {
  const capability = retailerCapability(retailer.id)
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
      >
        <header className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center gap-3">
          <StoreLogo storeName={retailer.name} fallbackEmoji="🏪" size={40} />
          <div className="flex-1">
            <h3 className="gg-h2">{retailer.name}</h3>
            <p className="text-[11px] text-gray-500 capitalize">{retailer.category.replace('-', ' ')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </header>

        <div className="p-5">
          <div className="mb-5 rounded-2xl bg-violet-50 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} className="text-violet-700" />
              <p className="text-xs font-black uppercase tracking-wider text-violet-700">Shopping connection</p>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-700">
              {capability.shopping === 'partner_required'
                ? `${retailer.name} receipt capture can be configured now. Direct cart access requires retailer partner approval; GetGuac uses a secure store handoff until that access is available.`
                : capability.shopping === 'instacart'
                  ? `${retailer.name} items can be prepared for an Instacart shopping-list handoff. Final product selection and checkout stay with the retailer.`
                  : capability.shopping === 'partner_ready'
                    ? `${retailer.name} supports a shoppable-list handoff once GetGuac production API credentials are configured.`
                    : `GetGuac can prepare matching products and hand the user securely to ${retailer.name}. Final checkout remains on the retailer site.`}
            </p>
          </div>
          {LINKABLE_IN_MOBILE.has(retailer.id) && (
            <div className="mb-5 p-4 rounded-2xl border-2 border-guac-line2 bg-guac-50/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Link2 size={16} className="text-guac-700" />
                <p className="text-xs font-black uppercase tracking-wider text-guac-700">
                  Link account directly
                </p>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5">
                  Beta
                </span>
              </div>
              <p className="text-[13px] text-gray-700 leading-relaxed mb-3">
                Sign in directly on {retailer.name}&apos;s page inside the GetGuac mobile app,
                preview visible completed orders, and confirm which orders to import. This beta never sends your password to GetGuac.
              </p>
              <a
                href={`io.getguac.app:/connections/link/${encodeURIComponent(retailer.id)}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-guac-line2 text-guac-700 text-sm font-bold hover:bg-guac-50 no-underline"
              >
                <Smartphone size={15} /> Open {retailer.name} import in GetGuac
              </a>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                This opens the installed GetGuac app. If it does not open, <Link href="/download" className="font-bold text-guac-700 underline">install or update the mobile app</Link> first.
              </p>
            </div>
          )}

          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            {LINKABLE_IN_MOBILE.has(retailer.id) ? 'Or use email forwarding' : 'Setup steps'}
          </h4>
          <ol className="space-y-3">
            {retailer.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-guac-100 text-guac-700 text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>

          {alias && !retailer.captureOnly && (
            <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                Your alias to use
              </p>
              <code className="text-sm font-mono font-bold text-amber-900 break-all">{alias}</code>
            </div>
          )}

          {!retailer.captureOnly && (
            <button
              onClick={onMarkActive}
              className="w-full mt-5 px-4 py-3 rounded-xl bg-guac-700 hover:bg-guac-700 text-white font-bold inline-flex items-center justify-center gap-2"
            >
              <Check size={16} />
              {existingStatus === 'active' || existingStatus === 'verified' ? "I've updated my setup" : "I've completed setup"}
            </button>
          )}
          {retailer.captureOnly && (
            <Link
              href="/receipts"
              className="w-full mt-5 px-4 py-3 rounded-xl bg-guac-700 hover:bg-guac-700 text-white font-bold inline-flex items-center justify-center gap-2 no-underline"
            >
              <ChevronRight size={16} /> Snap a receipt now
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
