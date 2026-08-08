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
import { GG_NAV, GG_NAV_FLAT, GG_CARET, ggNavCss } from '../lib/gg-nav-def'

// The nav is NOT defined here any more. It lives in src/lib/gg-nav-def.js, the
// one file that also generates public/gg-nav.js (33 static pages) and the markup
// in homepage-source.html. There used to be a copy in each of those three
// places, "kept in sync" by comments, and they weren't: the order, the caret
// glyph, the dropdown padding and the hover colours had all drifted apart, so
// clicking from the homepage into a React page visibly changed the header.
//
// Sign in is dropped from both lists because MarketingAuthButtons renders it —
// it has to, since a signed-in visitor gets Sign out / Dashboard there instead.
const NAV_TOP = GG_NAV.filter((n) => n.href !== '/login')
const NAV = GG_NAV_FLAT.filter((n) => n.href !== '/login')

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
    { href: '/calculators', label: 'Calculators' },
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

// Shell-only chrome. The nav rules are NOT here — ggNavCss() supplies those and
// this string is concatenated with it at render time. Same ASCII-only, flat-
// selector rule applies: this goes inside a React <style>.
const SHELL_CSS = `
html.gg-embedded .gg-embed-hide { display: none !important; }
.gg-marketing { overflow-x: clip; }
.gg-marketing h1, .gg-marketing h2, .gg-marketing h3, .gg-marketing h4 { font-family: var(--font-bricolage), sans-serif; letter-spacing: -0.02em; }
.gg-marketing h1 { font-weight: 800; letter-spacing: -0.05em; }
.gg-marketing h2 { font-weight: 800; letter-spacing: -0.045em; }
.gg-marketing a { transition: color .15s ease; }
@media (max-width: 639px) {
  .gg-header-row { gap: 10px !important; }
  .gg-header-search, .gg-header-auth { display: none !important; }
  .gg-header-nav { margin-left: auto; }
}
`

// hideSearch defaults to TRUE so every marketing page's header matches the
// homepage, which has no search box. It used to default to false, which is why
// a product search appeared on pages like /how-it-works where there is nothing
// to search — marketplace, plan, resources and the join pages were all already
// passing hideSearch to switch it back off one page at a time. A shopping
// surface that genuinely wants it can opt in with hideSearch={false}.
export default function MarketingShell({ subtitle, hideSearch = true, headerTitle, ads = true, children }) {
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
      {/* 🔴 A CLASS, NOT AN ATTRIBUTE — AND NO DOUBLE QUOTES IN THE CSS BELOW.
          The first version set data-gg-embedded="1" and matched it with
          html[data-gg-embedded="1"]. React's server renderer HTML-escapes text
          children of <style>, so the server sent
              html[data-gg-embedded=&quot;1&quot;]
          while the client produced real quotes. Two consequences, both shipped
          to production before this fix:
            1. Text-content hydration mismatch — a React runtime error on every
               marketing page.
            2. <style> content is RAW TEXT, so &quot; is never decoded. The
               server-rendered selector was invalid CSS, meaning the in-app
               chrome was NOT hidden until React hydrated and rewrote the node —
               exactly the flash this script exists to prevent.
          A class name needs no quotes, so nothing can be escaped. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(document.cookie.split('; ').indexOf('guac_embedded=1')>-1)document.documentElement.classList.add('gg-embedded')}catch(e){}",
        }}
      />
      {/* Scope the new typography + accents to marketing pages only, then append
          the shared nav stylesheet. The dropdown rules used to be written out a
          second time here as .gg-dd/.gg-ddcard with subtly different padding,
          radius and hover colours; they come from ggNavCss() now so the React
          header, the homepage and the 33 static pages resolve to the same
          computed values.

          One string, not two children — a <style> with two text children is a
          hydration mismatch waiting to happen. And nothing non-ASCII or
          commented goes inside it: React escapes >, &, ' and " in style text
          differently on the server than the client, which has broken this page
          in production twice. See the note on ggNavCss(). */}
      <style>{SHELL_CSS + ggNavCss('hamburger')}</style>

      {/* Nav — hidden in-app so it doesn't duplicate the native app bar/logo. */}
      <header className="gg-embed-hide" style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.88)', borderBottom: '1px solid rgba(20,83,45,0.08)' }}>
        {/* height comes from ggNavCss now, with the other two headers.
            The WIDTH is the homepage's .wrap formula, not max-width + padding.
            It was maxWidth 1180 with 28px of padding, which puts the logo 28px
            further in and the content band 56px narrower than the homepage: the
            wordmark visibly jumped right the moment you clicked off the
            homepage onto any of these 20 pages. Measured at 1280px wide, logo
            x=78 here against x=50 there. */}
        <div className="gg-header-row" style={{ width: 'min(1180px, calc(100% - clamp(24px, 5vw, 56px)))', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* ggbrand, not inline styles. The wordmark was 20px/#15281C here,
              21px/#12261B on the homepage and 22px/#102819 on the static pages —
              three sizes and three greens for the same six letters. */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, textDecoration: 'none' }}>
            <span style={{ fontSize: 22 }}>🥑</span>
            <span className="hidden sm:block ggbrand">GetGuac</span>
          </Link>
          {hideSearch
            ? (headerTitle
                ? <div className="flex-1 text-center truncate px-2" style={{ ...DISPLAY, fontWeight: 800, color: '#15281C', fontSize: 17 }}>{headerTitle}</div>
                : <div className="flex-1" />)
            : <HeaderSearch className="gg-header-search flex-1 min-w-0 max-w-xl" />}
          <nav className="gg-header-nav" style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
            {/* Class names, not inline styles. The colour/size/weight of these
                links used to be repeated inline here AND in ggNavCss(); the
                shared classes mean there is exactly one rule to change. */}
            {!headerTitle && (
              <div className="ggnav">
                {NAV_TOP.map((n) => n.children ? (
                  <span key={n.href} className="ggdd">
                    <Link className="ggdd-top" href={n.href}>
                      {n.label}<i className="ggdd-caret" aria-hidden="true">{GG_CARET}</i>
                    </Link>
                    <span className="ggdd-menu">
                      <span className="ggdd-card">
                        {n.children.map((c) => (
                          <Link key={c.href + c.label} href={c.href}>{c.label}</Link>
                        ))}
                      </span>
                    </span>
                  </span>
                ) : (
                  <Link key={n.href} href={n.href}>{n.label}</Link>
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
