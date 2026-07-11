'use client'
// Shared plumbing for Guac Arcade games — sound synth, best-score persistence,
// score saving (+GuacMoney award line), and the overlay card every game uses
// for its start / pause / game-over states. Games keep their sims in refs and
// use React state only for HUD, matching the BubbleBudget pattern.
import { useCallback, useEffect, useRef, useState } from 'react'
import AdSlot from '../AdSlot'
import { saveGameScore } from '../../lib/gameScores'

export const INK = '#15281C'
export const BODY = '#3d4a42'
export const MUTED = '#5C6B60'
export const FAINT = '#8a978d'
export const GREEN = '#65A30D'
export const AMBER = '#D9A514'
export const ROSE = '#E11D48'
export const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
export const SOUND_KEY = 'gg-arcade-sound'

export const fmt = (n) => Math.round(n).toLocaleString()

// ─── sound: tiny WebAudio synth, context created on first gesture ──────────
// tone({f0, f1, t, type, g, at}) — same contract as BubbleBudget's synth.
export function useArcadeSound() {
  const audioRef = useRef({ ctx: null, muted: false })
  const [muted, setMuted] = useState(false)
  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === 'off') {
        audioRef.current.muted = true
        setMuted(true)
      }
    } catch {}
  }, [])
  useEffect(() => () => { try { audioRef.current.ctx?.close() } catch {} }, [])
  const tone = useCallback(({ f0, f1, t = 0.1, type = 'sine', g = 0.16, at = 0 }) => {
    const a = audioRef.current
    if (a.muted) return
    try {
      if (!a.ctx) a.ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (a.ctx.state === 'suspended') a.ctx.resume()
      const now = a.ctx.currentTime + at
      const osc = a.ctx.createOscillator()
      const gain = a.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(f0, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1 ?? f0), now + t)
      gain.gain.setValueAtTime(g, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t)
      osc.connect(gain).connect(a.ctx.destination)
      osc.start(now); osc.stop(now + t + 0.02)
    } catch {}
  }, [])
  const toggleMute = useCallback(() => {
    const m = !audioRef.current.muted
    audioRef.current.muted = m
    setMuted(m)
    try { localStorage.setItem(SOUND_KEY, m ? 'off' : 'on') } catch {}
  }, [])
  return { tone, muted, toggleMute }
}

// ─── best score in localStorage ─────────────────────────────────────────────
export function useBestScore(storageKey) {
  const bestRef = useRef(0)
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  useEffect(() => {
    try {
      const b = parseInt(localStorage.getItem(storageKey), 10)
      if (Number.isFinite(b) && b > 0) { bestRef.current = b; setBest(b) }
    } catch {}
  }, [storageKey])
  const submit = useCallback((score) => {
    if (score > bestRef.current) {
      bestRef.current = score
      setBest(score)
      setNewBest(true)
      try { localStorage.setItem(storageKey, String(score)) } catch {}
      return true
    }
    setNewBest(false)
    return false
  }, [storageKey])
  return { best, newBest, submit }
}

// ─── account score save + GuacMoney award ──────────────────────────────────
export function useScoreSaver(game) {
  const [saveRes, setSaveRes] = useState(null)
  const save = useCallback((score, level = null) => {
    setSaveRes(null)
    saveGameScore(game, score, level).then(setSaveRes)
  }, [game])
  const reset = useCallback(() => setSaveRes(null), [])
  return { saveRes, save, resetSave: reset }
}

// Rendered inside the game-over card: GuacMoney earned + saved + sign-in nudge.
export function SaveScoreLine({ res }) {
  if (!res) return null
  return (
    <>
      {res.gm > 0 && (
        <div className="text-xs font-bold mt-2 inline-block px-3 py-1 rounded-full" style={{ background: '#f2fbf3', color: '#065f46' }}>
          🥑 +{res.gm} GuacMoney — first game today
        </div>
      )}
      {res.saved && res.gm === 0 && (
        <div className="text-xs font-bold mt-2" style={{ color: GREEN }}>✓ Score saved to your account</div>
      )}
      {res.signedIn === false && (
        <div className="text-xs mt-2" style={{ color: MUTED }}>
          <a href="/login" className="font-bold" style={{ color: '#065f46' }}>Sign in</a> to earn GuacMoney for playing and keep your scores.
        </div>
      )}
    </>
  )
}

// ─── overlay chrome ─────────────────────────────────────────────────────────
// Full-playfield veil + centered white card (start / pause / game-over).
export function Overlay({ dark = false, maxWidth = 400, children }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-4"
      style={{ background: dark ? 'rgba(8,18,14,0.78)' : 'rgba(242,251,243,0.9)' }}
    >
      <div className="rounded-2xl bg-white p-5 text-center w-full max-h-full overflow-y-auto" style={{ border: CARD_BORDER, maxWidth }}>
        {children}
      </div>
    </div>
  )
}

// The in-card ad every start/game-over overlay carries (MSN-portal style).
export function OverlayAd() {
  return <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INGRID || '1890940391'} minHeight={250} className="mt-4" />
}

export function PrimaryButton({ onClick, children, className = '' }) {
  return (
    <button onClick={onClick} className={`text-sm font-bold px-6 py-2.5 rounded-full text-white ${className}`} style={{ background: GREEN }}>
      {children}
    </button>
  )
}

export function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
      {children}
    </button>
  )
}

// HUD pill button (mute / pause) — sits on top of the canvas.
export function HudButton({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label} className="text-xs font-bold px-2.5 py-1.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
      {children}
    </button>
  )
}
