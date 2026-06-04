'use client'
// /preview — internal showcase page for animations, mascot events, and
// new feature surfaces. Visit /preview to see them all in one place
// before they're applied across every screen. Updated as the big
// animation system workflow lands.
//
// This page is NOT linked from anywhere — direct URL only. Safe to
// leave deployed; nothing leaks sensitive data.

import { useState } from 'react'
import Link from 'next/link'
import AnimatedMascot from '../../components/AnimatedMascot'
import mascotBus from '../../lib/mascotEventBus'
import { Sparkles, Zap, Heart, Trophy, ArrowLeft } from 'lucide-react'

export default function PreviewPage() {
  const [log, setLog] = useState([])

  function fire(name, fn) {
    fn()
    setLog((L) => [{ name, at: new Date().toLocaleTimeString() }, ...L].slice(0, 10))
  }

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Animation preview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tap each button to fire the matching mascot event. The mascot in the top-left of every dashboard screen reacts in real time.
          </p>
        </div>

        {/* The mascot itself, big, so you can see what each event does. */}
        <section className="rounded-3xl border border-gray-200 bg-gradient-to-br from-emerald-50/40 via-white to-lime-50/40 p-8 mb-8 flex flex-col items-center">
          <AnimatedMascot expression="happy" size={120} idle={true} />
          <p className="text-xs text-gray-400 mt-3">Idle breathe loop (1.02× over 4s)</p>
        </section>

        {/* Event triggers */}
        <section className="grid sm:grid-cols-2 gap-3 mb-8">
          <Trigger
            label="bounce"
            sub="Receipt save · retailer linked"
            icon={Zap}
            color="emerald"
            onClick={() => fire('bounce', () => mascotBus.bounce())}
          />
          <Trigger
            label="wiggle"
            sub="Smashlist mark-as-bought"
            icon={Heart}
            color="rose"
            onClick={() => fire('wiggle', () => mascotBus.wiggle())}
          />
          <Trigger
            label="pulse"
            sub="Needs-attention CTA"
            icon={Sparkles}
            color="amber"
            onClick={() => fire('pulse', () => mascotBus.pulse())}
          />
          <Trigger
            label="celebrate"
            sub="Worth-It rate · referral · milestones"
            icon={Trophy}
            color="violet"
            onClick={() => fire('celebrate', () => mascotBus.celebrate('Rated!'))}
          />
        </section>

        {/* Event log */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Recent events</h2>
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

        {/* What's wired today */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Currently wired</h2>
          <ul className="rounded-2xl border border-gray-200 bg-white p-4 text-sm space-y-1.5 text-gray-700">
            <li>• <strong>bounce</strong> — fires on successful receipt save and when a retailer is marked active in Connections</li>
            <li>• <strong>wiggle</strong> — fires when you mark a Smashlist item as bought</li>
            <li>• <strong>celebrate</strong> — fires on Worth-It rating, when a referral is applied, and at every 7-day Smash-days milestone</li>
            <li>• <strong>pulse</strong> — not yet wired to a real event (reserved for future "needs attention" CTAs)</li>
            <li>• <strong>idle breathe</strong> — runs continuously on the Profile page mascot</li>
          </ul>
        </section>

        {/* Coming */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Coming in the next push</h2>
          <ul className="rounded-2xl border border-gray-200 bg-white p-4 text-sm space-y-1.5 text-gray-700">
            <li>• <strong>FadeUpStagger</strong> — list items fade in one at a time across receipts / smashlist / inbox / item-detail</li>
            <li>• <strong>CountUp</strong> — GuacScore, totals, Smash days animate from old to new</li>
            <li>• <strong>TapScale</strong> — every button reacts with a subtle scale-down on press</li>
            <li>• <strong>ShimmerBox</strong> — loading skeletons replace spinners</li>
            <li>• <strong>SlideUp</strong> — modals and sheets slide in from the bottom</li>
            <li>• <strong>SuccessPop / ShakeOnError</strong> — success and error confirmation animations</li>
            <li>• Plus parallel Guac-AI extensions: voice-to-receipt, screenshot/PDF parsing, smart auto-categorization, anomaly narratives, item tagging</li>
          </ul>
        </section>

        <p className="text-[11px] text-gray-400 text-center mt-12">
          This page is internal. Direct URL only — not linked from navigation.
        </p>
      </main>
    </div>
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
    <button
      onClick={onClick}
      className={`group rounded-2xl border-2 p-4 text-left transition-all active:scale-95 ${TONES[color]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} />
        <p className="font-black text-base">{label}</p>
      </div>
      <p className="text-xs opacity-75">{sub}</p>
    </button>
  )
}
