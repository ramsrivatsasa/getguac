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

// The display face, spelled the way each surface can resolve it. The React
// pages get the family through a CSS variable that next/font defines; the
// static pages load the webfont themselves and have no such variable, so the
// literal name has to follow as the fallback.
//
// UNQUOTED on purpose. A multi-word family name is legal CSS unquoted, and this
// string ends up inside a React <style> where a quote would be escaped to
// &#x27; — a hydration mismatch plus a font-family the server render cannot
// parse. Same rule as everything else in ggNavCss().
//
// The fallback INSIDE var() is load-bearing. `var(--font-bricolage)` with the
// variable undefined does not fall through to the next family in the list — an
// unresolved var() makes the whole declaration invalid at computed-value time,
// so font-family reverts to inherited. next/font only defines that variable on
// the React pages, so the 16 static pages rendered the wordmark in the body
// face until this fallback was added.
const GG_DISPLAY = 'var(--font-bricolage,Bricolage Grotesque),sans-serif'

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
// The three header containers, listed once. `.wrap.nav` is the static pages and
// the homepage, `.gg-header-row` is MarketingShell. Every header rule below is
// written against all three so one edit lands on all 35 pages.
//
// They are SPELLED OUT rather than left as bare class selectors because the
// page stylesheets get a vote. resource.css carries `.nav a:not(.brand)
// {font-size:13px}`, specificity (0,2,1), which quietly beat `.ggnav a` at
// (0,1,1) — so the eleven resources pages rendered a 13px menu while the other
// 24 rendered 14.5px, for weeks, with the link lists matching perfectly. A
// container-qualified selector is (0,3,1) and wins outright.
const BARS = ['.wrap.nav', '.gg-header-row']
const inBar = (sel) => BARS.map((b) => b + ' ' + sel).join(',')

