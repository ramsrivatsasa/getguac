// Shared chrome (sticky nav + footer) for the public marketing pages so they
// stay consistent and cross-linked. Server-safe (no 'use client').
//
// Restyled to the new design language: white background, Bricolage Grotesque
// display headings + Plus Jakarta Sans body (scoped to .gg-marketing so the
// app/dashboard default font is untouched), avocado-green accents, pill CTAs.
// The fonts come from CSS variables defined in app/layout.jsx.
import Link from 'next/link'
import HeaderSearch from './HeaderSearch'
import MarketingAuthButtons from './MarketingAuthButtons'
import MarketingMobileMenu from './MarketingMobileMenu'
import MarketingFooter from './MarketingFooter'
import AdSenseScript from './AdSenseScript'

// Flat list — feeds the mobile hamburger menu (and keeps every page reachable).
const NAV = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/resources', label: 'Resources' },
  { href: '/articles', label: 'Articles' },
  { href: '/plan', label: 'Calculators' },
  { href: '/games', label: 'Games' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/security', label: 'Security' },
]

// Desktop header row. Articles + Calculators live under the Resources
// submenu (hover/focus dropdown) instead of cluttering the top level.
const NAV_TOP = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/games', label: 'Games' },
  { href: '/resources', label: 'Resources', children: [
    { href: '/resources', label: 'Resources hub' },
    { href: '/articles', label: 'Articles' },
    { href: '/plan', label: 'Calculators' },
  ]},
  { href: '/how-it-works', label: 'How it works' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
]

const FOOTER = [
  { heading: 'Product', links: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/coupons', label: 'Coupons' },
    { href: '/features', label: 'Features' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/tour', label: 'Watch the tour' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/download', label: 'Download apps' },
  ]},
  { heading: 'Learn', links: [
    { href: '/resources', label: 'Resources' },
    { href: '/articles', label: 'Articles' },
    { href: '/plan', label: 'Calculators' },
    { href: '/games', label: 'Games' },
    { href: '/faq', label: 'FAQ' },
    { href: '/how-email-works', label: 'How email works' },
    { href: '/security', label: 'Security & privacy' },
    { href: '/about', label: 'About' },
  ]},
  { heading: 'Company', links: [
    { href: '/contact', label: 'Contact' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ]},
]

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

