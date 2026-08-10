// Shared new-design footer. Server-safe (no 'use client'). Used by
// MarketingShell AND dropped onto the custom-layout marketing pages
// (home, security, download, privacy, terms, how-it-works, etc.) so every
// public page ends with the same footer. Fonts come from the CSS variables
// defined in app/layout.jsx (global on <html>), so this works even on pages
// that don't carry the .gg-marketing wrapper.
import Link from 'next/link'

const DISPLAY = { fontFamily: 'var(--font-bricolage), sans-serif' }

// Our Facebook Page. Kept here (not in an env var) so it ships with the build
// like every other footer link.
const FACEBOOK_URL = 'https://www.facebook.com/GetGuacApp'

const COLS = [
  { heading: 'Product', links: [
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/coupons', label: 'Coupons' },
    { href: '/games', label: 'Games' },
    { href: '/features', label: 'Features' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/tour', label: 'Watch the tour' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/download', label: 'Download apps' },
  ]},
  { heading: 'Learn', links: [
    { href: '/learn', label: 'Learn' },
    { href: '/articles', label: 'Articles' },
    { href: '/calculators', label: 'Calculators' },
    { href: '/faq', label: 'FAQ' },
    { href: '/how-email-works', label: 'How email works' },
    { href: '/security', label: 'Security & privacy' },
    { href: '/about', label: 'About' },
  ]},
  { heading: 'Company', links: [
    { href: '/contact', label: 'Contact' },
    { href: '/editorial-policy', label: 'Editorial policy' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ]},
]

export default function MarketingFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(20,83,45,0.10)', background: '#FBFCF8', fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 28px 24px' }}>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 40 }}>
          <div className="col-span-2 md:col-span-1">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🥑</span>
              <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 20, color: '#15281C', letterSpacing: '-0.02em' }}>GetGuac</span>
            </Link>
            <p style={{ fontSize: 14, color: '#7A897F', margin: 0, maxWidth: 240, lineHeight: 1.55 }}>
              Your money&apos;s wingman. Reads your receipts, scores every dollar, keeps your guac.
            </p>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GetGuac on Facebook"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 14, fontWeight: 600, color: '#5C6B60', textDecoration: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.956.93-1.956 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
              </svg>
              Follow on Facebook
            </a>
          </div>
          {COLS.map((col) => (
            <div key={col.heading}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#15281C', marginBottom: 14 }}>{col.heading}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map((l) => (
                  <li key={l.href}><Link href={l.href} style={{ fontSize: 14, color: '#5C6B60', textDecoration: 'none' }}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(20,83,45,0.08)', marginTop: 36, paddingTop: 22, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#9AA89E' }}>© 2026 GetGuac — your money&apos;s wingman.</span>
          <span style={{ fontSize: 13, color: '#9AA89E' }}>Free · No card required · Your data stays yours.</span>
        </div>
      </div>
    </footer>
  )
}
