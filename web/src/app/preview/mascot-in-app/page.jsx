'use client'
// /preview/mascot-in-app — mockups showing our recolored-mascot Lottie
// animations used in real app contexts (greeting, empty state,
// celebration, loading). Nothing here is wired into the live screens —
// it's a preview so we can pick placements. Direct URL only.

import Link from 'next/link'
import { ArrowLeft, Search, Sparkles } from 'lucide-react'
import LottieAnimation from '../../../components/LottieAnimation'
import ourMascotMaracas from '../../../lottie/our-mascot-maracas.json'

export default function MascotInAppPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/preview/mascot-actions" className="flex items-center gap-1.5 text-sm font-bold text-gray-700 hover:text-emerald-700">
            <ArrowLeft size={14} /> Mascot actions
          </Link>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mascot · in-app preview</p>
          <span className="w-12" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Our mascot, in context</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Mockups of where our recolored-mascot animations could live. These are previews only —
            say which you like and I'll wire it into the real screen.
          </p>
        </section>

        <div className="grid sm:grid-cols-2 gap-5">

          {/* 1 · Dashboard greeting */}
          <Mock title="Dashboard greeting" sub="Wave mascot at the top of the dashboard">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-5 flex items-center gap-4">
              <div className="shrink-0">
                <LottieAnimation data={ourMascotMaracas} size={92} label="greeting" />
              </div>
              <div>
                <p className="text-lg font-black leading-tight">Good morning, Ram 👋</p>
                <p className="text-sm text-emerald-50/90 mt-0.5">Have a nice day — you've smashed 4 lists this week.</p>
              </div>
            </div>
          </Mock>

          {/* 2 · Empty state */}
          <Mock title="Empty state" sub="No receipts yet">
            <div className="rounded-2xl bg-white border border-gray-200 p-6 flex flex-col items-center text-center">
              <LottieAnimation data={ourMascotMaracas} size={120} label="empty" />
              <p className="text-base font-black text-gray-900 mt-1">No receipts yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">Snap your first receipt and your mascot will start tracking your smashes.</p>
              <button className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Add a receipt</button>
            </div>
          </Mock>

          {/* 3 · Celebration */}
          <Mock title="Celebration" sub="Maracas mascot on a win">
            <div className="rounded-2xl bg-white border-2 border-emerald-200 p-6 flex flex-col items-center text-center shadow-sm">
              <LottieAnimation data={ourMascotMaracas} size={120} label="celebrate" />
              <p className="text-base font-black text-emerald-800 mt-1 inline-flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" /> Worth it!
              </p>
              <p className="text-xs text-gray-500 mt-1">You rated 5 items — that's a Smash day.</p>
            </div>
          </Mock>

          {/* 4 · Loading / search */}
          <Mock title="Loading / search" sub="While a receipt is parsing">
            <div className="rounded-2xl bg-white border border-gray-200 p-6 flex flex-col items-center text-center">
              <LottieAnimation data={ourMascotMaracas} size={104} label="loading" />
              <p className="text-sm font-black text-gray-900 mt-1 inline-flex items-center gap-1.5">
                <Search size={14} className="text-emerald-600" /> Scanning your receipt…
              </p>
              <div className="mt-3 h-1.5 w-40 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            </div>
          </Mock>

        </div>

        <p className="text-[11px] text-gray-400 text-center mt-2">
          Preview only · not wired into live screens · uses <code>lottie/our-mascot-maracas.json</code>
        </p>
      </main>
    </div>
  )
}

function Mock({ title, sub, children }) {
  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-sm font-black text-gray-900">{title}</h2>
        <p className="text-[11px] text-gray-500">{sub}</p>
      </div>
      {children}
    </div>
  )
}
