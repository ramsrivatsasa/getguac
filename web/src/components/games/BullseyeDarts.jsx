'use client'
// Bullseye Darts — classic pub dartboard, arcade aiming. The crosshair sways
// across the board; click / tap / press space to let the dart fly. Real darts
// scoring: 20 wedges, treble and double rings, outer bull 25, bullseye 50.
// Ten darts a game, the sway speeds up as you go. Sim in refs + rAF; React
// state is HUD only; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-darts-best-v1'
const DARTS_PER_GAME = 10

// Standard board wedge order, clockwise from the top
const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
// Ring radii as fractions of the double ring's outer edge (real proportions)
const RING = { bull: 0.037, outerBull: 0.094, trebleIn: 0.582, trebleOut: 0.629, doubleIn: 0.953, doubleOut: 1.0 }

function scoreAt(nx, ny) {
  // nx, ny in board units (1 = double ring outer edge), y down
  const r = Math.hypot(nx, ny)
  if (r <= RING.bull) return { pts: 50, label: 'BULLSEYE! 🎯' }
  if (r <= RING.outerBull) return { pts: 25, label: 'Bull 25' }
  if (r > RING.doubleOut) return { pts: 0, label: 'Miss' }
  let deg = (Math.atan2(nx, -ny) * 180) / Math.PI // 0° at top, clockwise
  if (deg < 0) deg += 360
  const seg = NUMBERS[Math.floor(((deg + 9) % 360) / 18)]
  if (r >= RING.trebleIn && r <= RING.trebleOut) return { pts: seg * 3, label: `Treble ${seg}! ×3` }
  if (r >= RING.doubleIn) return { pts: seg * 2, label: `Double ${seg} ×2` }
  return { pts: seg, label: `${seg}` }
}

const freshSim = () => ({
  clock: 0,
  dartIdx: 0, score: 0,
  aim: { x: 0, y: 0 },
  // sum-of-sines drift parameters, randomized per game
  drift: Array.from({ length: 4 }, () => ({
    wx: 0.7 + Math.random() * 1.1, wy: 0.7 + Math.random() * 1.1,
    px: Math.random() * Math.PI * 2, py: Math.random() * Math.PI * 2,
    ax: 0.18 + Math.random() * 0.22, ay: 0.18 + Math.random() * 0.22,
  })),
  flight: null, // { fromX, fromY, toX, toY, t } in board units
  stuck: [],    // landed darts [{x, y}]
  popups: [],   // floating labels
})

