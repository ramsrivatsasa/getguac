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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // 'unsafe-eval' needed by some Next.js dev features; safe in prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // wss://*.supabase.co required for Supabase Realtime channels
      // (households realtime in HouseholdPanel.jsx). CSP treats wss: as
      // a distinct scheme from https:, so the wildcard https entry above
      // does not cover it — must be listed explicitly.
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.migadu.com https://dns.google",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  serverExternalPackages: ['tesseract.js', 'pdf-parse', 'imapflow', 'mailparser'],
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
}

// Wrap with Sentry's Next.js plugin. The wrapper is a no-op when
// NEXT_PUBLIC_SENTRY_DSN is absent (free-tier-friendly): no DSN means
// source-map upload is skipped and the Sentry SDK in the bundle stays
// uninitialized at runtime.
export default withSentryConfig(nextConfig, {
  // Pass --silent in CI to keep build logs quiet. Auth token only needed
  // for source-map upload; absent token = no upload, build still succeeds.
  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // We disable source-map upload entirely when there's no auth token, so
  // a missing token never breaks the Vercel build.
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
})
