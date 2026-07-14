'use client'
// Shared plumbing for Guac Arcade games — sound synth, best-score persistence,
// score saving (+GuacMoney award line), and the overlay card every game uses
// for its start / pause / game-over states. Games keep their sims in refs and
// use React state only for HUD, matching the BubbleBudget pattern.
import { useCallback, useEffect, useRef, useState } from 'react'
import AdSlot from '../AdSlot'
import { usePremium } from '../../lib/usePremium'
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

// The GetGuac brand-mascot avocado, drawn on canvas at radius r (matches
// GuacMascot's palette). Shared so every game shows the SAME avocado instead
// of ad-hoc shapes/emoji. Whole-mascot draw (allowed by the mascot lock).
export function drawGuacAvocado(ctx, x, y, r, angle = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = '#6b4226'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(0, -r * 0.96); ctx.lineTo(r * 0.06, -r * 1.14); ctx.stroke()
  const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.32, r * 0.15, 0, 0, r * 1.15)
  bg.addColorStop(0, '#10b981'); bg.addColorStop(1, '#064e3b')
  ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.86, r, 0, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
  const fg = ctx.createRadialGradient(0, r * 0.12, r * 0.08, 0, r * 0.12, r * 0.74)
  fg.addColorStop(0, '#f6ed8a'); fg.addColorStop(0.42, '#e7ec8e'); fg.addColorStop(0.75, '#b4d35f'); fg.addColorStop(1, '#84cc16')
  ctx.beginPath(); ctx.ellipse(0, r * 0.16, r * 0.6, r * 0.72, 0, 0, Math.PI * 2); ctx.fillStyle = fg; ctx.fill()
  const pg = ctx.createRadialGradient(-r * 0.08, r * 0.2, r * 0.04, 0, r * 0.3, r * 0.36)
  pg.addColorStop(0, '#dca838'); pg.addColorStop(0.5, '#a8590a'); pg.addColorStop(1, '#54260c')
  ctx.beginPath(); ctx.arc(0, r * 0.32, r * 0.3, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill()
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * r * 0.24, -r * 0.24, r * 0.15, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(s * r * 0.24 + r * 0.02, -r * 0.22, r * 0.075, 0, Math.PI * 2); ctx.fill()
  }
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = Math.max(1.2, r * 0.08); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(0, -r * 0.02, r * 0.17, 0.16 * Math.PI, 0.84 * Math.PI); ctx.stroke()
  ctx.restore()
}

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

// ─── fullscreen ad breaks (AdSense Ad Placement API / H5 Games Ads) ─────────
// adBreak/adConfig are queue pushes on the same adsbygoogle array the display
// units use; Google decides whether a vignette actually shows, throttled by
// the data-ad-frequency-hint on the loader in layout.jsx. Never fires inside
// the app WebView (guac_embedded cookie — AdSense-in-app is a policy strike).
let adConfigSent = false
export function adBreak(opts) {
  try {
    if (document.cookie.split('; ').some((c) => c === 'guac_embedded=1')) return
    const q = (window.adsbygoogle = window.adsbygoogle || [])
    if (!adConfigSent) { q.push({ preloadAdBreaks: 'on', sound: 'on' }); adConfigSent = true }
    q.push(opts)
  } catch { /* blocked / not loaded */ }
}

// ─── overlay chrome ─────────────────────────────────────────────────────────
// Full-playfield veil + centered white card (start / pause / game-over).
// Every overlay mount is a natural gameplay break, so it requests a fullscreen
// ad break (type 'browse' — a menu is on screen, nothing to pause). Premium
// subscribers are ad-free; Google frequency-caps how often one really shows.
export function Overlay({ dark = false, maxWidth = 400, children }) {
  const premium = usePremium()
  useEffect(() => {
    if (!premium) adBreak({ type: 'browse', name: 'arcade_overlay' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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

// Full-width play-area panel (bubbleshooter-style) for games whose UI is
// intrinsically narrow (word grid, 2048 board, chess…). The panel spans the
// whole game column at the same height as the full-bleed canvas games, with
// the game centered inside — so every game page presents the same big play
// area. `inner` caps the game's own width.
export function GameFrame({ inner = 560, children }) {
  return (
    <div
      className="w-full select-none rounded-2xl grid place-items-center"
      style={{
        minHeight: 'clamp(470px, calc(100svh - 170px), 900px)',
        padding: '28px 16px',
        background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)',
        border: CARD_BORDER,
      }}
    >
      <div className="w-full" style={{ maxWidth: inner }}>{children}</div>
    </div>
  )
}