export default function BullseyeDarts() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [dartsLeft, setDartsLeft] = useState(DARTS_PER_GAME)
  const [lastHit, setLastHit] = useState('')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('darts')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'throw': tone({ f0: 900, f1: 240, t: 0.16, type: 'triangle', g: 0.08 }); break
      case 'thunk': tone({ f0: 160, f1: 70, t: 0.09, type: 'square', g: 0.16 }); break
      case 'nice': [660, 880].forEach((f, i) => tone({ f0: f, t: 0.1, g: 0.13, at: i * 0.07 })); break
      case 'bull': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.15, at: i * 0.07 })); break
      case 'miss': tone({ f0: 220, f1: 110, t: 0.3, type: 'triangle', g: 0.12 }); break
      case 'end': [392, 494, 587, 784].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.09 })); break
      default: break
    }
  }

  // ─── board geometry ───────────────────────────────────────────────────────
  function boardGeo() {
    const { w, h } = sizeRef.current
    const R = Math.min(w, h - 90) * 0.40
    return { cx: w / 2, cy: 52 + (h - 52) / 2, R }
  }

  function aimPos(sim) {
    // crosshair drifts as a sum of sines, speeding up dart by dart
    const speed = 1 + sim.dartIdx * 0.09
    let x = 0, y = 0
    for (const d of sim.drift) {
      x += d.ax * Math.sin(d.wx * speed * sim.clock + d.px)
      y += d.ay * Math.sin(d.wy * speed * sim.clock + d.py)
    }
    return { x: x * 0.85, y: y * 0.85 }
  }

  const throwDart = () => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing' || sim.flight) return
    const a = aimPos(sim)
    // small human scatter so the same aim isn't a guaranteed repeat
    const toX = a.x + (Math.random() - 0.5) * 0.03
    const toY = a.y + (Math.random() - 0.5) * 0.03
    sim.flight = { toX, toY, t: 0 }
    sfx('throw')
  }

  function landDart(sim) {
    const { toX, toY } = sim.flight
    sim.flight = null
    sim.stuck.push({ x: toX, y: toY })
    const hit = scoreAt(toX, toY)
    sim.score += hit.pts
    sim.dartIdx += 1
    setScore(sim.score)
    setDartsLeft(DARTS_PER_GAME - sim.dartIdx)
    setLastHit(hit.label)
    sim.popups.push({ txt: hit.pts > 0 ? `+${hit.pts}` : 'miss', x: toX, y: toY - 0.08, life: 0.9, big: hit.pts >= 40 })
    if (hit.pts === 0) sfx('miss')
    else if (hit.pts >= 50) sfx('bull')
    else if (hit.pts >= 36) sfx('nice')
    else sfx('thunk')
    if (sim.dartIdx >= DARTS_PER_GAME) {
      sfx('end')
      endGame(sim)
    }
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    save(sim.score, null)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    sim.clock += dt
    sim.aim = aimPos(sim)
    if (sim.flight) {
      sim.flight.t += dt / 0.32
      if (sim.flight.t >= 1) landDart(sim)
    }
    for (let i = sim.popups.length - 1; i >= 0; i--) {
      const p = sim.popups[i]
      p.life -= dt
      p.y -= dt * 0.18
      if (p.life <= 0) sim.popups.splice(i, 1)
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function drawBoard(ctx, cx, cy, R, clock) {
    // surround
    ctx.fillStyle = '#292524'
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#57534e'
    ctx.lineWidth = 3
    ctx.stroke()

    for (let i = 0; i < 20; i++) {
      const a0 = ((i * 18 - 99) * Math.PI) / 180 // wedge i spans 18°, 20 centered at top
      const a1 = a0 + (18 * Math.PI) / 180
      const dark = i % 2 === 0
      // main wedge (outer bull → treble-in and treble-out → double-in)
      ctx.fillStyle = dark ? '#1c1917' : '#f5f0e1'
      ctx.beginPath(); ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R * RING.trebleIn, a0, a1); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(cx, cy)
      // ring wedge helper below repaints these; draw full wedge then rings over
      ctx.arc(cx, cy, R * RING.doubleIn, a0, a1); ctx.closePath()
      ctx.fillStyle = dark ? '#1c1917' : '#f5f0e1'
      ctx.fill()
      // treble ring
      ctx.beginPath()
      ctx.arc(cx, cy, R * RING.trebleOut, a0, a1)
      ctx.arc(cx, cy, R * RING.trebleIn, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = dark ? '#b91c1c' : '#15803d'
      ctx.fill()
      // double ring
      ctx.beginPath()
      ctx.arc(cx, cy, R * RING.doubleOut, a0, a1)
      ctx.arc(cx, cy, R * RING.doubleIn, a1, a0, true)
      ctx.closePath()
      ctx.fillStyle = dark ? '#b91c1c' : '#15803d'
      ctx.fill()
      // number
      const mid = (a0 + a1) / 2
      ctx.fillStyle = '#e7e5e4'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `700 ${Math.round(R * 0.11)}px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(String(NUMBERS[i]), cx + Math.cos(mid) * R * 1.13, cy + Math.sin(mid) * R * 1.13)
    }
    // wires
    ctx.strokeStyle = 'rgba(214,211,209,0.55)'
    ctx.lineWidth = 1
    for (let i = 0; i < 20; i++) {
      const a = ((i * 18 - 99) * Math.PI) / 180
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * R * RING.outerBull, cy + Math.sin(a) * R * RING.outerBull)
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
      ctx.stroke()
    }
    for (const rr of [RING.trebleIn, RING.trebleOut, RING.doubleIn, RING.doubleOut]) {
      ctx.beginPath(); ctx.arc(cx, cy, R * rr, 0, Math.PI * 2); ctx.stroke()
    }
    // bulls
    ctx.fillStyle = '#15803d'
    ctx.beginPath(); ctx.arc(cx, cy, R * RING.outerBull, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#b91c1c'
    ctx.beginPath(); ctx.arc(cx, cy, R * RING.bull, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(214,211,209,0.7)'
    ctx.beginPath(); ctx.arc(cx, cy, R * RING.outerBull, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, R * RING.bull, 0, Math.PI * 2); ctx.stroke()
    // subtle sheen
    const sheen = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.5, R * 0.1, cx, cy, R * 1.28)
    sheen.addColorStop(0, 'rgba(255,255,255,0.08)')
    sheen.addColorStop(1, 'rgba(0,0,0,0.12)')
    ctx.fillStyle = sheen
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2); ctx.fill()
  }

  function drawDartAt(ctx, x, y, R) {
    ctx.strokeStyle = '#e7e5e4'
    ctx.lineWidth = Math.max(2, R * 0.02)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + R * 0.10, y - R * 0.10)
    ctx.stroke()
    // flights
    ctx.fillStyle = '#65A30D'
    ctx.beginPath()
    ctx.moveTo(x + R * 0.10, y - R * 0.10)
    ctx.lineTo(x + R * 0.17, y - R * 0.10)
    ctx.lineTo(x + R * 0.10, y - R * 0.17)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#facc15'
    ctx.beginPath(); ctx.arc(x, y, Math.max(2, R * 0.016), 0, Math.PI * 2); ctx.fill()
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const bg = ctx.createRadialGradient(w / 2, h * 0.4, 60, w / 2, h / 2, Math.max(w, h) * 0.8)
    bg.addColorStop(0, '#3b3734')
    bg.addColorStop(1, '#191512')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const { cx, cy, R } = boardGeo()
    drawBoard(ctx, cx, cy, R, sim.clock)

    // stuck darts
    for (const d of sim.stuck) drawDartAt(ctx, cx + d.x * R, cy + d.y * R, R)

    // dart in flight — grows then shrinks toward the board
    if (sim.flight) {
      const t = Math.min(1, sim.flight.t)
      const x = cx + sim.flight.toX * R * t
      const y = cy + sim.flight.toY * R * t + Math.sin(t * Math.PI) * -R * 0.18
      const s = 1 + Math.sin(t * Math.PI) * 1.6
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(s, s)
      ctx.fillStyle = '#facc15'
      ctx.beginPath(); ctx.arc(0, 0, R * 0.02, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    // crosshair
    if (statusRef.current === 'playing' && !sim.flight) {
      const x = cx + sim.aim.x * R, y = cy + sim.aim.y * R
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 2
      ctx.shadowColor = '#facc15'
      ctx.shadowBlur = 10
      ctx.beginPath(); ctx.arc(x, y, R * 0.075, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - R * 0.12, y); ctx.lineTo(x - R * 0.04, y)
      ctx.moveTo(x + R * 0.04, y); ctx.lineTo(x + R * 0.12, y)
      ctx.moveTo(x, y - R * 0.12); ctx.lineTo(x, y - R * 0.04)
      ctx.moveTo(x, y + R * 0.04); ctx.lineTo(x, y + R * 0.12)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // popups
    for (const p of sim.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2))
      ctx.fillStyle = p.big ? '#facc15' : '#e7e5e4'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `800 ${Math.round(R * (p.big ? 0.14 : 0.1))}px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(p.txt, cx + p.x * R, cy + p.y * R)
      ctx.globalAlpha = 1
    }
  }

  function loop(ts) {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    if (!sim) return
    const dt = Math.min(0.05, Math.max(0, (ts - lastRef.current) / 1000))
    lastRef.current = ts
    step(sim, dt)
    if (statusRef.current === 'playing') {
      draw(sim)
      rafRef.current = requestAnimationFrame(loop)
    }
  }

  const start = () => {
    simRef.current = freshSim()
    setScore(0); setDartsLeft(DARTS_PER_GAME); setLastHit(''); resetSave()
    setPhase('playing')
    lastRef.current = performance.now()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  const pause = () => {
    if (statusRef.current !== 'playing') return
    cancelAnimationFrame(rafRef.current)
    setPhase('paused')
  }
  const resume = () => {
    if (statusRef.current !== 'paused') return
    setPhase('playing')
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') && statusRef.current === 'playing') {
        e.preventDefault()
        throwDart()
      }
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cvs = canvasRef.current, wrap = wrapRef.current
    if (!cvs || !wrap) return
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth, h = wrap.clientHeight
      sizeRef.current = { w, h }
      cvs.width = Math.round(w * dpr)
      cvs.height = Math.round(h * dpr)
      cvs.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      if (simRef.current && statusRef.current !== 'playing') draw(simRef.current)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onBlur = () => pause()
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', vis)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(430px, calc(100dvh - 240px), 720px)', minHeight: 430, background: '#191512', borderTop: '1px solid rgba(87,83,78,0.5)', borderBottom: '1px solid rgba(87,83,78,0.5)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => { e.preventDefault(); throwDart() }}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: status === 'playing' ? 'pointer' : 'default' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#a8a29e' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#facc15' }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#78716c' }}>Darts </span>
              <span className="font-display font-bold text-sm" style={{ color: '#e7e5e4' }}>{'🎯'.repeat(Math.min(dartsLeft, 5))}{dartsLeft > 5 ? ` ${dartsLeft}` : ''}</span>
            </div>
            {lastHit && <div className="text-xs font-bold" style={{ color: '#facc15' }}>{lastHit}</div>}
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🎯</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Bullseye Darts</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              The crosshair never stops moving — <b style={{ color: GREEN }}>tap at the right moment</b> to sink the dart.
              Real darts scoring: trebles ×3, doubles ×2, outer bull 25, bullseye 50.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Ten darts a game, and the sway gets faster with every throw. Treble 20 is the money shot.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best game: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Throw darts</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} on the board, {dartsLeft} darts to go.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">🎯🏁</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Game shot!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>from {DARTS_PER_GAME} darts (perfect is 600)</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{Math.round(score / DARTS_PER_GAME)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>avg per dart</div>
              </div>
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best game</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Play again</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Tap, click or press space to throw when the crosshair is where you want it · trebles ×3 · doubles ×2 · bullseye 50 · 10 darts a game.
      </p>
    </div>
  )
}
