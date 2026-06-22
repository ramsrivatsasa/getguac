// Shared chrome (sticky nav + footer) for the public marketing pages so they
// stay consistent and cross-linked. Server-safe (no 'use client').
import Link from 'next/link'
import HeaderSearch from './HeaderSearch'
import MarketingAuthButtons from './MarketingAuthButtons'
import MarketingMobileMenu from './MarketingMobileMenu'

const NAV = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/coupons', label: 'Coupons' },
  { href: '/resources', label: 'Resources' },
  { href: '/articles', label: 'Articles' },
  { href: '/plan', label: 'Calculators' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/security', label: 'Security' },
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

export default function MarketingShell({ subtitle, hideSearch = false, headerTitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-gray-800 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-emerald-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-5">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-md ring-2 ring-white flex items-center justify-center text-lg">🥑</div>
            <div className="leading-none hidden sm:block">
              <div className="text-base font-black tracking-tight text-emerald-900">GetGuac</div>
              {subtitle && <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">{subtitle}</div>}
            </div>
          </Link>
          {hideSearch
            ? (headerTitle
                ? <div className="flex-1 text-center font-black text-emerald-900 truncate px-2 text-sm sm:text-lg">{headerTitle}</div>
                : <div className="flex-1" />)
            : <HeaderSearch className="flex-1 min-w-0 max-w-xl" />}
          <nav className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
            {!headerTitle && NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hidden xl:inline font-semibold text-gray-600 hover:text-emerald-800">{n.label}</Link>
            ))}
            <MarketingAuthButtons />
            {!headerTitle && <MarketingMobileMenu nav={NAV} />}
          </nav>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-emerald-100 bg-white/60 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl">🥑</span>
                <span className="font-black text-emerald-900">GetGuac</span>
              </Link>
              <p className="text-sm text-gray-500 mt-3 max-w-xs">
                See where your money goes, catch hidden fees, and never miss a refund. Free.
              </p>
            </div>
            {FOOTER.map((col) => (
              <div key={col.heading}>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">{col.heading}</div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm text-gray-600 hover:text-emerald-800">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-emerald-100 mt-10 pt-6 text-xs text-gray-400 flex flex-wrap items-center justify-between gap-3">
            <span>© 2026 GetGuac. Your money, made clear.</span>
            <span>Free · No card required · Your data stays yours.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
