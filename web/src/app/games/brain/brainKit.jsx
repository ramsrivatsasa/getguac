'use client'

// Shared shell + scoring for the brain games.
//
// DELIBERATELY SELF-CONTAINED. It imports nothing from components/games/ —
// arcadeKit, GamePageShell and GamesHub are another agent's active workspace,
// and a shared import would mean this folder breaks whenever theirs changes
// mid-edit. The cost is a little duplicated layout; the benefit is that these
// routes are safe to build and ship independently.
//
// No canvas: every game here is text and buttons, so it stays keyboard
// operable and screen-readable, and it does not need the literal font families
// the canvas games load in games/layout.jsx.

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react'

// "correct / best" rather than points or streaks — see the house vocabulary rule.
export function useRun(total) {
  const [index, setIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState(null)   // null | {ok, choice}
  const [best, setBest] = useState(0)

  // A ref, not the answered state, guards the double tap. Putting setCorrect
  // inside a setAnswered updater made the updater impure, and React double-
  // invokes updaters in StrictMode — so every correct answer counted twice and
  // a 7-question run could report 10/7. Keep side effects out of updaters.
  const locked = useRef(false)

  const answer = useCallback((ok, choice) => {
    if (locked.current) return                     // ignore double taps
    locked.current = true
    setAnswered({ ok, choice })
    if (ok) setCorrect((c) => c + 1)
  }, [])

  const next = useCallback(() => {
    locked.current = false
    setAnswered(null)
    setIndex((i) => i + 1)
  }, [])

  const restart = useCallback(() => {
    locked.current = false
    setBest((b) => Math.max(b, correct))
    setIndex(0)
    setCorrect(0)
    setAnswered(null)
  }, [correct])

  return { index, correct, answered, best, done: index >= total, answer, next, restart }
}

export function GameShell({ eyebrow, title, blurb, children }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <Link
        href="/games/brain"
        className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-900"
      >
        <ArrowLeft size={16} /> Brain games
      </Link>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[.18em] text-lime-700">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-[#16331f] sm:text-4xl">{title}</h1>
      <p className="mt-3 text-[15px] leading-7 text-gray-600">{blurb}</p>
      {children}
    </main>
  )
}

export function Progress({ index, total, correct }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl bg-[#f5f8ed] px-4 py-3">
      <span className="text-sm font-bold text-[#31533a]">
        Round {Math.min(index + 1, total)} of {total}
      </span>
      <span className="text-sm font-bold text-[#31533a]">
        {correct} correct
      </span>
    </div>
  )
}

// One answer option. `state` is 'idle' | 'right' | 'wrong' | 'muted'.
export function Choice({ state = 'idle', onClick, disabled, children }) {
  const tone = {
    idle: 'border-emerald-950/10 bg-white hover:-translate-y-0.5 hover:border-lime-500 hover:shadow-md',
    right: 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/40',
    wrong: 'border-rose-400 bg-rose-50 ring-2 ring-rose-400/40',
    muted: 'border-emerald-950/10 bg-white opacity-55',
  }[state]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 disabled:cursor-default ${tone}`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1">{children}</span>
        {state === 'right' && <Check className="mt-0.5 shrink-0 text-emerald-700" size={18} />}
        {state === 'wrong' && <X className="mt-0.5 shrink-0 text-rose-600" size={18} />}
      </span>
    </button>
  )
}

export function Explain({ ok, children, onNext, last }) {
  return (
    <div
      role="status"
      className={`mt-5 rounded-2xl border p-5 ${ok ? 'border-emerald-600/25 bg-emerald-50/70' : 'border-rose-400/30 bg-rose-50/70'}`}
    >
      <p className="text-sm font-black text-[#173d27]">{ok ? 'That is the better call.' : 'Worth a second look.'}</p>
      <p className="mt-2 text-[15px] leading-7 text-[#31533a]">{children}</p>
      <button
        type="button"
        onClick={onNext}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#173d27] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#245334]"
      >
        {last ? 'See how you did' : 'Next round'}
      </button>
    </div>
  )
}

export function Summary({ correct, total, best, onRestart, takeaway }) {
  const pct = Math.round((correct / total) * 100)
  return (
    <div className="mt-8 rounded-3xl bg-[#173d27] p-7 text-white sm:p-9">
      <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#b8ef52]">Run complete</p>
      <p className="mt-3 text-4xl font-black">
        {correct} <span className="text-white/50">/ {total}</span>
      </p>
      <p className="mt-1 text-sm text-white/70">
        {pct}% this run{best > 0 ? ` · best so far ${best}/${total}` : ''}
      </p>
      <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/80">{takeaway}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-full bg-[#b8ef52] px-5 py-2.5 text-sm font-black text-[#173d27] transition hover:bg-lime-300"
        >
          <RotateCcw size={16} /> Play again
        </button>
        <Link
          href="/games/brain"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-black text-white/85 transition hover:bg-white/10"
        >
          Other brain games
        </Link>
      </div>
    </div>
  )
}