export default function MarketingShell({ subtitle, hideSearch = false, headerTitle, ads = true, children }) {
  // In-app (mobile WebView) the native shell already provides the top app bar +
  // logo, so rendering the marketing nav here stacks a SECOND avocado logo/header
  // under it. The /embed handshake drops guac_embedded=1 — when set, hide the
  // sticky nav (and footer) so the page sits cleanly inside the native shell.
  //
  // 🔴 THIS IS HIDDEN WITH CSS, NOT `cookies()`. DO NOT CHANGE IT BACK.
  // This used to read `cookies().get('guac_embedded')`. `cookies()` is a dynamic
  // API, so every route rendering this shell became impossible to prerender or
  // CDN-cache — Next is forced to emit `Cache-Control: private, no-store`. That
  // covered all 548 arcade pages (via components/games/GamePageShell.jsx) and 27
  // marketing pages, so `/games/[slug]` never produced a single prerendered HTML
  // file despite `generateStaticParams()` correctly returning 512 slugs.
  //
  // Measured on production 2026-08-03: a crawler walking the arcade at 212
  // req/min, 52 distinct slugs per 28 seconds, 98/98 `X-Vercel-Cache: MISS` —
  // ~82k function invocations and 5.6 GB per 12 hours, against 36 real visitors.
  // Cacheable pages would have served that same crawler from the CDN for free.
  //
  // The inline script below runs BEFORE first paint (it is in the markup, above
  // the header), so in-app users never see the nav flash in and out. The HTML is
  // byte-identical for every visitor, which is the whole point — it can be
  // cached. React never re-renders around this; only the attribute changes.
  return (
    <div className="gg-marketing min-h-screen" style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif', color: '#1A2E22', background: '#fff' }}>
      {/* AdSense loader on the PUBLIC marketing pages only.
          Why here and not the root layout: the root layout also wraps (dashboard),
          and §8 of /privacy makes a hard promise that no ad tracker runs on a
          signed-in page. MarketingShell backs the public pages and ZERO pages
          under (dashboard), so mounting it here matches the policy exactly
          — /privacy §8 already says AdSense "loads across our public pages".
          Skipped when embedded: the mobile WebView renders these same pages to a
          signed-in user, which is the case §8 covers. Same rule as MetaPixel.

          `ads` exists because "public" is not the same as "should be monetized".
          This shell ALSO backs the 548 arcade pages (app/games/page.jsx and
          components/games/GamePageShell.jsx) and the thin, noindexed /coupons
          page. Those opt out: the arcade follows the ARCADE_ADS_ENABLED
          kill-switch, and /coupons carries no <AdSlot/> at all, so loading
          Google there earned nothing and only widened the surface we are asking
          AdSense to judge while a "Low value content" rejection is outstanding.
          NOT /marketplace, despite it being equally thin and noindexed: it
          renders four real <AdSlot/>s via MarketplaceClient, so opting it out
          would be a revenue decision — and would not even work, since AdSlot
          pulls this same loader in by itself. Default stays true so a new real
          content page is monetized unless it says otherwise. */}
      {/* AdSenseScript now does the in-app check itself, on the client, so this
          stays a static render. See the privacy note in that file. */}
      {ads && <AdSenseScript />}

      {/* Pre-paint in-app detection. Sets the attribute synchronously as the
          parser reaches it — before the header below exists — so there is no
          flash of marketing chrome inside the native app. Identical bytes for
          every visitor, so it does not stop the page being cached. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(document.cookie.split('; ').indexOf('guac_embedded=1')>-1)document.documentElement.setAttribute('data-gg-embedded','1')}catch(e){}",
        }}
      />
      {/* Scope the new typography + accents to marketing pages only. */}
      <style>{`
        html[data-gg-embedded="1"] .gg-embed-hide { display: none !important; }
        .gg-marketing { overflow-x: clip; }
        .gg-marketing h1, .gg-marketing h2, .gg-marketing h3, .gg-marketing h4 { font-family: var(--font-bricolage), sans-serif; letter-spacing: -0.02em; }
        .gg-marketing a { transition: color .15s ease; }
        @media (max-width: 1024px) { .gg-navlinks { display: none !important; } }
        @media (max-width: 639px) {
          .gg-header-row { padding-left: 18px !important; padding-right: 14px !important; gap: 10px !important; }
          .gg-header-search, .gg-header-auth { display: none !important; }
          .gg-header-nav { margin-left: auto; }
        }
        .gg-dd { position: relative; }
        .gg-ddmenu { display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); padding-top: 12px; z-index: 40; }
        .gg-dd:hover .gg-ddmenu, .gg-dd:focus-within .gg-ddmenu { display: block; }
        .gg-ddcard { background: #fff; border: 1px solid rgba(20,83,45,0.10); border-radius: 14px; box-shadow: 0 14px 34px rgba(21,40,28,0.13); padding: 8px; min-width: 176px; }
        .gg-ddcard a { display: block; padding: 9px 13px; border-radius: 9px; font-size: 14px; font-weight: 600; color: #3d4a42; text-decoration: none; white-space: nowrap; }
        .gg-ddcard a:hover { background: #f2fbf3; color: #065f46; }
        .gg-ddcaret { font-size: 9px; margin-left: 3px; color: #8a978d; }
      `}</style>

      {/* Nav — hidden in-app so it doesn't duplicate the native app bar/logo. */}
      <header className="gg-embed-hide" style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.88)', borderBottom: '1px solid rgba(20,83,45,0.08)' }}>
        <div className="gg-header-row" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
            <span style={{ fontSize: 22 }}>🥑</span>
            <span className="hidden sm:block" style={{ ...DISPLAY, fontWeight: 800, fontSize: 20, color: '#15281C', letterSpacing: '-0.02em' }}>GetGuac</span>
          </Link>
          {hideSearch
            ? (headerTitle
                ? <div className="flex-1 text-center truncate px-2" style={{ ...DISPLAY, fontWeight: 800, color: '#15281C', fontSize: 17 }}>{headerTitle}</div>
                : <div className="flex-1" />)
            : <HeaderSearch className="gg-header-search flex-1 min-w-0 max-w-xl" />}
          <nav className="gg-header-nav" style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
            {!headerTitle && (
              <div className="gg-navlinks" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {NAV_TOP.map((n) => n.children ? (
                  <div key={n.href} className="gg-dd">
                    <Link href={n.href} style={{ color: '#5C6B60', fontWeight: 500, fontSize: 14.5, textDecoration: 'none' }}>
                      {n.label}<span className="gg-ddcaret">▼</span>
                    </Link>
                    <div className="gg-ddmenu">
                      <div className="gg-ddcard">
                        {n.children.map((c) => (
                          <Link key={c.href + c.label} href={c.href}>{c.label}</Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link key={n.href} href={n.href} style={{ color: '#5C6B60', fontWeight: 500, fontSize: 14.5, textDecoration: 'none' }}>{n.label}</Link>
                ))}
              </div>
            )}
            <div className="gg-header-auth" style={{ display: 'contents' }}><MarketingAuthButtons /></div>
            {!headerTitle && <MarketingMobileMenu nav={NAV} />}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <div className="gg-embed-hide"><MarketingFooter /></div>
    </div>
  )
}
