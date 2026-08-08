/* GENERATED FILE — DO NOT EDIT.
 *
 * Source: web/src/lib/gg-nav-def.js
 * Rebuild: node scripts/build-gg-nav.mjs && pwsh scripts/build-standalone-pages.ps1
 *
 * Hand-editing this file puts the static pages back out of step with the React
 * header and the homepage, which is the bug the single definition exists to
 * kill. Edit gg-nav-def.js instead.
 *
 * The links are absolute on purpose. These pages are served from /goals/*.html
 * and /resources/**, so /how-it-works has to resolve the same from every depth;
 * the old relative-prefix scheme is what left 31 pages pointing at .html files
 * that had become real routes.
 */
var GG_NAV_HTML = "<a class=\"brand ggbrand\" href=\"/\"><i>🥑</i>GetGuac</a><nav class=\"nav-links ggnav\" aria-label=\"Main\"><span class=\"ggdd\"><a class=\"ggdd-top\" href=\"/how-it-works\">Why GetGuac<i class=\"ggdd-caret\" aria-hidden=\"true\">▾</i></a><span class=\"ggdd-menu\"><span class=\"ggdd-card\"><a href=\"/why-getguac\">Why GetGuac is different</a><a href=\"/how-it-works\">How it works</a><a href=\"/get-started\">The get-started guide</a><a href=\"/features\">Features</a><a href=\"/resources#goals\">Goal stories</a><a href=\"/security\">Security</a><a href=\"/pricing\">Pricing</a></span></span></span><span class=\"ggdd\"><a class=\"ggdd-top\" href=\"/resources\">Learn<i class=\"ggdd-caret\" aria-hidden=\"true\">▾</i></a><span class=\"ggdd-menu\"><span class=\"ggdd-card\"><a href=\"/resources#guides\">Guides</a><a href=\"/articles\">Articles</a><a href=\"/calculators\">Calculators</a><a href=\"/resources#tools\">Tools</a><a href=\"/faq\">FAQ</a></span></span></span><span class=\"ggdd\"><a class=\"ggdd-top\" href=\"/marketplace\">Shopping<i class=\"ggdd-caret\" aria-hidden=\"true\">▾</i></a><span class=\"ggdd-menu\"><span class=\"ggdd-card\"><a href=\"/marketplace\">Marketplace</a><a href=\"/coupons\">Coupons</a></span></span></span><a href=\"/games\">Games</a><a href=\"/login\">Sign in</a><a class=\"btn accent ggcta\" href=\"/join\">Get started</a></nav>";
var GG_FOOTER_HTML = "<a href=\"/how-it-works\">How it works</a> · <a href=\"/resources\">Resources</a> · <a href=\"/games\">Games</a> · <a href=\"/security\">Security</a> · <a href=\"/contact\">Contact</a> · <a href=\"/sitemap.html\">Sitemap</a>";
var GG_NAV_CSS = ".ggnav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.ggnav a{color:#5C6B60;font-weight:700;font-size:14.5px;text-decoration:none}.ggnav a:hover{color:#15281C}.ggnav .btn.accent{color:#fff}.wrap.nav,.gg-header-row{height:64px}.wrap.nav .ggnav a,.gg-header-row .ggnav a{color:#5C6B60;font-weight:700;font-size:14.5px;text-decoration:none}.wrap.nav .ggdd-card a,.gg-header-row .ggdd-card a{font-weight:600;font-size:14px}.wrap.nav .ggbrand,.gg-header-row .ggbrand{font-family:var(--font-bricolage,Bricolage Grotesque),sans-serif;font-size:21px;font-weight:800;color:#12261B;letter-spacing:-0.02em}.wrap.nav a.ggcta,.gg-header-row a.ggcta{display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;background:#12341F;color:#fff;font-size:14.5px;font-weight:700;line-height:1.2;text-decoration:none;border:0}.wrap.nav a.ggcta:hover,.gg-header-row a.ggcta:hover{background:#1B4A2C;color:#fff}.ggdd{position:relative;display:inline-flex}.ggdd-top{display:inline-flex;align-items:center;gap:4px}.ggdd-caret{font-size:11px;font-style:normal;opacity:.75}.ggdd-menu{position:absolute;left:0;top:100%;padding-top:10px;opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .15s,transform .15s,visibility .15s;z-index:60}.ggdd:hover .ggdd-menu,.ggdd:focus-within .ggdd-menu{opacity:1;visibility:visible;transform:none}.ggdd-card{min-width:232px;background:#fff;border:1px solid #E4EDE4;border-radius:16px;padding:8px;box-shadow:0 22px 44px -28px rgba(16,40,26,.55);display:flex;flex-direction:column;gap:2px}.ggdd-card a{padding:9px 12px;border-radius:10px;font-weight:600;font-size:14px;white-space:nowrap}.ggdd-card a:hover{background:#F1F8EE;color:#15281C}@media(max-width:900px){.ggnav .ggdd-menu{display:none}.ggnav{gap:12px}}";

/* Inner HTML for `.wrap.nav`. Both static page engines use that same container,
 * so one builder serves the goals pages and the resources pages alike. */
function ggNavHtml() { return GG_NAV_HTML; }
function ggFooterHtml() { return GG_FOOTER_HTML; }
function ggNavCss() { return GG_NAV_CSS; }

function ggNavStyles() {
  if (document.getElementById('gg-nav-style')) return;
  var el = document.createElement('style');
  el.id = 'gg-nav-style';
  el.textContent = GG_NAV_CSS;
  document.head.appendChild(el);
}

/* Replace whatever nav a page shipped with the standard one. Safe to call more
 * than once and safe to call before the page body exists — it no-ops rather
 * than throwing, so a page that renders its shell asynchronously can call it
 * again after rendering. */
function ggMountNav() {
  ggNavStyles();
  var bar = document.querySelector('.wrap.nav');
  if (bar && !bar.querySelector('.ggnav')) bar.innerHTML = GG_NAV_HTML;
  var footerLinks = document.querySelector('.footer span:last-child');
  if (footerLinks && !footerLinks.dataset.ggFooter) {
    footerLinks.dataset.ggFooter = '1';
    footerLinks.innerHTML = GG_FOOTER_HTML;
  }
}