function ggNavBaseCss() {
  return ''
    + '.ggnav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}'
    + '.ggnav a{color:#5C6B60;font-weight:700;font-size:14.5px;text-decoration:none}'
    + '.ggnav a:hover{color:#15281C}'
    + '.ggnav .btn.accent{color:#fff}'
    // Header chrome, one definition. The measured values before this were:
    // bar height 64 / 72 / 74 / 76px, brand 20 / 21 / 22px in three different
    // greens, and the CTA a pill on the homepage but a 12px rounded rect on
    // every React page. See scripts/audit-styles.mjs.
    + BARS.join(',') + '{height:64px}'
    + inBar('.ggnav a') + '{color:#5C6B60;font-weight:700;font-size:14.5px;text-decoration:none}'
    + inBar('.ggdd-card a') + '{font-weight:600;font-size:14px}'
    + inBar('.ggbrand') + '{display:inline-flex;align-items:center;gap:9px;font-family:' + GG_DISPLAY
    + ';font-size:21px;font-weight:800;color:#12261B;letter-spacing:-0.02em;text-decoration:none}'
    // The avocado itself. It was drawn three ways: a bare emoji on the homepage,
    // a 22px emoji in the React header, and a 36-38px green gradient rounded
    // TILE on the static pages. Same six letters beside three different marks.
    // The homepage is the reference, so the tile goes; the emoji is untouched.
    // Every property the tile set is reset explicitly, because these rules land
    // on pages whose own .brand i rule is still in their stylesheet.
    + inBar('.ggmark') + '{display:inline-block;width:auto;height:auto;margin:0;padding:0;'
    + 'border-radius:0;background:none;font-style:normal;font-size:22px;line-height:1}'
    // a.ggcta, not .ggcta. The CTA sits INSIDE nav.ggnav on the static pages, so
    // it is also matched by the link rule above at (0,3,1); a bare .ggcta is
    // (0,3,0) and loses by that one element selector, which rendered the button
    // label in the menu grey on a dark green pill. Qualifying it with the
    // element makes it (0,3,1) and later in source order.
    + inBar('a.ggcta') + '{display:inline-flex;align-items:center;justify-content:center;'
    + 'padding:10px 18px;border-radius:999px;background:#12341F;color:#fff;'
    + 'font-size:14.5px;font-weight:700;line-height:1.2;text-decoration:none;border:0}'
    + inBar('a.ggcta:hover') + '{background:#1B4A2C;color:#fff}'
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

// One breakpoint for the whole site. MarketingMobileMenu is `lg:hidden`, so the
// React shell swaps to its hamburger here; the inline surfaces now swap to their
// own at the same width. They used to part company at 900px, which meant a
// 950px-wide tablet got a hamburger on /pricing and a flat link row on
// /resources/calculators.
const GG_MOBILE_MAX = 1023

/* The mobile row for the 34 surfaces that have no React hamburger: the homepage
 * and the 33 static pages.
 *
 * Before this they had no mobile treatment at all. ggNavBaseCss() gives .ggnav
 * `display:flex;flex-wrap:wrap`, so at phone width the five top-level items
 * wrapped onto three rows and spilled out of the 64px bar over the top of the
 * hero, with the hover menus behind them untappable. The homepage DID carry
 * `@media(max-width:820px){.links{display:none}}` from before the shared nav
 * existed, but `.ggnav{display:flex}` is the same specificity (0,1,0) and the
 * generated block is appended AFTER the page stylesheet, so source order handed
 * it the win and the links came back. That is why hiding them is not enough on
 * its own and why every rule below is container-qualified.
 *
 * 🔴 EVERY RULE HERE GOES THROUGH inBar(). The page stylesheets get a vote and
 * they are more specific than a bare class:
 *   resource.css    `.nav a:not(.brand):not(.btn){display:none}`   (0,2,1)
 *   goal-story.css  `.nav-links a:not(.btn){display:none}`         (0,2,1)
 * Both match the panel's own links, because the panel lives inside `.wrap.nav`.
 * A bare `.ggm-sheet a` is (0,1,1) and loses to both — the menu would open to an
 * empty white sheet on 30 of the 33 static pages. inBar() makes it (0,3,1).
 *
 * No JS. The homepage cannot have any here: page.jsx extracts only the FIRST
 * <script> in the body and runs that, and a <script> inside the markup React
 * injects never executes at all (see build-homepage-nav.mjs). A checkbox plus
 * `:checked ~` is the one mechanism that works identically on the homepage, on
 * the client-rendered static pages, and before any script has loaded.
 *
 * ASCII only, same as the rest of the file. This branch is not the one that ends
 * up in a React <style> — MarketingShell asks for 'hamburger', the homepage gets
 * this through dangerouslySetInnerHTML and the static pages through
 * style.textContent, so neither escapes anything — but the hamburger glyph is
 * still drawn with three <i> bars in MARKUP rather than a non-ASCII character in
 * CSS, so that nothing here breaks if this string is ever handed to React. */
function ggMobileCss() {
  return ''
    // Desktop default. The burger only ever exists on the inline surfaces, so
    // this rule lives here rather than in the shared base.
    + inBar('.ggm') + '{display:none}'
    + '@media(max-width:' + GG_MOBILE_MAX + 'px){'
    // The menu items go; `a.ggcta` deliberately stays. On the static pages the
    // CTA is INSIDE nav.ggnav, so hiding the container would have taken "Get
    // started" with it — the one control a phone visitor actually came for.
    // Hence hiding the items one class at a time instead of the whole row.
    + inBar('.ggdd') + '{display:none}'
    + inBar('a.gglink') + '{display:none}'
    // goal-story.css sets `.nav{min-height:66px}` at 520px, which beats the
    // shared `height:64px` and would leave the panel overlapping the bar by 2px.
    + BARS.join(',') + '{min-height:64px}'
    + inBar('.ggm') + '{position:relative;display:inline-flex;align-items:center;'
    + 'justify-content:center;width:42px;height:42px;flex-shrink:0}'
    // The checkbox IS the hit target: full-size, transparent, on top of the
    // glyph. A <label for> would not be focusable, and this keeps the control
    // keyboard-operable (tab to it, space to open) with no script.
    + inBar('.ggm-cb') + '{position:absolute;left:0;top:0;width:42px;height:42px;'
    + 'margin:0;padding:0;border:0;opacity:0;cursor:pointer;z-index:2;'
    + '-webkit-appearance:none;appearance:none}'
    + inBar('.ggm-ico') + '{position:relative;display:block;width:20px;height:14px}'
    + inBar('.ggm-ico i') + '{position:absolute;left:0;width:20px;height:2px;border-radius:2px;'
    + 'background:#15281C;transition:transform .18s,opacity .18s}'
    + inBar('.ggm-b1') + '{top:0}'
    + inBar('.ggm-b2') + '{top:6px}'
    + inBar('.ggm-b3') + '{top:12px}'
    + inBar('.ggm-cb:focus-visible') + '{opacity:1;outline:2px solid #12341F;outline-offset:-6px;border-radius:10px}'
    // Bars fold into an X so the open state is legible without a second glyph.
    + inBar('.ggm-cb:checked ~ .ggm-ico .ggm-b1') + '{transform:translateY(6px) rotate(45deg)}'
    + inBar('.ggm-cb:checked ~ .ggm-ico .ggm-b2') + '{opacity:0}'
    + inBar('.ggm-cb:checked ~ .ggm-ico .ggm-b3') + '{transform:translateY(-6px) rotate(-45deg)}'
    // position:fixed at top:64px lands in the same place on both kinds of
    // surface, which is why it is fixed rather than absolute. The homepage,
    // resource.css and goal-story.css all give the header backdrop-filter, and a
    // backdrop-filter creates a containing block for fixed descendants — so
    // there the offset is measured from the (full-width, 64px tall) header box.
    // Where there is no such ancestor it is measured from the viewport, and the
    // header sits at the top of the document. Both resolve to "directly under
    // the bar". max-height + scroll because 16 links do not fit a short phone.
    + inBar('.ggm-panel') + '{position:fixed;left:0;right:0;top:64px;z-index:70;display:none;'
    + 'background:#fff;border-bottom:1px solid #E4EDE4;'
    + 'box-shadow:0 22px 44px -28px rgba(16,40,26,.55);max-height:72vh;overflow-y:auto}'
    + inBar('.ggm-cb:checked ~ .ggm-panel') + '{display:block}'
    // Two columns and the homepage's own .wrap width formula, so the panel's
    // links line up with the page content underneath rather than with the bar.
    + inBar('.ggm-sheet') + '{display:grid;grid-template-columns:1fr 1fr;gap:0 18px;'
    + 'width:min(1180px,calc(100% - clamp(24px,5vw,56px)));margin:0 auto;padding:4px 0 14px}'
    + inBar('.ggm-sheet a') + '{display:block;padding:13px 2px;font-size:14.5px;font-weight:700;'
    + 'color:#3D4F44;border-bottom:1px solid #F0F4F0;text-decoration:none}'
    + inBar('.ggm-sheet a:hover') + '{color:#12341F}'
    + '}'
}

export function ggNavCss(collapse = 'inline') {
  return ggNavBaseCss() + (collapse === 'hamburger'
    ? '@media(max-width:' + GG_MOBILE_MAX + 'px){.ggnav{display:none}}'
    : ggMobileCss())
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// The caret glyph, exported so the React header and the generated HTML use the
// same character. They used to differ (▼ at 9px/#8a978d in the React header vs
// ▾ at 11px/75% opacity everywhere else), which read as two different sites the
// moment you clicked from the homepage into a React page.
export const GG_CARET = '▾'

/* The mobile menu for the inline surfaces: hit target, glyph and panel.
 *
 * The panel lists GG_NAV_FLAT, which is what that export was always for — a
 * phone visitor reaching a different set of pages from a desktop visitor is the
 * discoverability bug this whole restructure exists to fix, so the flat list is
 * derived from the same array rather than written out again here.
 *
 * The checkbox carries the accessible name because it is the focusable control;
 * the bars are decorative. See ggMobileCss() for why this is a checkbox and not
 * a button with a click handler. */
export function ggBurgerHtml() {
  const links = GG_NAV_FLAT
    .map((n) => '<a href="' + esc(n.href) + '">' + esc(n.label) + '</a>')
    .join('')
  return '<span class="ggm">'
    + '<input class="ggm-cb" type="checkbox" id="gg-menu" aria-label="Menu">'
    + '<span class="ggm-ico" aria-hidden="true">'
    + '<i class="ggm-b1"></i><i class="ggm-b2"></i><i class="ggm-b3"></i></span>'
    + '<span class="ggm-panel"><span class="ggm-sheet">' + links + '</span></span>'
    + '</span>'
}

/* Menu items only — no brand, no CTA. The homepage already has its own logo and
 * Get-started button and only needs the links swapped.
 *
 * The burger is appended here, not in ggNavHtml(), so that it lands in the same
 * place on both surfaces. ggNavHtml() wraps this output plus the CTA in one
 * <nav>, giving `... [burger][cta]`; on the homepage the CTA is a SIBLING of the
 * nav and cannot be reordered across containers, so ending the menu with the
 * burger is what makes the two rows read identically. */
export function ggMenuHtml() {
  return GG_NAV.map((n) => {
    // gglink so the mobile query can hide the childless top-level links without
    // also matching a.ggcta, which sits in this same nav on the static pages.
    if (!n.children) return '<a class="gglink" href="' + esc(n.href) + '">' + esc(n.label) + '</a>'
    const kids = n.children.map((c) => '<a href="' + esc(c.href) + '">' + esc(c.label) + '</a>').join('')
    return '<span class="ggdd">'
      + '<a class="ggdd-top" href="' + esc(n.href) + '">' + esc(n.label)
      + '<i class="ggdd-caret" aria-hidden="true">' + GG_CARET + '</i></a>'
      + '<span class="ggdd-menu"><span class="ggdd-card">' + kids + '</span></span>'
      + '</span>'
  }).join('') + ggBurgerHtml()
}

/* Full contents of `.wrap.nav` for the static pages, which ship no header of
 * their own worth keeping. */
export function ggNavHtml() {
  return '<a class="brand ggbrand" href="/"><i class="ggmark">🥑</i>GetGuac</a>'
    + '<nav class="nav-links ggnav" aria-label="Main">' + ggMenuHtml()
    + '<a class="btn accent ggcta" href="' + esc(GG_CTA.href) + '">' + esc(GG_CTA.label) + '</a></nav>'
}

export function ggFooterHtml() {
  return GG_FOOTER_LINKS.map((l) => '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>').join(' · ')
}
