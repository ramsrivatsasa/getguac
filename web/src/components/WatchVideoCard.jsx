'use client'
// Home "Watch how GetGuac works" section. Leads with the everyday-consumer
// benefits (save money, better deals, on-time refunds, plan your finances).
// "Play the tour" sends people to the /tour slideshow — the oversized inline
// video player was removed so the card stays compact on the home page.
import Link from 'next/link'
import { Sparkles, Play } from 'lucide-react'

// The benefits the everyday consumer actually wants — "take control" framing,
// in the language of impulse loops, the return-window tax, and zombie bills.
const BENEFITS = [
  { icon: '🧾', q: 'Track receipts & statements', d: 'Every purchase, fee, and charge, organized in one place.' },
  { icon: '🏷️', q: 'Get better deals', d: 'Steals finds a cheaper price on the things you rebuy.' },
  { icon: '↩️', q: 'Never miss a refund', d: 'Money back on price drops and returns, before deadlines pass.' },
  { icon: '🛒', q: 'Share a shopping list', d: 'Build one on the fly and send it to family in one tap.' },
  { icon: '✂️', q: 'Cut hidden subscriptions', d: 'Find and cancel the monthly bills you forgot about.' },
  { icon: '📊', q: 'See it all & plan ahead', d: 'GuacScore + GuacWizard guide every spending call.' },
]

const TAGS = [
  'Snap receipts', 'Read bank statements', 'GuacScore', 'Spending anomalies',
  'Bank bites', 'Kill subscriptions', 'Steals', 'Returns', 'GuacWizard',
]

// What the saved money is actually FOR — the life goals that make every penny matter.
const GOALS = [
  '🛡️ Recession-proof savings', '🏖️ Retirement', '🎓 Kids’ college & school',
  '🏥 Health expenses', '❤️ Give to charity', '💰 Every penny counts',
]

export default function WatchVideoCard() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-600 p-1 shadow-xl">
      <div className="rounded-[1.4rem] bg-white/5 backdrop-blur-sm p-6 sm:p-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
            <Sparkles size={11} /> Narrated product tour · ~1.5 min
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-3 leading-tight">
            Take control of your money.
          </h2>
          <p className="text-emerald-50/95 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            GetGuac reads your receipts and statements, finds you better prices and
            the refunds you’re owed, and shows you exactly where your money goes —
            in about a minute.
          </p>

          {/* The headline benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6 max-w-4xl mx-auto text-left">
            {BENEFITS.map((b) => (
              <div key={b.q} className="flex items-start gap-3 rounded-2xl bg-white/10 ring-1 ring-white/10 p-3.5">
                <span className="text-2xl leading-none flex-shrink-0" aria-hidden="true">{b.icon}</span>
                <div>
                  <div className="text-white font-bold text-sm sm:text-base">{b.q}</div>
                  <div className="text-emerald-50/80 text-xs sm:text-[13px] leading-snug mt-0.5">{b.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 max-w-3xl mx-auto">
            <p className="text-lime-200 font-bold text-sm sm:text-base">
              Every penny counts. Turn the money you save into what matters most:
            </p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {GOALS.map((g) => (
                <span key={g} className="px-3 py-1.5 rounded-full bg-emerald-900/40 ring-1 ring-lime-300/30 text-lime-50 text-xs sm:text-[13px] font-bold">
                  {g}
                </span>
              ))}
            </div>
          </div>

          {/* Play the tour → the /tour slideshow (no oversized inline video). */}
          <Link
            href="/tour"
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-lime-400 text-emerald-900 font-black text-lg px-7 py-3.5 shadow-lg hover:bg-lime-300 hover:scale-[1.03] transition-all"
          >
            <span className="w-9 h-9 rounded-full bg-emerald-900/90 text-lime-300 flex items-center justify-center">
              <Play size={18} className="ml-0.5" fill="currentColor" />
            </span>
            Play the tour
          </Link>

          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {TAGS.map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
