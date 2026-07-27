/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs'

// Security headers — applied to every response. The CSP is deliberately tight
// for app pages; we relax it only where third-party scripts are required
// (currently nowhere). HSTS preloading is enabled with a 1-year max-age which
// is the standard recommended by hstspreload.org.
//
// Connect-src includes Supabase + Migadu API for our own client-side fetches.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'X-XSS-Protection',          value: '0' },  // legacy header — modern browsers ignore; explicitly off
  // CSP — keeps the door narrow. Next.js inline scripts require 'unsafe-inline'
  // until we wire nonces; that's a known limitation of the App Router.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Google AdSense domains are allowed so <AdSlot/> works once
      // NEXT_PUBLIC_ADSENSE_CLIENT is set. Inert until the ad script loads.
      // challenges.cloudflare.com = Turnstile CAPTCHA (register + /turnstile-embed);
      // it needs BOTH script-src (api.js) and frame-src (the challenge iframe) —
      // without them CSP silently kills the widget and signups dead-end on a
      // permanently disabled submit button.
      // *.adtrafficquality.google = AdSense's invalid-traffic checks (sodar).
      // Google won't reliably serve ads while these are CSP-blocked, so it
      // must be in script-src + connect-src + frame-src per Google's CSP docs.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://adservice.google.com https://*.google.com https://*.adtrafficquality.google https://cdn.ampproject.org",   // 'unsafe-eval' needed by some Next.js dev features; safe in prod
      // cdn.ampproject.org = AMP ad host, observed blocked on a partner game
      // page. Those ads are the revenue share we get from embedded games, so a
      // block there is lost income. It's Google's AMP CDN and we already allow
      // the rest of their ad stack, so allowing it is consistent.
      // fonts.googleapis.com serves the arcade's Nunito + Outfit stylesheet
      // (app/games/layout.jsx), and fonts.gstatic.com serves the font files it
      // points at. Both were missing, so CSP silently blocked the stylesheet
      // and EVERY arcade page quietly fell back to default fonts — the games
      // draw their own text on <canvas> via ctx.font, which needs a real family
      // name, so this was breaking the arcade's typography site-wide.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // wss://*.supabase.co required for Supabase Realtime channels
      // (households realtime in HouseholdPanel.jsx). CSP treats wss: as
      // a distinct scheme from https:, so the wildcard https entry above
      // does not cover it — must be listed explicitly.
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.migadu.com https://dns.google https://pagead2.googlesyndication.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://*.google.com https://*.adtrafficquality.google",
      // Ad creatives render inside Google ad iframes; Turnstile renders its
      // challenge in a challenges.cloudflare.com iframe.
      // youtube-nocookie.com / youtube.com = the how-it-works video embed;
      // like Turnstile, a missing frame-src entry silently renders an empty box.
      // html5.gamemonetize.co = the embedded partner games (app/games/[slug]).
      // NOTE the .co — .com only serves their thumbnails. A missing frame-src
      // entry here renders a silent empty box, exactly like Turnstile and the
      // YouTube embed did. Hosts are mirrored from lib/gameProviders.js
      // (ALL_FRAME_HOSTS); this file loads before the app so it can't import
      // them — keep the two in sync when adding a provider.
      "frame-src 'self' https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://www.google.com https://www.youtube-nocookie.com https://www.youtube.com https://*.adtrafficquality.google https://html5.gamemonetize.co https://html5.gamemonetize.com https://html5.gamedistribution.com https://play.gamepix.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  // @sparticuz/chromium + puppeteer-core must stay external so webpack doesn't
  // mangle the brotli-packed Chromium binary; Next's file tracer then bundles
  // the binary into the serverless function. Required for the email-snapshot
  // route to render on Vercel.
  experimental: {
    // Tree-shake big barrel packages so a route only pulls the symbols it
    // actually uses (lucide-react is imported on nearly every page; the
    // sidebar alone references ~30 icons). Cuts dev compile time + bundle size.
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
    // Next 14.2 name (renamed to top-level `serverExternalPackages` in Next 15).
    // At top level it's silently ignored here, so it MUST live under experimental
    // — keeps webpack from mangling the brotli-packed Chromium binary.
    serverComponentsExternalPackages: ['tesseract.js', 'pdf-parse', 'imapflow', 'mailparser', '@sparticuz/chromium', 'puppeteer-core'],
    // Next's file tracer still drops @sparticuz/chromium's bin/ (the packed
    // Chromium) from the email-snapshot function — so executablePath() 500s with
    // "bin does not exist". Force the whole package into that function.
    outputFileTracingIncludes: {
      '/api/receipts/[id]/email-snapshot': ['./node_modules/@sparticuz/chromium/**'],
    },
  },
  // Build-time SHA baked into the client bundle. The UpdatePrompt
  // component compares this to the SHA returned by /api/build-info
  // and shows a "reload to update" banner when they diverge — so
  // users open the app and get nudged the moment a new Vercel
  // deploy lands. Falls back to 'dev' for local runs.
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
  // Branded webmail: anything hitting webmail.getguac.app is redirected to our
  // own inbox (getguac.app/inbox) — a full, on-brand mail client — instead of
  // Migadu's unbranded RoundCube. The Host condition means it only fires for
  // the webmail subdomain and never affects getguac.app itself. Requires the
  // subdomain to be assigned to this Vercel project (Settings → Domains).
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'webmail.getguac.app' }],
        destination: 'https://getguac.app/inbox',
        permanent: false,
      },
    ]
  },
}

// Wrap with Sentry's Next.js plugin. The wrapper is a no-op when
// NEXT_PUBLIC_SENTRY_DSN is absent (free-tier-friendly): no DSN means
// source-map upload is skipped and the Sentry SDK in the bundle stays
// uninitialized at runtime.
//
// Dev-speed: Sentry's webpack/instrumentation hooks add real overhead to
// `next dev` (and source-map upload only matters for production). So we only
// apply the wrapper for production builds — local `next dev` skips it entirely
// and compiles noticeably faster. Production output is unchanged.
export default process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, {
      // Pass --silent in CI to keep build logs quiet. Auth token only needed
      // for source-map upload; absent token = no upload, build still succeeds.
      silent: true,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // We disable source-map upload entirely when there's no auth token, so
      // a missing token never breaks the Vercel build.
      disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
      disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
    })
  : nextConfig
