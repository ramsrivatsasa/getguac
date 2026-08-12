'use client'

// First-run panel. Shows ONLY while the account has zero receipts, and hides
// itself forever the moment one exists.
//
// WHY: a brand-new account landed on eight tiles all reading $0 with no single
// obvious next action. Every number on this screen is derived from receipts, so
// before the first one there is nothing to read — just a grid of zeroes that
// looks like the product is broken rather than empty. Roughly two thirds of
// accounts never scanned anything, and this screen is where they decided.
//
// 🔒 The stat tiles below are deliberately untouched. This mounts ABOVE them,
// changes none of their styling, and disappears entirely once the first receipt
// lands — so the dashboard an established user sees is exactly what it was.
//
// One action, not a tour. The secondary route is here because forwarding an
// email receipt is genuinely easier for someone with no paper receipt to hand,
// not to give the screen a second button.

import Link from 'next/link'
import { Camera, Inbox, Sparkles } from 'lucide-react'

export default function FirstReceiptPanel({ firstName }) {
  // Opens the capture sheet that QuickAddReceipt already owns — see the
  // 'gg:add-receipt' listener there. Keeps camera/upload handling in one place.
  const openCapture = () => window.dispatchEvent(new Event('gg:add-receipt'))

  return (
    <section
      aria-labelledby="first-receipt-heading"
      className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-[#f7f3df] via-[#eef7e7] to-white p-6 shadow-sm sm:p-8"
    >
      <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-emerald-800">
        <Sparkles size={13} /> One step to set up
      </span>

      <h2
        id="first-receipt-heading"
        className="mt-4 text-2xl font-black leading-tight text-[#16331f] sm:text-3xl"
      >
        {firstName ? `${firstName}, add one receipt.` : 'Add one receipt.'}
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#3f5545]">
        Everything on this page is built from your receipts, so it stays empty until the
        first one arrives. Add any receipt you have — paper, a screenshot, or a PDF — and
        Guac-AI reads the store, date, total and every line item.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openCapture}
          className="inline-flex items-center gap-2 rounded-full bg-[#12341F] px-6 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-[#1B4A2C] focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300"
        >
          <Camera size={17} /> Add your first receipt
        </button>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-900/15 bg-white px-5 py-3.5 text-sm font-black text-[#31533a] transition hover:border-lime-500 hover:text-[#173d27]"
        >
          <Inbox size={16} /> Or forward an email receipt
        </Link>
      </div>

      <p className="mt-5 text-xs leading-6 text-[#5c7264]">
        No bank login, no card. This panel disappears as soon as your first receipt is saved.
      </p>
    </section>
  )
}
