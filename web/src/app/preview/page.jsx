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
import GuacMascot from '../../components/GuacMascot'
import GuacMascotAnimated from '../../components/GuacMascotAnimated'
import AnimatedEmoji from '../../components/AnimatedEmoji'
import LottieAnimation from '../../components/LottieAnimation'
import FlyingMascots from '../../components/FlyingMascots'
import blobLottie from '../../lottie/blob.json'
import ReceiptScanAnimation from '../../components/ReceiptScanAnimation'
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
  TrendingUp, Bell, CheckCircle2, AlertTriangle, RefreshCw, Square, ScanLine,
  RotateCw, FlipHorizontal, ArrowUp, Music,
} from 'lucide-react'

export default function PreviewPage() {
  const [log, setLog] = useState([])
  const fire = (name, fn) => { fn(); setLog((L) => [{ name, at: new Date().toLocaleTimeString() }, ...L].slice(0, 10)) }

  // Receipt-scan overlay state — when scanCount > 0 the full-screen
  // search animation (mascot + 🔍 loupe + scan line + rotating ticker)
  // mounts. The component self-hides when count drops back to 0.
  const [scanCount, setScanCount] = useState(0)
  // Unmount cleanup: if the user navigates away while the overlay is
  // up, the next visit shouldn't inherit a stuck count.
  useEffect(() => () => setScanCount(0), [])

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

        {/* ── LOTTIE (CHARACTER-QUALITY ANIMATIONS) ─────────────────── */}
        <Showcase
          title="Lottie character animations"
          sub="iconscout / lottiefiles style. Drop a .json file into web/src/lottie/, import it, render with <LottieAnimation data={file} />. Hot-link URLs also supported via the src prop."
          file="components/LottieAnimation.jsx + lottie/blob.json"
        >
          <div className="grid sm:grid-cols-3 gap-4">
            <LottieCard title="Bundled (in-repo)" sub="lottie/blob.json — pulsing emerald blob, hand-authored. Always works.">
              <LottieAnimation data={blobLottie} size={140} />
            </LottieCard>
            <LottieCard title="Hot-link slot A" sub="Drop a public lottiefiles.com URL here. Falls back to 🐱 if it fails.">
              <LottieAnimation src="https://lottie.host/41c4ec8a-3a44-4f72-8e3e-3a4d2c8ff2a1/kitten.json" size={140} fallback="🐱" />
            </LottieCard>
            <LottieCard title="Hot-link slot B" sub="Same — swap to whatever animation you like.">
              <LottieAnimation src="https://lottie.host/41c4ec8a-3a44-4f72-8e3e-3a4d2c8ff2a1/error-blob.json" size={140} fallback="🫠" />
            </LottieCard>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 leading-relaxed">
            <strong>Heads up:</strong> the two hot-link slots show emoji fallbacks until you paste real lottiefiles.com URLs.
            From <a href="https://iconscout.com/lottie-animations/kitten" target="_blank" rel="noopener noreferrer" className="underline font-bold">iconscout</a> or <a href="https://lottiefiles.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">lottiefiles.com</a>: click an animation → Download → JSON → drop into <code>web/src/lottie/</code> and reference via the <code>data</code> prop, OR copy the "Hosted lottie" URL and paste into the <code>src</code> prop of either card above.
          </div>
        </Showcase>

        {/* ── ANIMATED EMOJIS ────────────────────────────────────────── */}
        <Showcase
          title="Animated emojis"
          sub="8 named animations + tap-to-burst (8-dot radial confetti). Apply via <AnimatedEmoji char='🥑' anim='bob' />. Per-char random delay so a grid doesn't pulse in sync."
          file="components/AnimatedEmoji.jsx + globals.css @keyframes anim-emoji-*"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <EmojiTile char="🥑" anim="bob"       label="bob" />
            <EmojiTile char="💸" anim="spin"      label="spin" />
            <EmojiTile char="🛒" anim="jiggle"    label="jiggle" />
            <EmojiTile char="🧾" anim="drop"      label="drop" />
            <EmojiTile char="👋" anim="wave"      label="wave" />
            <EmojiTile char="❤️"  anim="heartBeat" label="heartBeat" />
            <EmojiTile char="🥳" anim="dance"     label="dance" />
            <EmojiTile char="🎉" anim="party"     label="party" />
          </div>
          <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3">Tap to react</p>
            <div className="flex gap-3 flex-wrap items-center">
              <AnimatedEmoji char="🥑" anim="bob"       size={56} tapBurst label="avocado" />
              <AnimatedEmoji char="💰" anim="heartBeat" size={56} tapBurst label="money bag" />
              <AnimatedEmoji char="🔥" anim="dance"     size={56} tapBurst label="fire" />
              <AnimatedEmoji char="⭐" anim="spin"      size={56} tapBurst label="star" />
              <AnimatedEmoji char="🎉" anim="party"     size={56} tapBurst label="party popper" />
              <AnimatedEmoji char="🚀" anim="bob"       size={56} tapBurst label="rocket" />
            </div>
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
              Each tap fires 8 burst dots radiating outward over 600ms. Cheap CSS-only — no canvas, no new deps.
            </p>
          </div>
        </Showcase>

        {/* ── SEARCH ANIMATION (the receipt-scan overlay) ──────────── */}
        <Showcase
          title="Search animation"
          sub="Full-screen overlay shown while a receipt is parsing. Avocado bobs, magnifying glass 🔍 swings, scan line sweeps the receipt SVG, ticker rotates through 5 status copy lines every 1.4s."
          file="components/ReceiptScanAnimation.jsx"
        >
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setScanCount(1)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-2"
            >
              <ScanLine size={15} /> Scan 1 receipt
            </button>
            <button
              onClick={() => setScanCount(3)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-700/90 text-white font-bold inline-flex items-center gap-2"
            >
              <ScanLine size={15} /> Scan 3 receipts (multi)
            </button>
            <button
              onClick={() => setScanCount(0)}
              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold inline-flex items-center gap-2"
            >
              <Square size={15} /> Close overlay
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Status: <strong>{scanCount === 0 ? 'hidden' : `showing (count = ${scanCount})`}</strong>. The overlay sits on top of the whole page (z-300), background dims with backdrop-blur. Self-closes — no spinner, just rotating ticker copy until you click Close.
          </p>
        </Showcase>

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
            <Trigger label="bounce"    sub="Receipt save · -24% lift"      icon={Zap}     color="emerald" onClick={() => fire('bounce',    () => mascotBus.bounce())} />
            <Trigger label="wiggle"    sub="Shopping List mark · ±8% sideways" icon={Heart}   color="rose"    onClick={() => fire('wiggle',    () => mascotBus.wiggle())} />
            <Trigger label="pulse"     sub="Heartbeat × 3 · with bob"      icon={Sparkles} color="amber"  onClick={() => fire('pulse',     () => mascotBus.pulse())} />
            <Trigger label="celebrate" sub="Worth-It · referral · 24-dot"  icon={Trophy}  color="violet"  onClick={() => fire('celebrate', () => mascotBus.celebrate('Rated!'))} />
            <Trigger label="spin"      sub="Full 360° · 1.5s"              icon={RotateCw} color="emerald" onClick={() => fire('spin',      () => mascotBus.spin())} />
            <Trigger label="flip"      sub="Y-axis 3D flip · 1.2s"         icon={FlipHorizontal} color="rose"    onClick={() => fire('flip',      () => mascotBus.flip())} />
            <Trigger label="jump"      sub="-40% arc with anticipation"   icon={ArrowUp}  color="amber"  onClick={() => fire('jump',      () => mascotBus.jump())} />
            <Trigger label="dance"     sub="Side-to-side groove · 2.4s"    icon={Music}    color="violet"  onClick={() => fire('dance',     () => mascotBus.dance())} />
          </div>
        </Showcase>

        {/* ── MASCOT POSES (the NEW mascot, every old expression) ────── */}
        <Showcase
          title="Mascot poses"
          sub="The NEW avocado character (face-up, white eyes, amber belly seed) re-posed for every old expression. Same <GuacMascot expression='…' /> API — all ~45 call sites across the app render these automatically."
          file="components/GuacMascot.jsx"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <PoseCard label="happy" sub="default cheerful">
              <GuacMascot expression="happy" size={120} />
            </PoseCard>
            <PoseCard label="sleepy" sub="closed eyes + Zzz">
              <GuacMascot expression="sleepy" size={120} />
            </PoseCard>
            <PoseCard label="surprised" sub="wide eyes + o">
              <GuacMascot expression="surprised" size={120} />
            </PoseCard>
            <PoseCard label="celebrating" sub="grin + arms + sparkles">
              <GuacMascot expression="celebrating" size={120} />
            </PoseCard>
            <PoseCard label="thumbsup" sub="arm + thumb">
              <GuacMascot expression="thumbsup" size={120} />
            </PoseCard>
            <PoseCard label="angel" sub="halo + wings">
              <GuacMascot expression="angel" size={120} />
            </PoseCard>
            <PoseCard label="sleeping" sub="lying down + Zzz">
              <GuacMascot expression="sleeping" size={120} />
            </PoseCard>
            <PoseCard label="sitting" sub="feet poking out">
              <GuacMascot expression="sitting" size={120} />
            </PoseCard>
            <PoseCard label="eating" sub="arm + fork">
              <GuacMascot expression="eating" size={120} />
            </PoseCard>
            <PoseCard label="relaxing" sub="shades + drink">
              <GuacMascot expression="relaxing" size={120} />
            </PoseCard>
            <PoseCard label="rich" sub="shades + cash">
              <GuacMascot expression="rich" size={120} />
            </PoseCard>
            <PoseCard label="standing" sub="2 arms + 2 legs">
              <GuacMascot expression="standing" size={120} />
            </PoseCard>
          </div>
        </Showcase>

        {/* ── ANIMATED ACTION MASCOTS ───────────────────────────────── */}
        <Showcase
          title="Animated action mascots"
          sub="Our hand-drawn avocado (GuacMascotAnimated, CSS keyframes) in three looping actions — wave, flex, maracas. Built from the GuacMascotAlt layout; arms are additive overlays. No deps."
          file="components/GuacMascotAnimated.jsx"
          action={
            <Link href="/preview/mascot-actions" className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">
              Open full page →
            </Link>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PoseCard label="wave" sub="bob + hand wave">
              <GuacMascotAnimated animation="wave" size={130} />
            </PoseCard>
            <PoseCard label="flex" sub="arms pump + bounce">
              <GuacMascotAnimated animation="flex" size={130} />
            </PoseCard>
            <PoseCard label="maracas" sub="shades + shake">
              <GuacMascotAnimated animation="maracas" size={130} />
            </PoseCard>
          </div>
        </Showcase>

        {/* ── FLYING MASCOTS ─────────────────────────────────────────── */}
        <Showcase
          title="Flying mascots"
          sub="Multiple avocados flying across a track at different speeds, heights, sizes, and angles. Composition of the locked GuacMascot — the character itself is unchanged."
          file="components/FlyingMascots.jsx"
        >
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-r from-sky-50/40 via-white to-emerald-50/40 overflow-hidden">
            <FlyingMascots count={8} height={180} direction="auto" bob={true} />
          </div>
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            8 mascots, mixed directions (4 left-to-right, 4 right-to-left). Each picks a deterministic-per-index variant of size, vertical position, speed, rotation, and mood. Bobs vertically on a sin wave during flight. <code>FlyingMascots count height direction loop bob</code>.
          </p>
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
          sub="Loading skeleton — replaces spinners on receipts / shopping list / inbox / connections / stash."
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
          <table className="gg-tbl w-full text-sm rounded-2xl overflow-hidden border border-gray-200 bg-white">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
              <tr><th className="text-left px-3 py-2">Primitive</th><th className="text-left px-3 py-2">Where it ships</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <Row p="Mascot events"  where="Receipt save, shopping list tap, Worth-It rate, referral apply, every 7-day Smash days milestone" />
              <Row p="CountUp"        where="GuacScore card, GuacMoney total, dashboard PaymentTile dollars, Bank-Bite hero, item-detail lifetime spend, GuacWizard score" />
              <Row p="FadeUpStagger"  where="Receipts list, Shopping List rows, Inbox messages, Stash grid, Activity feed, Predictions, Recent receipts on item detail" />
              <Row p="TapScale"       where="Receipt detail rating chips, hero action icons" />
              <Row p="ShimmerBox"     where="Receipts / Shopping List / Inbox / Connections / Stash / Rewards loading states" />
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

      {/* Receipt-scan overlay — full-screen, z-300, self-hides when
          scanCount drops to 0. Driven by the Search-animation showcase
          buttons + the showreel script. */}
      <ReceiptScanAnimation count={scanCount} />
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

function PoseCard({ label, sub, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50/40 via-white to-lime-50/40 p-4 flex flex-col items-center text-center">
      <div className="h-40 flex items-center justify-center">{children}</div>
      <code className="text-[11px] font-black text-emerald-700 mt-1">{label}</code>
      <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

function LottieCard({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center text-center">
      <div className="h-36 flex items-center justify-center">{children}</div>
      <p className="text-xs font-black text-gray-900 mt-2">{title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{sub}</p>
    </div>
  )
}

function EmojiTile({ char, anim, label }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center justify-center text-center">
      <div className="h-12 flex items-center justify-center">
        <AnimatedEmoji char={char} anim={anim} size={42} label={label} />
      </div>
      <code className="text-[11px] font-bold text-emerald-700 mt-1">{label}</code>
    </div>
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
