'use client'
// /preview/mascot-actions — focused showcase for the three animated
// "action" mascots (wave · flex · maracas), built from OUR avocado
// character (not the stock cartoons). Direct URL only — not linked
// from app navigation, safe to leave deployed.

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GuacMascotAnimated from '../../../components/GuacMascotAnimated'
import LottieAnimation from '../../../components/LottieAnimation'
import mexicanAvocado from '../../../lottie/mexican-avocado.json'
import ourMascotMaracas from '../../../lottie/our-mascot-maracas.json'

const ACTIONS = [
  { id: 'idle',    title: 'Idle (base)',     sub: 'The base mascot — no arms/props, soft breathe + occasional blink. The brand character at rest.' },
  { id: 'wave',    title: 'Have a nice day', sub: 'Gentle bob + a friendly hand wave. Greeting / empty-state / success copy.' },
  { id: 'flex',    title: 'Flex',            sub: 'Both arms pump, body bounces, squint grin. Streaks / milestones / “strong save”.' },
  { id: 'maracas', title: 'Maracas',         sub: '🔒 Final mascot — white eyes, amber seed, mitten fists, jump → grounded shake.' },
  { id: 'search',  title: 'Search',          sub: 'Holds a (long-armed) magnifying glass and scans. 404 / empty search / “looking…” states.' },
  { id: 'flip',    title: 'Flip (360°)',     sub: 'Base mascot does a full 360° 3D flip (coin-flip around the vertical axis), then holds. Transitions / Easter eggs.' },
]

export default function MascotActionsPage() {
  const [size, setSize] = useState(160)

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/preview" className="flex items-center gap-1.5 text-sm font-bold text-gray-700 hover:text-emerald-700">
            <ArrowLeft size={14} /> Preview
          </Link>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mascot · Actions</p>
          <span className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Animated mascots</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Three looping CSS animations of our own avocado — face up top, seed belly, brand greens.
            Pure CSS keyframes, no deps. Use via{' '}
            <code className="text-xs">{'<GuacMascotAnimated animation="wave" size={140} />'}</code>.
          </p>
        </section>

        {/* Size control */}
        <section className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Size</label>
          <input
            type="range" min={80} max={260} step={10}
            value={size} onChange={(e) => setSize(Number(e.target.value))}
            className="flex-1 accent-emerald-600"
          />
          <span className="text-sm font-mono tabular-nums text-gray-700 w-12 text-right">{size}px</span>
        </section>

        {/* ── COMPARE: original Lottie vs our-mascot Lottie (same rig) ─ */}
        <section>
          <h2 className="text-lg font-black text-gray-900">Compare · maracas (same animation rig)</h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Both are the <em>same</em> Lottie animation (one jump → maraca shake → eye blink → leaf wobble).
            Right is recolored to our mascot — emerald peel, our yellow-green flesh, amber seed, and
            hands the body color. Source: <code className="text-[11px]">our-mascot-maracas.json</code>.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 flex flex-col items-center">
              <div className="h-64 flex items-center justify-center">
                <LottieAnimation data={mexicanAvocado} size={200} label="original maracas avocado" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Original Lottie</span>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-emerald-50/40 via-white to-lime-50/40 p-5 flex flex-col items-center">
              <div className="h-64 flex items-center justify-center">
                <LottieAnimation data={ourMascotMaracas} size={200} label="our mascot maracas" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Our mascot · same rig</span>
            </div>
          </div>
        </section>

        {/* ── OUR MASCOT (hand-drawn SVG) — kept separate ───────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-black text-gray-900">Our mascot</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">SVG · on-brand</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {ACTIONS.map((a) => (
              <div
                key={a.id}
                className="rounded-3xl border border-gray-200 bg-gradient-to-br from-emerald-50/40 via-white to-lime-50/40 p-5 flex flex-col items-center text-center"
              >
                <div className="h-56 flex items-center justify-center">
                  <GuacMascotAnimated animation={a.id} size={size} />
                </div>
                <code className="text-sm font-black text-emerald-700 mt-1">{a.id}</code>
                <p className="text-xs font-bold text-gray-900 mt-1">{a.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{a.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── LOTTIE SOURCE (the real artwork) — separate ───────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-black text-gray-900">Lottie source · maracas</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">stock · exact</span>
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Kept fully separate from our mascot — the original artwork you provided, rendered straight from{' '}
            <code className="text-[11px]">lottie/mexican-avocado.json</code> via{' '}
            <code className="text-[11px]">{'<LottieAnimation data={…} />'}</code>. No redraw.
          </p>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 flex justify-center">
            <LottieAnimation data={mexicanAvocado} size={Math.round(size * 1.6)} label="maracas avocado" />
          </div>
        </section>

        <p className="text-[11px] text-gray-400 text-center mt-4">
          Direct URL only · our mascot respects <code>prefers-reduced-motion</code> (falls back to rest pose)
        </p>
      </main>
    </div>
  )
}
