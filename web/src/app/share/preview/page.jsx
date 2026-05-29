// Dummy share-landing page — Google-Shopping-style product grid so we
// can preview the layout in the browser before wiring DB / API. Once
// approved, this becomes /share/[token]/page.jsx with payload read from
// the shared_items row.
//
// Visit http://localhost:3001/share/preview to view.
//
// Lives OUTSIDE (dashboard) so it renders without a login — the whole
// point of a public share page.
'use client'
import Link from 'next/link'
import { MapPin, Star, ExternalLink, ShoppingCart, Play } from 'lucide-react'

const DUMMY_SHARED = {
  shared_by_name: 'Ramya',
  item_title: 'Bounty Select-A-Size Paper Towels, 6 Double Rolls',
  category_emoji: '🧻',
  rating: 5,
  best_price_callout: 'Best historical price at Costco — save up to $4.80',
  expires_in_days: 30,
}

// The shared item is the hero — first tile in the grid, marked as
// the sharer's pick. The rest are "Also available at…" comparison
// tiles so the recipient sees the full landscape in Google Shopping
// style. Photos are placeholders for the dummy.
const TILES = [
  {
    sale: true,
    location: 'Chantilly',
    store: 'Costco Wholesale',
    title: 'Bounty Select-A-Size Paper Towels, 6 Double Rolls',
    price: 12.99,
    original: 16.00,
    badge: 'Ramya’s pick',
    rating: 4.7,
    review_count: 1284,
  },
  {
    sale: false,
    location: 'Herndon',
    store: 'Walmart',
    title: 'Bounty Select-A-Size Triple Rolls, 6 Pack',
    price: 9.99,
    original: 12.00,
    sale_too: true,
    rating: 4.5,
    review_count: 932,
  },
  {
    sale: false,
    location: 'Herndon',
    store: 'Target',
    title: 'Bounty Double Roll Paper Towels — 6 Count',
    price: 13.49,
    original: null,
    rating: 4.4,
    review_count: 612,
  },
  {
    sale: true,
    location: 'Chantilly',
    store: 'CVS Pharmacy',
    title: 'Bounty 2-Ply Paper Towels, 6 Rolls',
    price: 15.79,
    original: 17.00,
    rating: 4.3,
    review_count: 198,
  },
  {
    sale: false,
    location: 'Online',
    store: 'Amazon',
    title: 'Bounty Select-A-Size 12 Triple Rolls',
    price: 27.79,
    original: null,
    rating: 4.8,
    review_count: 8421,
  },
  {
    sale: true,
    location: 'Online',
    store: 'Walgreens.com',
    title: 'Bounty Paper Towels — 6 Double Rolls',
    price: 7.99,
    original: 11.00,
    rating: 4.2,
    review_count: 421,
  },
]

export default function SharePreviewPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
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

      <div className="max-w-6xl mx-auto px-5 py-6">
        {/* From-line */}
        <p className="text-sm text-gray-500 mb-1">
          <span className="font-bold text-emerald-800">{DUMMY_SHARED.shared_by_name}</span>
          {' '}shared a product with you 💌
        </p>
        <h1 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">
          {DUMMY_SHARED.item_title}
        </h1>

        {/* Filter chips row — purely visual, mimics the Google Shopping deal-chip strip */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-100">
          {['🥑 Ramya’s pick', '📍 Nearby', 'Under $20', 'On sale', '2-ply', 'Free shipping'].map((chip, i) => (
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

        {/* Sponsored / featured header */}
        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">
          Showing prices near you
        </p>

        {/* Product tile grid — Google Shopping style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TILES.map((t, i) => (
            <ProductTile key={i} tile={t} hero={i === 0} category_emoji={DUMMY_SHARED.category_emoji} />
          ))}
        </div>

        {/* Best-price strip — pulled out of grid since it's the key signal */}
        <div className="mt-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-2xl shrink-0">💰</span>
          <p className="text-sm text-amber-900">
            <span className="font-bold">{DUMMY_SHARED.best_price_callout}</span>
          </p>
        </div>

        {/* Soft CTA — sits at the bottom so content is read first */}
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

        {/* "How GetGuac works" video — 60-second walkthrough. Placeholder
            until we have a real video URL; replace the iframe `src` with
            the actual YouTube / Vimeo / Mux embed URL when ready. Keeping
            it as a YouTube embed by default since that's the lowest-lift
            CDN + analytics path for a marketing surface. */}
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
            {/* Click to load the iframe — keeps initial page weight tiny.
                When the real video lands we can swap this for an actual
                <iframe> with the right src. */}
            <button
              type="button"
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 text-white bg-gradient-to-br from-emerald-700/80 via-emerald-800/80 to-gray-900/80 hover:from-emerald-600/85 hover:via-emerald-700/85 hover:to-gray-900/80 transition-all"
              title="Play walkthrough"
            >
              <span className="w-20 h-20 rounded-full bg-white text-emerald-700 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play size={36} className="ml-1 fill-emerald-700" />
              </span>
              <span className="font-bold text-base">Watch the 60-second walkthrough</span>
              <span className="text-xs text-emerald-100">
                Receipt scan · Auto-categorize · Buy Again list
              </span>
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            Or read the deep-dive on the{' '}
            <Link href="/how-it-works" className="text-emerald-700 font-semibold hover:underline">
              How it works
            </Link>{' '}
            page.
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-[11px] text-gray-400 mt-10 pt-6 border-t border-gray-200">
          Shared via <span className="font-bold text-emerald-700">getguac.app</span>
          {' · '}
          This page expires in {DUMMY_SHARED.expires_in_days} days
        </footer>
      </div>
    </main>
  )
}

// Single product tile — mimics the Google Shopping result card.
// `hero` tile gets the "Ramya's pick" sash + a brighter outline so it
// stands out from the comparison tiles.
function ProductTile({ tile, hero, category_emoji }) {
  return (
    <div
      className={`relative rounded-xl border bg-white overflow-hidden flex flex-col transition-all ${
        hero
          ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Image area — placeholder gray block with category emoji */}
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center text-6xl">
        {category_emoji}
        {tile.sale && (
          <span className="absolute top-2 left-2 bg-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wide text-gray-700">
            Sale
          </span>
        )}
        {hero && (
          <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
            🥑 {tile.badge}
          </span>
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
        {/* Location chip */}
        <div className="inline-flex items-center gap-1 text-[11px] text-gray-700">
          <MapPin size={11} className="text-blue-600" />
          <span className="font-semibold">{tile.location}</span>
        </div>

        {/* Store + title — 2-line clamp like Google */}
        <p className="text-[13px] leading-snug text-blue-700 line-clamp-2 font-medium">
          {tile.title}
        </p>

        {/* Price row */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-emerald-700 tabular-nums">
            ${tile.price.toFixed(2)}
          </span>
          {tile.original && (
            <span className="text-xs text-gray-400 line-through tabular-nums">
              ${tile.original.toFixed(0)}
            </span>
          )}
        </div>

        {/* Rating + store footer */}
        <div className="mt-auto pt-1 flex items-center gap-1 text-[10px] text-gray-500">
          <Star size={10} className="text-amber-500 fill-amber-500" />
          <span className="font-bold text-gray-700 tabular-nums">{tile.rating}</span>
          <span>({tile.review_count.toLocaleString()})</span>
          <span className="ml-auto text-gray-400 truncate">{tile.store}</span>
        </div>
      </div>
    </div>
  )
}
