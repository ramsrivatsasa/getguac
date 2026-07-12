'use client'
// Hoop Shot — arcade basketball. Drag back from the ball (slingshot style)
// and release to shoot at the hoop; real rim-peg and backboard bounces decide
// what drops. 60 seconds, +2 per bucket, +3 for a clean swish, and three makes
// in a row light the ball on fire for double points. The shooting spot moves
// after every make. Sim in refs + rAF; React state is HUD only.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-hoops-best-v1'
const GAME_SECONDS = 60
const W = 1000, H = 640
const FLOOR = 566
const RIM = { y: 292, x0: 774, x1: 830, pegR: 5 }
const BOARD = { x: 842, y0: 196, y1: 316 }
const GRAV = 1500
const LAUNCH_K = 7.4
const PULL_MAX = 150

const spawnBall = () => ({
  x: 150 + Math.random() * 190, y: FLOOR - 130 - Math.random() * 120, r: 24,
  vx: 0, vy: 0, state: 'ready', age: 0, touched: false, scored: false, trail: [],
})

const freshSim = () => ({
  clock: 0, timeLeft: GAME_SECONDS, score: 0, streak: 0, makes: 0, attempts: 0,
  ball: spawnBall(), drag: null, popups: [],
})

export default function HoopShot() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const viewRef = useRef({ s: 1, ox: 0, oy: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [streak, setStreak] = useState(0)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('hoops')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'shoot': tone({ f0: 500, f1: 200, t: 0.12, type: 'triangle', g: 0.08 }); break
      case 'rim': tone({ f0: 320, f1: 240, t: 0.09, type: 'square', g: 0.12 }); break
      case 'board': tone({ f0: 180, f1: 120, t: 0.08, type: 'square', g: 0.12 }); break
      case 'bounce': tone({ f0: 140, f1: 80, t: 0.07, type: 'square', g: 0.1 }); break
      case 'swish': [880, 1175].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.14, at: i * 0.06 })); break
      case 'make': [523, 784].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.14, at: i * 0.06 })); break
      case 'fire': [659, 880, 1047].forEach((f, i) => tone({ f0: f, t: 0.1, g: 0.13, at: i * 0.05 })); break
      case 'buzzer': tone({ f0: 220, f1: 210, t: 0.7, type: 'sawtooth', g: 0.16 }); break
      default: break
    }
  }

  const toWorld = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const { s, ox, oy } = viewRef.current
    return { x: (e.clientX - rect.left - ox) / s, y: (e.clientY - rect.top - oy) / s }
  }

  // ─── physics ──────────────────────────────────────────────────────────────
  function stepBall(sim, dt) {
    const b = sim.ball
    if (b.state !== 'flying') return
    b.age += dt
    b.vy += GRAV * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.trail.push({ x: b.x, y: b.y, life: 0.35 })

    // score line: crossing rim height downward between the pegs
    if (!b.scored && b.vy > 0 && b.y - b.r < RIM.y && b.y + b.vy * dt + 6 >= RIM.y &&
        b.x > RIM.x0 + 6 && b.x < RIM.x1 - 6) {
      b.scored = true
      sim.attempts += 1
      sim.makes += 1
      const swish = !b.touched
      const hot = sim.streak >= 2 // this make will be 3rd+
      let pts = (swish ? 3 : 2) * (sim.streak >= 3 ? 2 : 1)
      sim.streak += 1
      if (sim.streak === 3) sfx('fire')
      sim.score += pts
      setScore(sim.score); setStreak(sim.streak)
      sim.popups.push({ txt: swish ? `SWISH +${pts}` : `+${pts}`, x: (RIM.x0 + RIM.x1) / 2, y: RIM.y - 40, life: 1, big: swish || hot })
      sfx(swish ? 'swish' : 'make')
    }

    // rim pegs
    for (const px of [RIM.x0, RIM.x1]) {
      const dx = b.x - px, dy = b.y - RIM.y
      const d = Math.hypot(dx, dy)
      if (d < b.r + RIM.pegR && d > 0.001) {
        const nx = dx / d, ny = dy / d
        const push = b.r + RIM.pegR - d
        b.x += nx * push; b.y += ny * push
        const vn = b.vx * nx + b.vy * ny
        if (vn < 0) {
          b.vx -= (1 + 0.62) * vn * nx
          b.vy -= (1 + 0.62) * vn * ny
          b.touched = true
          sfx('rim')
        }
      }
    }
    // backboard (left face)
    if (b.x + b.r > BOARD.x && b.x < BOARD.x + 20 && b.y > BOARD.y0 && b.y < BOARD.y1 && b.vx > 0) {
      b.x = BOARD.x - b.r
      b.vx *= -0.55
      b.touched = true
      sfx('board')
    }
    // floor
    if (b.y + b.r > FLOOR) {
      b.y = FLOOR - b.r
      if (Math.abs(b.vy) > 90) sfx('bounce')
      b.vy *= -0.55
      b.vx *= 0.985
    }
    // dead ball → next
    const slow = Math.abs(b.vy) < 30 && Math.abs(b.vx) < 30 && b.y + b.r > FLOOR - 4
    if (slow || b.age > 6.5 || b.x > W + 60 || b.x < -60) {
      if (!b.scored) {
        sim.attempts += 1
        if (sim.streak > 0) { sim.streak = 0; setStreak(0) }
      }
      sim.ball = spawnBall()
    }
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('buzzer')
    save(sim.score, null)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    sim.clock += dt
    sim.timeLeft -= dt
    setTimeLeft(Math.max(0, Math.ceil(sim.timeLeft)))
    if (sim.timeLeft <= 0) { endGame(sim); return }
    stepBall(sim, dt)
    for (let i = sim.ball.trail.length - 1; i >= 0; i--) {
      const t = sim.ball.trail[i]
      t.life -= dt
      if (t.life <= 0) sim.ball.trail.splice(i, 1)
    }
    for (let i = sim.popups.length - 1; i >= 0; i--) {
      const p = sim.popups[i]
      p.life -= dt; p.y -= dt * 44
      if (p.life <= 0) sim.popups.splice(i, 1)
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function drawCourt(ctx) {
    // wall + floor
    ctx.fillStyle = '#1e2a3a'
    ctx.fillRect(0, 0, W, FLOOR)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (let i = 0; i < 12; i++) ctx.fillRect(0, i * 52, W, 1.5)
    const fg = ctx.createLinearGradient(0, FLOOR, 0, H)
    fg.addColorStop(0, '#b5854e'); fg.addColorStop(1, '#8a6238')
    ctx.fillStyle = fg
    ctx.fillRect(0, FLOOR, W, H - FLOOR)
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(i * 110, FLOOR); ctx.lineTo(i * 110 + 40, H); ctx.stroke() }

    // pole + backboard + rim + net
    ctx.fillStyle = '#475569'
    ctx.fillRect(BOARD.x + 12, RIM.y - 6, 14, FLOOR - RIM.y + 6)
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(BOARD.x, BOARD.y0, 12, BOARD.y1 - BOARD.y0)
    ctx.strokeStyle = '#f97316'
    ctx.strokeRect(BOARD.x + 2, RIM.y - 62, 8, 44)
    ctx.strokeStyle = '#ea580c'
    ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(RIM.x0, RIM.y); ctx.lineTo(RIM.x1 + 8, RIM.y); ctx.stroke()
    ctx.fillStyle = '#ea580c'
    ctx.beginPath(); ctx.arc(RIM.x0, RIM.y, RIM.pegR, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(RIM.x1, RIM.y, RIM.pegR, 0, Math.PI * 2); ctx.fill()
    // net
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= 4; i++) {
      const nx = RIM.x0 + ((RIM.x1 - RIM.x0) * i) / 4
      ctx.beginPath(); ctx.moveTo(nx, RIM.y + 2); ctx.lineTo(RIM.x0 + (RIM.x1 - RIM.x0) / 2 + (nx - (RIM.x0 + (RIM.x1 - RIM.x0) / 2)) * 0.45, RIM.y + 44); ctx.stroke()
    }
  }

  function drawBallAt(ctx, x, y, r, hot) {
    if (hot) {
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 22
    }
    ctx.fillStyle = hot ? '#fb923c' : '#e8762d'
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(60,20,0,0.55)'
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke()
    ctx.beginPath(); ctx.arc(x - r * 1.15, y, r * 1.35, -0.5, 0.5); ctx.stroke()
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    ctx.fillStyle = '#141d29'
    ctx.fillRect(0, 0, w, h)

    const s = Math.min(w / W, h / H)
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2
    viewRef.current = { s, ox, oy }
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    drawCourt(ctx)

    const b = sim.ball
    const hot = sim.streak >= 3
    // trail
    for (const t of b.trail) {
      ctx.globalAlpha = Math.max(0, t.life * (hot ? 2.4 : 1.4))
      ctx.fillStyle = hot ? '#f97316' : 'rgba(232,118,45,0.5)'
      ctx.beginPath(); ctx.arc(t.x, t.y, hot ? 9 : 6, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    // aim preview
    if (sim.drag && b.state === 'ready') {
      const vx = (b.x - sim.drag.x) * LAUNCH_K, vy = (b.y - sim.drag.y) * LAUNCH_K
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 1; i <= 10; i++) {
        const t = i * 0.055
        ctx.beginPath()
        ctx.arc(b.x + vx * t, b.y + vy * t + 0.5 * GRAV * t * t, 5 - i * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
      // rubber line
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(sim.drag.x, sim.drag.y); ctx.stroke()
    }

    drawBallAt(ctx, b.x, b.y, b.r, hot)

    for (const p of sim.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2))
      ctx.fillStyle = p.big ? '#fde047' : '#f8fafc'
      ctx.textAlign = 'center'
      ctx.font = `800 ${p.big ? 34 : 26}px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(p.txt, p.x, p.y)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  function loop(ts) {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    if (!sim) return
    const dt = Math.min(0.033, Math.max(0, (ts - lastRef.current) / 1000))
    lastRef.current = ts
    step(sim, dt)
    if (statusRef.current === 'playing') {
      draw(sim)
      rafRef.current = requestAnimationFrame(loop)
    }
  }

  const start = () => {
    simRef.current = freshSim()
    setScore(0); setTimeLeft(GAME_SECONDS); setStreak(0); resetSave()
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

  // ─── drag to shoot ────────────────────────────────────────────────────────
  const onDown = (e) => {
    e.preventDefault()
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing' || sim.ball.state !== 'ready') return
    const p = toWorld(e)
    if (Math.hypot(p.x - sim.ball.x, p.y - sim.ball.y) < 130) {
      sim.drag = { x: sim.ball.x, y: sim.ball.y }
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
  }
  const onMove = (e) => {
    const sim = simRef.current
    if (!sim || !sim.drag) return
    const p = toWorld(e)
    let dx = p.x - sim.ball.x, dy = p.y - sim.ball.y
    const d = Math.hypot(dx, dy)
    if (d > PULL_MAX) { dx *= PULL_MAX / d; dy *= PULL_MAX / d }
    sim.drag = { x: sim.ball.x + dx, y: sim.ball.y + dy }
  }
  const onUp = () => {
    const sim = simRef.current
    if (!sim || !sim.drag) return
    const b = sim.ball
    const vx = (b.x - sim.drag.x) * LAUNCH_K, vy = (b.y - sim.drag.y) * LAUNCH_K
    sim.drag = null
    if (Math.hypot(vx, vy) < 140) return
    b.vx = vx; b.vy = vy
    b.state = 'flying'; b.age = 0
    sfx('shoot')
  }

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
        style={{ height: 'clamp(430px, calc(100svh - 240px), 720px)', minHeight: 430, background: '#141d29', borderTop: '1px solid rgba(20,83,45,0.12)', borderBottom: '1px solid rgba(20,83,45,0.12)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: status === 'playing' ? 'grab' : 'default' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#fde047' }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>Time </span>
              <span className="font-display font-bold text-sm" style={{ color: timeLeft <= 10 ? '#f87171' : '#e2e8f0' }}>{timeLeft}s</span>
            </div>
            {streak >= 3 && <div className="text-xs font-bold" style={{ color: '#fb923c' }}>🔥 ON FIRE ×2</div>}
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🏀</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Hoop Shot</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              <b style={{ color: GREEN }}>Drag back from the ball</b> and release to shoot. Buckets are +2,
              untouched swishes +3, and the shooting spot moves every ball.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Sixty seconds on the clock. Three makes in a row set the ball <b style={{ color: '#ea580c' }}>on fire</b> — double points until you miss.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best game: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Ball up</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} points, {timeLeft}s left.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">🏀🚨</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Buzzer!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            {simRef.current && (
              <div className="text-[11px] font-semibold" style={{ color: MUTED }}>
                {simRef.current.makes} makes on {simRef.current.attempts} shots
              </div>
            )}
            <div className="flex justify-center gap-8 mt-3">
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
        Drag back from the ball, release to shoot · swish +3, bucket +2 · 3 in a row = 🔥 double points · 60 seconds.
      </p>
    </div>
  )
}
