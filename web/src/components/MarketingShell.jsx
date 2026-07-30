// Shared chrome (sticky nav + footer) for the public marketing pages so they
// stay consistent and cross-linked. Server-safe (no 'use client').
//
// Restyled to the new design language: white background, Bricolage Grotesque
// display headings + Plus Jakarta Sans body (scoped to .gg-marketing so the
// app/dashboard default font is untouched), avocado-green accents, pill CTAs.
// The fonts come from CSS variables defined in app/layout.jsx.
import { cookies } from 'next/headers'
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

export default function MarketingShell({ subtitle, hideSearch = false, headerTitle, children }) {
  // In-app (mobile WebView) the native shell already provides the top app bar +
  // logo, so rendering the marketing nav here stacks a SECOND avocado logo/header
  // under it. The /embed handshake drops guac_embedded=1 — when set, drop the
  // sticky nav (and footer) so the page sits cleanly inside the native shell.
  const embedded = cookies().get('guac_embedded')?.value === '1'
  return (
    <div className="gg-marketing min-h-screen" style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif', color: '#1A2E22', background: '#fff' }}>
      {/* AdSense loader on the PUBLIC marketing pages only.
          Why here and not the root layout: the root layout also wraps (dashboard),
          and §8 of /privacy makes a hard promise that no ad tracker runs on a
          signed-in page. MarketingShell is used by 24 public pages and by ZERO
          pages under (dashboard), so mounting it here matches the policy exactly
          — /privacy §8 already says AdSense "loads across our public pages".
          Skipped when embedded: the mobile WebView renders these same pages to a
          signed-in user, which is the case §8 covers. Same rule as MetaPixel. */}
      {!embedded && <AdSenseScript />}
      {/* Scope the new typography + accents to marketing pages only. */}
      <style>{`
        .gg-marketing h1, .gg-marketing h2, .gg-marketing h3, .gg-marketing h4 { font-family: var(--font-bricolage), sans-serif; letter-spacing: -0.02em; }
        .gg-marketing a { transition: color .15s ease; }
        @media (max-width: 1024px) { .gg-navlinks { display: none !important; } }
        .gg-dd { position: relative; }
        .gg-ddmenu { display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); padding-top: 12px; z-index: 40; }
        .gg-dd:hover .gg-ddmenu, .gg-dd:focus-within .gg-ddmenu { display: block; }
        .gg-ddcard { background: #fff; border: 1px solid rgba(20,83,45,0.10); border-radius: 14px; box-shadow: 0 14px 34px rgba(21,40,28,0.13); padding: 8px; min-width: 176px; }
        .gg-ddcard a { display: block; padding: 9px 13px; border-radius: 9px; font-size: 14px; font-weight: 600; color: #3d4a42; text-decoration: none; white-space: nowrap; }
        .gg-ddcard a:hover { background: #f2fbf3; color: #065f46; }
        .gg-ddcaret { font-size: 9px; margin-left: 3px; color: #8a978d; }
      `}</style>

      {/* Nav — hidden in-app so it doesn't duplicate the native app bar/logo. */}
      {!embedded && (
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.88)', borderBottom: '1px solid rgba(20,83,45,0.08)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
            <span style={{ fontSize: 22 }}>🥑</span>
            <span className="hidden sm:block" style={{ ...DISPLAY, fontWeight: 800, fontSize: 20, color: '#15281C', letterSpacing: '-0.02em' }}>GetGuac</span>
          </Link>
          {hideSearch
            ? (headerTitle
                ? <div className="flex-1 text-center truncate px-2" style={{ ...DISPLAY, fontWeight: 800, color: '#15281C', fontSize: 17 }}>{headerTitle}</div>
                : <div className="flex-1" />)
            : <HeaderSearch className="flex-1 min-w-0 max-w-xl" />}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
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
            <MarketingAuthButtons />
            {!headerTitle && <MarketingMobileMenu nav={NAV} />}
          </nav>
        </div>
      </header>
      )}

      <main>{children}</main>

      {!embedded && <MarketingFooter />}
    </div>
  )
}
