'use client'
// Shared plumbing for Guac Arcade games — sound synth, best-score persistence,
// score saving (+GuacMoney award line), and the overlay card every game uses
// for its start / pause / game-over states. Games keep their sims in refs and
// use React state only for HUD, matching the BubbleBudget pattern.
import { useCallback, useEffect, useRef, useState } from 'react'
import AdSlot from '../AdSlot'
import { ARCADE_ADS_ENABLED } from '../../lib/arcadeAds'
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

// Guac Arcade type stacks — the arcade design mockups use Nunito for
// numbers/scores/headings and Outfit for body/labels/hints. Loaded under their
// literal family names by app/games/layout.jsx so canvas ctx.font resolves them
// (site keeps Bricolage/Jakarta elsewhere). Brand fonts stay as fallbacks.
export const DISPLAY_FONT = "'Nunito', 'Bricolage Grotesque', ui-sans-serif, sans-serif"
export const BODY_FONT = "'Outfit', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"

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

// Wooden cutting-board backdrop for the arcade — painted once to an offscreen
// canvas and cached by the caller (regenerate only on resize). Shared so every
// game gets the same warm board instead of a dark field.
export function makeWoodCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w); c.height = Math.max(1, h)
  const x = c.getContext('2d')
  const base = x.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#ca9c5c'); base.addColorStop(0.5, '#b9853f'); base.addColorStop(1, '#a1702e')
  x.fillStyle = base; x.fillRect(0, 0, w, h)
  const planks = Math.max(4, Math.round(h / 150))
  const ph = h / planks
  for (let i = 0; i < planks; i++) {
    const py = i * ph
    const t = 0.9 + ((i * 37) % 20) / 100
    x.fillStyle = `rgba(${Math.round(150 * t)},${Math.round(110 * t)},${Math.round(60 * t)},0.26)`
    x.fillRect(0, py, w, ph)
    x.strokeStyle = 'rgba(80,48,18,0.14)'; x.lineWidth = 1
    for (let g = 0; g < 16; g++) {
      const gy = py + 6 + ((g * 53) % Math.max(1, ph - 12))
      x.beginPath(); x.moveTo(0, gy)
      for (let gx = 0; gx <= w; gx += 36) x.lineTo(gx, gy + Math.sin(gx * 0.02 + i + g) * 2.2)
      x.stroke()
    }
    for (let k = 0; k < 2; k++) {
      const kx = ((i * 311 + k * 907) % Math.max(1, w - 80)) + 40
      const ky = py + ph * (0.32 + 0.36 * ((k * 7) % 10) / 10)
      for (let ring = 3; ring >= 1; ring--) {
        x.strokeStyle = `rgba(70,40,14,${0.1 * ring})`; x.lineWidth = 1.4
        x.beginPath(); x.ellipse(kx, ky, 5 * ring, 3.4 * ring, 0.3, 0, Math.PI * 2); x.stroke()
      }
    }
    x.strokeStyle = 'rgba(45,26,10,0.55)'; x.lineWidth = 3
    x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke()
    x.strokeStyle = 'rgba(255,238,200,0.16)'; x.lineWidth = 1.5
    x.beginPath(); x.moveTo(0, py + 2.5); x.lineTo(w, py + 2.5); x.stroke()
  }
  const vg = x.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.2, w / 2, h * 0.5, Math.max(w, h) * 0.72)
  vg.addColorStop(0, 'rgba(255,240,205,0.12)'); vg.addColorStop(0.6, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,22,6,0.30)')
  x.fillStyle = vg; x.fillRect(0, 0, w, h)
  return c
}
// The CSS wood gradient (DOM containers / letterbox fallback behind the canvas).
export const WOOD_BG = 'linear-gradient(180deg, #c69152 0%, #a9743a 100%)'

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
        <div className="text-xs font-bold mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: '#f2fbf3', color: '#065f46' }}>
          <AvocadoPip size={14} /> +{res.gm} GuacMoney — first game today
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
    if (!premium && ARCADE_ADS_ENABLED) adBreak({ type: 'browse', name: 'arcade_overlay' })
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
// Off while we're chasing AdSense approval — see lib/arcadeAds.
export function OverlayAd() {
  if (!ARCADE_ADS_ENABLED) return null
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
      }}
    >
      <div className="w-full" style={{ maxWidth: inner }}>{children}</div>
    </div>
  )
}

