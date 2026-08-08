/* THE nav definition. One file. Everything else is generated from it.
 *
 * There used to be three copies of this — NAV_TOP in MarketingShell.jsx for the
 * React pages, GG_NAV in public/gg-nav.js for the 33 static pages, and a
 * hand-written link list in homepage-source.html. Every time one changed the
 * others drifted, which is how the site ended up with menus that had different
 * links, different order, different dropdown sizes and a different caret glyph.
 * Editing this file and re-running the two build scripts updates all of them.
 *
 * Consumers:
 *   components/MarketingShell.jsx    imports GG_NAV + ggNavCss() directly
 *   scripts/build-gg-nav.mjs         generates public/gg-nav.js (static pages)
 *   scripts/build-homepage-nav.mjs   writes the markup into homepage-source.html
 *
 * After editing this file run BOTH build scripts:
 *   node scripts/build-gg-nav.mjs && pwsh scripts/build-standalone-pages.ps1
 *   node scripts/build-homepage-nav.mjs
 *
 * No DOM here — this module is imported by a server component and read by build
 * scripts, so it must stay pure. The browser-only mount code lives in the
 * generated public/gg-nav.js.
 */

// Order is deliberate: "what is this" first, then "learn more", then the
// shopping surfaces, then Games, then Sign in. A visitor who does not yet know
// what GetGuac is meets that question first rather than a store link.
export const GG_NAV = [
  { href: '/how-it-works', label: 'Why GetGuac', children: [
    { href: '/why-getguac', label: 'Why GetGuac is different' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/get-started', label: 'The get-started guide' },
    { href: '/features', label: 'Features' },
    { href: '/resources#goals', label: 'Goal stories' },
    { href: '/security', label: 'Security' },
    { href: '/pricing', label: 'Pricing' },
  ]},
  { href: '/resources', label: 'Learn', children: [
    { href: '/resources#guides', label: 'Guides' },
    { href: '/articles', label: 'Articles' },
    { href: '/calculators', label: 'Calculators' },
    { href: '/resources#tools', label: 'Tools' },
    { href: '/faq', label: 'FAQ' },
  ]},
  { href: '/marketplace', label: 'Shopping', children: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/coupons', label: 'Coupons' },
  ]},
  { href: '/games', label: 'Games' },
  { href: '/login', label: 'Sign in' },
]

// Flattened for the mobile hamburger. Derived, never hand-maintained: a phone
// user seeing a different set of pages from a desktop user is the exact
// discoverability bug this whole restructure exists to fix.
export const GG_NAV_FLAT = GG_NAV.flatMap((n) => (n.children ? n.children : [n]))

export const GG_FOOTER_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/resources', label: 'Resources' },
  { href: '/games', label: 'Games' },
  { href: '/security', label: 'Security' },
  { href: '/contact', label: 'Contact' },
  { href: '/sitemap.html', label: 'Sitemap' },
]

export const GG_CTA = { href: '/join', label: 'Get started' }

/* The ONLY nav stylesheet. MarketingShell injects it into its <style>; the
 * static pages get it via the generated gg-nav.js; the homepage gets it written
 * into homepage-source.html. Class names are shared so all three render
 * byte-identically at desktop width.
 *
 * 🔴 THIS STRING IS INJECTED INTO A REACT <style>. Keep it ASCII and keep the
 * selectors flat: React's server renderer escapes >, &, ' and " inside a style
 * element differently from the client, which produces a text-content hydration
 * mismatch AND invalid CSS on the server pass. No child combinators, no quoted
 * attribute selectors, no comments.
 *
 * Only the collapse behaviour differs between surfaces, because what happens
 * below the breakpoint differs:
 *   'hamburger'  MarketingShell — MarketingMobileMenu takes over, so the whole
 *                row goes at <1024 (the same width the hamburger appears at).
 *   'inline'     static pages + homepage — there is no hamburger, so the links
 *                have to stay; only the hover menus (untappable) go.
 * Everything above that line is identical, which is the part that was drifting. */
function ggNavBaseCss() {
  return ''
    + '.ggnav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}'
    + '.ggnav a{color:#5C6B60;font-weight:700;font-size:14.5px;text-decoration:none}'
    + '.ggnav a:hover{color:#15281C}'
    + '.ggnav .btn.accent{color:#fff}'
    + '.ggdd{position:relative;display:inline-flex}'
    + '.ggdd-top{display:inline-flex;align-items:center;gap:4px}'
    + '.ggdd-caret{font-size:11px;font-style:normal;opacity:.75}'
    + '.ggdd-menu{position:absolute;left:0;top:100%;padding-top:10px;opacity:0;visibility:hidden;'
    + 'transform:translateY(-4px);transition:opacity .15s,transform .15s,visibility .15s;z-index:60}'
    + '.ggdd:hover .ggdd-menu,.ggdd:focus-within .ggdd-menu{opacity:1;visibility:visible;transform:none}'
    + '.ggdd-card{min-width:232px;background:#fff;border:1px solid #E4EDE4;border-radius:16px;padding:8px;'
    + 'box-shadow:0 22px 44px -28px rgba(16,40,26,.55);display:flex;flex-direction:column;gap:2px}'
    + '.ggdd-card a{padding:9px 12px;border-radius:10px;font-weight:600;font-size:14px;white-space:nowrap}'
    + '.ggdd-card a:hover{background:#F1F8EE;color:#15281C}'
}

export function ggNavCss(collapse = 'inline') {
  return ggNavBaseCss() + (collapse === 'hamburger'
    ? '@media(max-width:1023px){.ggnav{display:none}}'
    : '@media(max-width:900px){.ggnav .ggdd-menu{display:none}.ggnav{gap:12px}}')
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// The caret glyph, exported so the React header and the generated HTML use the
// same character. They used to differ (▼ at 9px/#8a978d in the React header vs
// ▾ at 11px/75% opacity everywhere else), which read as two different sites the
// moment you clicked from the homepage into a React page.
export const GG_CARET = '▾'

/* Menu items only — no brand, no CTA. The homepage already has its own logo and
 * Get-started button and only needs the links swapped. */
export function ggMenuHtml() {
  return GG_NAV.map((n) => {
    if (!n.children) return '<a href="' + esc(n.href) + '">' + esc(n.label) + '</a>'
    const kids = n.children.map((c) => '<a href="' + esc(c.href) + '">' + esc(c.label) + '</a>').join('')
    return '<span class="ggdd">'
      + '<a class="ggdd-top" href="' + esc(n.href) + '">' + esc(n.label)
      + '<i class="ggdd-caret" aria-hidden="true">' + GG_CARET + '</i></a>'
      + '<span class="ggdd-menu"><span class="ggdd-card">' + kids + '</span></span>'
      + '</span>'
  }).join('')
}

/* Full contents of `.wrap.nav` for the static pages, which ship no header of
 * their own worth keeping. */
export function ggNavHtml() {
  return '<a class="brand" href="/"><i>🥑</i>GetGuac</a>'
    + '<nav class="nav-links ggnav" aria-label="Main">' + ggMenuHtml()
    + '<a class="btn accent" href="' + esc(GG_CTA.href) + '">' + esc(GG_CTA.label) + '</a></nav>'
}

export function ggFooterHtml() {
  return GG_FOOTER_LINKS.map((l) => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join(' · ')
}
