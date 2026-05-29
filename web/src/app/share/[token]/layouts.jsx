// Public share-page layouts — rendered by /share/[token]/page.jsx.
//
// Lives as a separate client module so the server component above can
// stay lean (just data fetching + branching) and these can use the
// usual lucide icons / Link / interactivity without polluting the
// metadata generator.
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Star, Play, ShoppingCart, BadgeDollarSign } from 'lucide-react'
import { logoUrlForStore } from '../../../lib/store-logo'

// ─── Item layout ────────────────────────────────────────────────────
// Google-Shopping-style grid for a single shared product. Same shape
// as /share/preview but reads from share.payload instead of DUMMY.
export function ShareItemLayout({ share }) {
  const p = share.payload || {}
  const sharedBy = share.sharedByName || 'A friend'
  const tiles = Array.isArray(p.tiles) && p.tiles.length > 0
    ? p.tiles
    : [{
        store: p.store_name || 'Store',
        location: p.location || 'Nearby',
        title: p.item_title || 'Item',
        price: Number(p.price) || 0,
        original: null,
        sale: false,
        rating: p.rating || null,
        review_count: null,
        badge: 'Shared pick',
      }]

  return (
    <main className="min-h-screen bg-white font-sans text-gray-900">
      <ShareHeader />
      <div className="max-w-6xl mx-auto px-5 py-6">
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-bold text-emerald-800">{sharedBy}</span>
          {' '}shared a product with you 💌
        </p>
        <SharerSocialProof
          sharedBy={sharedBy}
          guacMoneyTotal={p.guac_money_total}
          smashDays={p.smash_days}
        />
        <h1 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">
          {p.item_title || 'A product'}
        </h1>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-100">
          {[`🥑 ${sharedBy}'s pick`, '📍 Nearby', 'Under $20', 'On sale'].map((chip, i) => (
            <button
              key={chip}
              type="button"
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                i === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">
          Showing prices near you
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {tiles.map((t, i) => (
            <ProductTile
              key={i}
              tile={t}
              hero={i === 0}
              category_emoji={p.category_emoji || '🛒'}
              sharedBy={sharedBy}
            />
          ))}
        </div>

        {p.best_price_callout && (
          <div className="mt-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-2xl shrink-0">💰</span>
            <p className="text-sm text-amber-900">
              <span className="font-bold">{p.best_price_callout}</span>
            </p>
          </div>
        )}

        <CTASection />
        <WalkthroughVideo />
        <ShareFooter share={share} />
      </div>
    </main>
  )
}

// ─── List layout ────────────────────────────────────────────────────
// Smashlist-style — items grouped per store, totals per group, with
// a "switch stores and save" callout when applicable. Used when the
// payload kind is 'list'.
export function ShareListLayout({ share }) {
  const p = share.payload || {}
  const sharedBy = share.sharedByName || 'A friend'
  const stores = Array.isArray(p.stores) ? p.stores : []

  const totalItems = p.total_items != null
    ? p.total_items
    : stores.reduce((n, s) => n + (s.items?.length || 0), 0)
  const totalCost = p.total_cost != null
    ? Number(p.total_cost)
    : stores.reduce((sum, s) => sum + (s.items || []).reduce((n, it) => n + (Number(it.price) || 0), 0), 0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 font-sans text-gray-900">
      <ShareHeader />
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-bold text-emerald-800">{sharedBy}</span>
            {' '}shared a shopping list with you 💌
          </p>
          <SharerSocialProof
            sharedBy={sharedBy}
            guacMoneyTotal={p.guac_money_total}
            smashDays={p.smash_days}
          />
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">
            {p.title || 'Shopping list'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {totalItems} item{totalItems === 1 ? '' : 's'} · {stores.length} store{stores.length === 1 ? '' : 's'}
            {totalCost > 0 && <> · est. <span className="font-bold tabular-nums">${totalCost.toFixed(2)}</span></>}
          </p>
        </div>

        <div className="space-y-3">
          {stores.map((s, i) => {
            const storeTotal = (s.items || []).reduce((n, it) => n + (Number(it.price) || 0), 0)
            return (
              <div key={`${s.name}-${i}`} className="bg-white rounded-2xl shadow-sm ring-1 ring-emerald-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50/70 border-b border-emerald-100">
                  <MapPin size={14} className="text-emerald-700" />
                  <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wide">{s.name}</h3>
                  <span className="ml-auto text-xs font-bold text-emerald-700 tabular-nums">
                    {storeTotal > 0 ? `$${storeTotal.toFixed(2)}` : ''}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {(s.items || []).map((it, j) => (
                    <li key={`${it.item_name}-${j}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="text-gray-300">□</span>
                      <span className="flex-1 truncate">{it.item_name}</span>
                      {it.qty && it.qty !== 1 && (
                        <span className="text-xs text-gray-500">×{it.qty}</span>
                      )}
                      {it.price != null && (
                        <span className="font-bold text-emerald-700 tabular-nums w-16 text-right shrink-0">
                          ${Number(it.price).toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {p.savings_callout && (
          <div className="flex items-center gap-3 bg-amber-100/80 border border-amber-200 rounded-xl px-4 py-3">
            <BadgeDollarSign size={20} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">
              <span className="font-bold">{p.savings_callout}</span>
            </p>
          </div>
        )}

        <CTASection />
        <WalkthroughVideo />
        <ShareFooter share={share} />
      </div>
    </main>
  )
}

// ─── Shared sub-components ──────────────────────────────────────────

// Social-proof chips — sharer's lifetime savings and active
// smash-day count rendered under the from-line. Pulled from the
// share's payload so the page renders without an extra DB trip;
// the API can be enriched later to compute these server-side.
export function SharerSocialProof({ sharedBy, guacMoneyTotal, smashDays }) {
  if (guacMoneyTotal == null && smashDays == null) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {guacMoneyTotal != null && guacMoneyTotal > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
          🥑 {sharedBy} earned <span className="tabular-nums">${Number(guacMoneyTotal).toFixed(0)}</span> in GuacMoney
        </span>
      )}
      {smashDays != null && smashDays > 0 && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
          🔥 {smashDays} smash day{smashDays === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}

// Brand logo strip — emoji placeholders for now; can swap to real
// store wordmarks once we have a curated SVG set. The visual purpose
// is to anchor the recipient with familiar grocer names so the share
// page reads as "this is for the stores you already shop at."
export function BrandLogoStrip() {
  const brands = ['Costco', 'Walmart', 'Target', 'Whole Foods', 'Kroger', 'Trader Joe’s', 'Aldi', 'CVS']
  return (
    <div className="mt-6 pt-5 border-t border-gray-100">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold text-center mb-3">
        Trusted at the stores you already shop
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        {brands.map(b => (
          <span key={b} className="text-gray-500 font-semibold whitespace-nowrap">
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}

function ShareHeader() {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-emerald-800">
          <span className="text-2xl leading-none">🥑</span>
          <span className="text-lg tracking-tight">GetGuac</span>
        </Link>
        <Link
          href="/register"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-full hover:bg-emerald-50"
        >
          Sign up →
        </Link>
      </div>
    </header>
  )
}

// Visual block at the top of each ProductTile — prefers the store's
// brand logo (corner-overlaid for context) over a bare category
// emoji. Falls back to the emoji when logo resolution fails.
function TileVisual({ category_emoji, store }) {
  const [errored, setErrored] = useState(false)
  const logo = logoUrlForStore(store)
  if (logo && !errored) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={store || 'Store logo'}
          loading="lazy"
          onError={() => setErrored(true)}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    )
  }
  return <span className="text-6xl">{category_emoji}</span>
}

function ProductTile({ tile, hero, category_emoji, sharedBy }) {
  return (
    <div
      className={`relative rounded-xl border bg-white overflow-hidden flex flex-col transition-all ${
        hero
          ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center text-6xl">
        {tile.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tile.image_url} alt={tile.title || ''} className="w-full h-full object-cover" />
        ) : <TileVisual category_emoji={category_emoji} store={tile.store} />}
        {tile.sale && (
          <span className="absolute top-2 left-2 bg-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wide text-gray-700">
            Sale
          </span>
        )}
        {hero && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
            🥑 {tile.badge || `${sharedBy}'s pick`}
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        <div className="inline-flex items-center gap-1 text-[11px] text-gray-700">
          <MapPin size={11} className="text-blue-600" />
          <span className="font-semibold">{tile.location || 'Nearby'}</span>
        </div>
        <p className="text-[13px] leading-snug text-blue-700 line-clamp-2 font-medium">
          {tile.title}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-emerald-700 tabular-nums">
            ${Number(tile.price || 0).toFixed(2)}
          </span>
          {tile.original && (
            <span className="text-xs text-gray-400 line-through tabular-nums">
              ${Number(tile.original).toFixed(0)}
            </span>
          )}
        </div>
        <div className="mt-auto pt-1 flex items-center gap-1 text-[10px] text-gray-500">
          {tile.rating != null && (
            <>
              <Star size={10} className="text-amber-500 fill-amber-500" />
              <span className="font-bold text-gray-700 tabular-nums">{tile.rating}</span>
              {tile.review_count && <span>({tile.review_count.toLocaleString()})</span>}
            </>
          )}
          <span className="ml-auto text-gray-400 truncate">{tile.store}</span>
        </div>
      </div>
    </div>
  )
}

function CTASection() {
  return (
    <section className="mt-10 bg-gradient-to-br from-emerald-50 to-lime-100 border border-emerald-200 rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
        See prices like this for <span className="text-emerald-700">your</span> grocery list ✨
      </h2>
      <ul className="mt-3 grid sm:grid-cols-2 gap-3 text-sm text-gray-800">
        {[
          ['📧', <>Your own <span className="font-bold">GetGuac inbox</span> — forward any e-receipt</>, true],
          ['📸', 'Scan any paper receipt', false],
          ['🏬', 'Auto-picks the cheapest store per item', false],
          ['🛒', 'Buy Again list when stock runs low', false],
        ].map(([emoji, text, hero]) => (
          <li
            key={typeof text === 'string' ? text : 'inbox'}
            className={`flex items-start gap-2.5 rounded-xl px-3 py-2 ${
              hero
                ? 'bg-emerald-100 ring-1 ring-emerald-300'
                : 'bg-white/70'
            }`}
          >
            <span className="text-lg leading-none mt-0.5">{emoji}</span>
            <span className="font-medium">{text}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-3 rounded-xl shadow hover:shadow-lg transition-all"
      >
        <span className="text-base">🥑</span>
        Start tracking — free
        <span>→</span>
      </Link>
    </section>
  )
}

function WalkthroughVideo() {
  return (
    <section className="mt-10 space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Walkthrough</p>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug mt-0.5">
            See how GetGuac works in 60 seconds
          </h2>
        </div>
        <Link
          href="/how-it-works"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
        >
          Read the full walkthrough →
        </Link>
      </div>
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 ring-1 ring-gray-200 shadow-md group">
        <button
          type="button"
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 text-white bg-gradient-to-br from-emerald-700/80 via-emerald-800/80 to-gray-900/80 hover:from-emerald-600/85 hover:via-emerald-700/85 hover:to-gray-900/80 transition-all"
          title="Play walkthrough"
        >
          <span className="w-20 h-20 rounded-full bg-white text-emerald-700 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
            <Play size={36} className="ml-1 fill-emerald-700" />
          </span>
          <span className="font-bold text-base">Watch the 60-second walkthrough</span>
          <span className="text-xs text-emerald-100">Receipt scan · Auto-categorize · Buy Again list</span>
        </button>
      </div>
    </section>
  )
}

function ShareFooter({ share }) {
  const daysLeft = share.expires_at
    ? Math.max(0, Math.ceil((new Date(share.expires_at) - Date.now()) / 86400_000))
    : null
  return (
    <footer className="text-center text-[11px] text-gray-400 mt-10 pt-6 border-t border-gray-200">
      Shared via <span className="font-bold text-emerald-700">getguac.app</span>
      {daysLeft != null && <> · expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}</>}
    </footer>
  )
}