// ─── shared play surfaces ───────────────────────────────────────────────────
// One place decides what each game field looks like, so the arcade stops
// drifting (lavender here, navy there). `field` = dark guac for action games,
// `felt` = card table, `paper` = light puzzle, `sky` = outdoor / racing.
export const SURFACES = {
  field: 'radial-gradient(120% 100% at 50% 0%, #0b3d20 0%, #052e16 100%)',
  felt: 'radial-gradient(ellipse at 50% 30%, #15803d, #14532d)',
  paper: 'linear-gradient(180deg, #f6f8f4 0%, #eef3ec 100%)',
  sky: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 100%)',
}
export const surfaceBg = (name) => SURFACES[name] || SURFACES.field
// Dark surfaces want light HUD text; light ones (paper, sky) want ink text.
export const isDarkSurface = (name) => name === 'field' || name === 'felt'

// Small brand-avocado pip for HUD lives — a plain avocado fruit icon (NOT the
// locked mascot character: no face), so lives read as real avocados instead of
// the 🥑 emoji, which also renders blank in the app's Flutter WebView.
export function AvocadoPip({ size = 18, filled = true }) {
  // The GetGuac 🥑 logo emoji — same avocado we already use as the brand mark.
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: size, lineHeight: 1, display: 'inline-block', verticalAlign: 'middle',
        opacity: filled ? 1 : 0.32, filter: filled ? 'none' : 'grayscale(1)',
      }}
    >🥑</span>
  )
}

// ─── unified in-game HUD (Guac Arcade design system) ────────────────────────
// Overlays the play field: score pill top-left, status/combo top-center,
// lives + mute + pause top-right, hint bar bottom. Container is click-through
// (pointer-events:none) so canvas drag/slice input still lands; only the
// buttons capture clicks. Pass `dark` for dark fields (light pills) — the
// default — or `dark={false}` for paper/felt-light fields (ink pills).
export function ArcadeHud({
  score, scoreLabel = 'SCORE', scorePrefix = '', best,
  status, statusTone = 'neutral',
  lives, livesMax = 3, livesIcon = '🥑',
  hint, dark = true,
  onPause, muted, onMute, children,
}) {
  const pillBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(21,40,28,0.06)'
  const scoreColor = dark ? '#bbf7d0' : GREEN
  const labelColor = dark ? '#86a893' : MUTED
  const btnColor = dark ? '#ffffff' : INK
  const toneBg = statusTone === 'gold' ? AMBER : statusTone === 'danger' ? ROSE : pillBg
  const toneColor = statusTone === 'neutral' ? (dark ? '#e6f4ea' : INK) : '#052e16'
  const num = { fontFamily: DISPLAY_FONT, fontWeight: 800 }
  const scoreNum = { fontFamily: DISPLAY_FONT, fontWeight: 900 }  // mockup scores are Nunito 900
  const lbl = { fontFamily: BODY_FONT, fontWeight: 800, letterSpacing: '0.1em' }
  const btn = {
    pointerEvents: 'auto', border: 'none', cursor: 'pointer',
    background: pillBg, color: btnColor, fontSize: 18, lineHeight: 1,
    width: 40, height: 40, borderRadius: 999, display: 'grid', placeItems: 'center',
  }
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3" style={{ pointerEvents: 'none' }}>
      <div className="flex items-start justify-between gap-2">
        {/* score */}
        <div style={{ background: pillBg, borderRadius: 999, padding: '7px 16px' }}>
          <div style={{ ...lbl, color: labelColor, fontSize: 10 }}>{scoreLabel}</div>
          <div style={{ ...scoreNum, color: scoreColor, fontSize: 22, lineHeight: 1 }}>{scorePrefix}{typeof score === 'number' ? score.toLocaleString() : score}</div>
          {best != null && <div style={{ fontFamily: BODY_FONT, color: labelColor, fontSize: 11, fontWeight: 700, marginTop: 2 }}>BEST {scorePrefix}{typeof best === 'number' ? best.toLocaleString() : best}</div>}
        </div>
        {/* status / combo */}
        {status != null && (
          <div style={{ background: toneBg, color: toneColor, borderRadius: 999, padding: '8px 16px', ...num, fontSize: 15, alignSelf: 'flex-start' }}>{status}</div>
        )}
        {/* lives + controls */}
        <div className="flex items-center gap-2" style={{ alignSelf: 'flex-start' }}>
          {lives != null && (
            <div aria-label={`${lives} lives left`} className="flex items-center" style={{ fontSize: 18, gap: livesIcon === '🥑' || livesIcon === 'avocado' ? 3 : 1 }}>
              {Array.from({ length: livesMax }).map((_, i) => (
                livesIcon === '🥑' || livesIcon === 'avocado'
                  ? <AvocadoPip key={i} size={18} filled={i < lives} />
                  : <span key={i} style={{ opacity: i < lives ? 1 : 0.2, filter: i < lives ? 'none' : 'grayscale(1)' }}>{livesIcon}</span>
              ))}
            </div>
          )}
          {onMute && <button onClick={onMute} aria-label={muted ? 'Unmute' : 'Mute'} style={btn}>{muted ? '🔇' : '🔊'}</button>}
          {onPause && <button onClick={onPause} aria-label="Pause" style={btn}>⏸</button>}
        </div>
      </div>
      {children}
      {hint && (
        <div className="mx-auto" style={{ fontFamily: BODY_FONT, background: dark ? 'rgba(0,0,0,0.35)' : 'rgba(21,40,28,0.06)', color: dark ? 'rgba(255,255,255,0.8)' : MUTED, fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 999, maxWidth: '92%', textAlign: 'center' }}>{hint}</div>
      )}
    </div>
  )
}

