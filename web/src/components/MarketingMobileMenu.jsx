'use client'
// Hamburger menu for the public marketing header. The inline nav links are
// `hidden xl:inline` (desktop only), so without this, phone/tablet/laptop
// visitors had NO way to reach Marketplace, Resources, Articles, Calculators,
// etc. except scrolling to the footer. Shown only below xl; mirrors the NAV
// array passed from MarketingShell.
import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function MarketingMobileMenu({ nav }) {
  const [open, setOpen] = useState(false)
  return (
    // lg:hidden (>=1024px) pairs with the max-width:1023px rule ggNavCss()
    // emits for .ggnav, so the desktop links and this hamburger are never both
    // on screen. It was xl:hidden, which double-rendered from 1024-1280px.
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-2 -mr-1 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <>
          {/* Backdrop below the sticky header — tap to close. */}
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-40 bg-black/20"
          />
          {/* Dropdown panel, full-width under the header. */}
          <div className="fixed left-0 right-0 top-16 z-50 bg-white border-b border-emerald-100 shadow-xl max-h-[72vh] overflow-y-auto">
            <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-2 grid grid-cols-2 gap-x-4">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="py-3 font-semibold text-gray-700 hover:text-emerald-800 border-b border-gray-100"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
