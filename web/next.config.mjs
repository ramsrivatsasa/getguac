/** @type {import('next').NextConfig} */

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
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.migadu.com https://dns.google",
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

export default nextConfig