// ─── canvas "juice" kit ─────────────────────────────────────────────────────
// Drop-in feedback for games that don't already have it. Each keeps a plain
// array on the sim; call spawn* on events, update* every frame with dt
// (seconds), draw* after the scene. Shapes match the ad-hoc floats already used
// in SplurgeSlicer / ExpenseInvaders so retrofits stay consistent.
export function spawnBurst(list, x, y, opts = {}) {
  const { count = 10, color = AMBER, speed = 170, life = 0.5, size = 3.5, gravity = 480, spread = Math.PI * 2, dir = -Math.PI / 2 } = opts
  for (let i = 0; i < count; i++) {
    const a = dir + (Math.random() - 0.5) * spread
    const sp = speed * (0.35 + Math.random() * 0.9)
    list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, age: 0, size: size * (0.6 + Math.random() * 0.8), color, gravity })
  }
}
export function updateBurst(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    p.age += dt
    if (p.age >= p.life) { list.splice(i, 1); continue }
    p.vy += (p.gravity || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt
  }
}
export function drawBurst(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life)
    ctx.fillStyle = p.color
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}
export function spawnFloater(list, x, y, text, opts = {}) {
  const { color = GREEN, size = 18, life = 0.85, vy = -46, banner = false } = opts
  list.push({ x, y, text, color, size, life, age: 0, vy, banner })
}
export function updateFloaters(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i]
    f.age += dt; f.y += f.vy * dt
    if (f.age >= f.life) list.splice(i, 1)
  }
}
export function drawFloaters(ctx, list, font = DISPLAY_FONT) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (const f of list) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life)
    ctx.font = `800 ${f.size}px ${font}`
    if (f.banner) {
      const tw = ctx.measureText(f.text).width
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(f.x - tw / 2 - 14, f.y - 18, tw + 28, 34, 17)
      else ctx.rect(f.x - tw / 2 - 14, f.y - 18, tw + 28, 34)
      ctx.fill()
    }
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, f.y)
  }
  ctx.globalAlpha = 1
}
// Screen shake: kick() on impact, wrap the scene in ctx.translate(shake.x,y).
export function makeShake() { return { x: 0, y: 0, mag: 0 } }
export function kick(shake, mag) { shake.mag = Math.max(shake.mag, mag) }
export function stepShake(shake, dt) {
  shake.mag = Math.max(0, shake.mag - (shake.mag * 6 + 24) * dt)
  shake.x = (Math.random() - 0.5) * shake.mag
  shake.y = (Math.random() - 0.5) * shake.mag
  return shake
}
// Game-over confetti.
export function confettiBurst(list, w, opts = {}) {
  const { count = 60, colors = ['#65A30D', '#D9A514', '#22c55e', '#4ade80', '#fbbf24', '#f472b6'] } = opts
  for (let i = 0; i < count; i++) list.push({
    x: Math.random() * w, y: -10 - Math.random() * 60,
    vx: (Math.random() - 0.5) * 70, vy: 70 + Math.random() * 130,
    rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 9,
    w: 5 + Math.random() * 5, h: 8 + Math.random() * 6,
    color: colors[i % colors.length], age: 0, life: 2.4,
  })
}
export function updateConfetti(list, dt, h) {
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i]
    c.age += dt; c.vy += 60 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.spin * dt
    if (c.age >= c.life || c.y > h + 20) list.splice(i, 1)
  }
}
export function drawConfetti(ctx, list) {
  for (const c of list) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, 1 - c.age / c.life)
    ctx.translate(c.x, c.y); ctx.rotate(c.rot)
    ctx.fillStyle = c.color
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
