'use client'
// /preview — internal showcase of every animation primitive +
// mascot event. Visit /preview to see them all in one place.
// Direct URL only — not linked from navigation, safe to leave
// deployed.
//
// Order roughly matches frequency of use across the real screens:
// mascot events first (most visible), then count-up + stagger
// (most-applied), then the form/input feedback primitives.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AnimatedMascot from '../../components/AnimatedMascot'
import mascotBus from '../../lib/mascotEventBus'
import {
  CountUp,
  FadeUpStagger,
  TapScale,
  ShimmerBox,
  SlideUp,
  PulseRing,
  SuccessPop,
  ShakeOnError,
} from '../../components/animated'
import {
  Sparkles, Zap, Heart, Trophy, ArrowLeft,
  TrendingUp, Loader2, Bell, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react'

export default function PreviewPage() {
  const [log, setLog] = useState([])
  const fire = (name, fn) => { fn(); setLog((L) => [{ name, at: new Date().toLocaleTimeString() }, ...L].slice(0, 10)) }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-bold text-gray-700 hover:text-emerald-700">
            <ArrowLeft size={14} /> Back
          </Link>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Preview · Animations</p>
          <span className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── INTRO ──────────────────────────────────────────────────── */}
        <section>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Animation preview</h1>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Every primitive shipped in v0.3.40. Tap a button to fire the matching animation.
            Works on desktop and mobile browsers. Respects <code className="text-xs">prefers-reduced-motion</code>.
          </p>
        </section>

        {/* ── MASCOT EVENTS ──────────────────────────────────────────── */}
        <Showcase
          title="Mascot events"
          sub="bounce · wiggle · pulse · celebrate · idle breathe"
          file="components/AnimatedMascot.jsx"
        >
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-emerald-50/40 via-white to-lime-50/40 p-8 flex flex-col items-center">
            <AnimatedMascot expression="happy" size={120} idle={true} />
            <p className="text-xs text-gray-400 mt-3">Idle breathe loop (1.02× over 4s)</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <Trigger label="bounce"    sub="Receipt save"             icon={Zap}     color="emerald" onClick={() => fire('bounce',    () => mascotBus.bounce())} />
            <Trigger label="wiggle"    sub="Smashlist mark-as-bought" icon={Heart}   color="rose"    onClick={() => fire('wiggle',    () => mascotBus.wiggle())} />
            <Trigger label="pulse"     sub="Needs-attention CTA"      icon={Sparkles} color="amber"  onClick={() => fire('pulse',     () => mascotBus.pulse())} />
            <Trigger label="celebrate" sub="Worth-It rate · referral" icon={Trophy}  color="violet"  onClick={() => fire('celebrate', () => mascotBus.celebrate('Rated!'))} />
          </div>
        </Showcase>

        {/* ── COUNTUP ────────────────────────────────────────────────── */}
        <CountUpDemo />

        {/* ── FADE-UP STAGGER ────────────────────────────────────────── */}
        <FadeUpStaggerDemo />

        {/* ── TAP SCALE ──────────────────────────────────────────────── */}
        <Showcase
          title="TapScale"
          sub="Wraps a button so it scales 1 → 0.96 on press, eases back on release. Apple-style."
          file="components/animated/TapScale.jsx"
        >
          <div className="flex flex-wrap gap-3">
            {['Save', 'Smash it', 'Buy again', 'Snap'].map(label => (
              <TapScale key={label}>
                <button className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow">
                  {label}
                </button>
              </TapScale>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Press and hold — the button shrinks. Release — it eases back.</p>
        </Showcase>

        {/* ── SHIMMER BOX ────────────────────────────────────────────── */}
        <Showcase
          title="ShimmerBox"
          sub="Loading skeleton — replaces spinners on receipts / smashlist / inbox / connections / stash."
          file="components/animated/ShimmerBox.jsx"
        >
          <div className="space-y-2">
            <ShimmerBox className="h-6 w-1/3 rounded" />
            <ShimmerBox className="h-4 w-2/3 rounded" />
            <ShimmerBox className="h-4 w-1/2 rounded" />
            <div className="flex gap-3 mt-4">
              <ShimmerBox className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <ShimmerBox className="h-3 w-1/2 rounded" />
                <ShimmerBox className="h-3 w-3/4 rounded" />
              </div>
              <ShimmerBox className="h-8 w-16 rounded-full" />
            </div>
          </div>
        </Showcase>

        {/* ── SLIDE UP ───────────────────────────────────────────────── */}
        <SlideUpDemo />

        {/* ── PULSE RING ─────────────────────────────────────────────── */}
        <Showcase
          title="PulseRing"
          sub="Soft halo around a CTA. Used for 'needs attention' moments — unrated receipts, expiring rewards."
          file="components/animated/PulseRing.jsx"
        >
          <div className="flex flex-wrap gap-8 items-center">
            <PulseRing color="emerald">
              <button className="px-5 py-3 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center gap-2">
                <Bell size={16} /> Rate this receipt
              </button>
            </PulseRing>
            <PulseRing color="amber">
              <button className="px-5 py-3 rounded-full bg-amber-500 text-white font-bold inline-flex items-center gap-2">
                <AlertTriangle size={16} /> Expiring soon
              </button>
            </PulseRing>
            <PulseRing color="rose">
              <button className="px-5 py-3 rounded-full bg-rose-500 text-white font-bold inline-flex items-center gap-2">
                <RefreshCw size={16} /> Reconnect
              </button>
            </PulseRing>
          </div>
        </Showcase>

        {/* ── SUCCESS POP ────────────────────────────────────────────── */}
        <SuccessPopDemo />

        {/* ── SHAKE ON ERROR ─────────────────────────────────────────── */}
        <ShakeOnErrorDemo />

        {/* ── EVENT LOG ──────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Recent mascot events</h2>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {log.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">Fire an event to see it logged here</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {log.map((e, i) => (
                  <li key={i} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-800">{e.name}</span>
                    <span className="text-xs text-gray-400">{e.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Where each primitive shows up in the real app */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Live in the app</h2>
          <table className="w-full text-sm rounded-2xl overflow-hidden border border-gray-200 bg-white">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr><th className="text-left px-3 py-2">Primitive</th><th className="text-left px-3 py-2">Where it ships</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <Row p="Mascot events"  where="Receipt save, smashlist tap, Worth-It rate, referral apply, every 7-day Smash days milestone" />
              <Row p="CountUp"        where="GuacScore card, GuacMoney total, dashboard PaymentTile dollars, Bank-Bite hero, item-detail lifetime spend, GuacWizard score" />
              <Row p="FadeUpStagger"  where="Receipts list, Smashlist rows, Inbox messages, Stash grid, Activity feed, Predictions, Recent receipts on item detail" />
              <Row p="TapScale"       where="Receipt detail rating chips, hero action icons" />
              <Row p="ShimmerBox"     where="Receipts / Smashlist / Inbox / Connections / Stash / Rewards loading states" />
              <Row p="SlideUp"        where="Item-detail hero, reset-password done state, profile page entrance" />
              <Row p="PulseRing"      where="Reserved primitive — ready to wire" />
              <Row p="SuccessPop"     where="Invite-code copy button, receipt rating chips on selection" />
              <Row p="ShakeOnError"   where="Auth login + register on invalid credentials" />
            </tbody>
          </table>
        </section>

        <p className="text-[11px] text-gray-400 text-center mt-6">
          Direct URL only · not linked from navigation · ignores <code>prefers-reduced-motion</code> = static fallback
        </p>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Sub-demos                                                          */
/* ─────────────────────────────────────────────────────────────────── */

function CountUpDemo() {
  const [score, setScore] = useState(72)
  const [total, setTotal] = useState(284.17)
  return (
    <Showcase
      title="CountUp"
      sub="Tweens between previous value and new value. Bumps every time the prop changes."
      file="components/animated/CountUp.jsx"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">GuacScore</p>
          <p className="text-5xl font-black text-emerald-700 tabular-nums">
            <CountUp value={score} duration={600} from={0} />
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setScore(Math.max(0, Math.round(score - 12)))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">−12</button>
            <button onClick={() => setScore(Math.min(100, Math.round(score + 12)))} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">+12</button>
            <button onClick={() => setScore(Math.round(20 + Math.random() * 75))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">Random</button>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Lifetime spend</p>
          <p className="text-5xl font-black text-gray-900 tabular-nums">
            $<CountUp value={total} duration={650} decimals={2} />
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setTotal(+(total + 19.99).toFixed(2))} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">+$19.99</button>
            <button onClick={() => setTotal(+(total + 124.50).toFixed(2))} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">+$124.50</button>
            <button onClick={() => setTotal(0)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">Reset</button>
          </div>
        </div>
      </div>
    </Showcase>
  )
}

function FadeUpStaggerDemo() {
  const [seed, setSeed] = useState(0)
  const ITEMS = [
    { store: 'Costco',     amount: '$89.42', date: '2026-05-31' },
    { store: 'Trader Joe\'s', amount: '$42.18', date: '2026-05-30' },
    { store: 'Whole Foods', amount: '$67.05', date: '2026-05-29' },
    { store: 'Target',     amount: '$23.99', date: '2026-05-28' },
    { store: 'Walmart',    amount: '$54.31', date: '2026-05-27' },
    { store: 'CVS',        amount: '$12.04', date: '2026-05-26' },
  ]
  return (
    <Showcase
      title="FadeUpStagger"
      sub="List items fade up one at a time. 40ms stagger, capped at 12 items."
      file="components/animated/FadeUpStagger.jsx"
      action={
        <button onClick={() => setSeed(s => s + 1)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
          <RefreshCw size={12} /> Replay
        </button>
      }
    >
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <FadeUpStagger key={seed} className="divide-y divide-gray-100">
          {ITEMS.map((it, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-sm">{it.store}</p>
                <p className="text-xs text-gray-500">{it.date}</p>
              </div>
              <p className="font-mono text-sm tabular-nums">{it.amount}</p>
            </div>
          ))}
        </FadeUpStagger>
      </div>
    </Showcase>
  )
}

function SlideUpDemo() {
  const [seed, setSeed] = useState(0)
  return (
    <Showcase
      title="SlideUp"
      sub="Wraps a block so it slides up + fades in on mount. Used for hero blocks + modal sheets."
      file="components/animated/SlideUp.jsx"
      action={
        <button onClick={() => setSeed(s => s + 1)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
          <RefreshCw size={12} /> Replay
        </button>
      }
    >
      <SlideUp key={seed}>
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center"><TrendingUp size={22} /></div>
            <div>
              <p className="text-lg font-black text-gray-900">Worth-It receipt</p>
              <p className="text-xs text-gray-500">Slides up + fades in over 320ms</p>
            </div>
          </div>
          <p className="text-sm text-gray-700">Trader Joe's · $42.18 · 4.5★ avg item rating</p>
        </div>
      </SlideUp>
    </Showcase>
  )
}

function SuccessPopDemo() {
  const [trig, setTrig] = useState(0)
  return (
    <Showcase
      title="SuccessPop"
      sub="Checkmark + ring expansion. Used on Invite-code copy + Worth-It rating selection."
      file="components/animated/SuccessPop.jsx"
    >
      <div className="flex flex-wrap gap-3">
        {['emerald', 'amber', 'rose'].map(color => (
          <button
            key={color}
            onClick={() => setTrig(p => p + 1)}
            className={`relative inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-white ${
              color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
              color === 'amber'   ? 'bg-amber-500 hover:bg-amber-600' :
                                    'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            <CheckCircle2 size={16} /> {color}
            <SuccessPop trigger={trig} size={28} color={color} />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">Tap any button to fire the pop. All three trigger on the same counter.</p>
    </Showcase>
  )
}

function ShakeOnErrorDemo() {
  const [shake, setShake] = useState(0)
  return (
    <Showcase
      title="ShakeOnError"
      sub="Short horizontal shake when something fails. Auth pages use this on invalid creds."
      file="components/animated/ShakeOnError.jsx"
    >
      <ShakeOnError trigger={shake}>
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-rose-600" />
            <p className="font-bold text-rose-900">Wrong password</p>
          </div>
          <p className="text-sm text-rose-800/80">Try again — the form shakes once on every retry.</p>
        </div>
      </ShakeOnError>
      <button onClick={() => setShake(s => s + 1)} className="mt-3 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold">
        Trigger shake
      </button>
    </Showcase>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Layout helpers                                                     */
/* ─────────────────────────────────────────────────────────────────── */

function Showcase({ title, sub, file, action, children }) {
  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{sub}</p>
          {file && <code className="text-[10px] text-gray-400 mt-1 inline-block">web/src/{file}</code>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

const TONES = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
  rose:    'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100',
  amber:   'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
  violet:  'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100',
}

function Trigger({ label, sub, icon: Icon, color, onClick }) {
  return (
    <button onClick={onClick} className={`group rounded-2xl border-2 p-4 text-left transition-all active:scale-95 ${TONES[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} />
        <p className="font-black text-base">{label}</p>
      </div>
      <p className="text-xs opacity-75">{sub}</p>
    </button>
  )
}

function Row({ p, where }) {
  return (
    <tr>
      <td className="px-3 py-2 font-mono text-xs text-emerald-700 align-top">{p}</td>
      <td className="px-3 py-2 text-xs text-gray-700">{where}</td>
    </tr>
  )
}
