'use client'
// Debt Breaker — classic paddle-and-ball brick breaker with a goal: the brick
// wall is your debt. Every brick is a balance (credit card, car loan, student
// loan…); smash them all and the level ends DEBT FREE. Power-ups drop from
// bricks: wide paddle, slow ball, multiball. Move with mouse / touch / arrows.
// Sim in refs + rAF; React state is HUD only; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, ROSE, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-breaker-best-v1'

// Debt rows, worst (top) to almost-free (bottom). Color runs hot → green.
const DEBT_ROWS = [
  { label: '💳', name: 'Credit card', color: '#E11D48', dark: '#9f1239', value: 90 },
  { label: '🏥', name: 'Medical bill', color: '#F97316', dark: '#9a3412', value: 70 },
  { label: '🚗', name: 'Car loan', color: '#F59E0B', dark: '#92400e', value: 50 },
  { label: '🎓', name: 'Student loan', color: '#84CC16', dark: '#3f6212', value: 30 },
  { label: '📱', name: 'BNPL', color: '#10B981', dark: '#065f46', value: 20 },
]
const POWERS = [
  { id: 'wide', label: '↔️', name: 'Wider paddle' },
  { id: 'slow', label: '🐢', name: 'Slow ball' },
  { id: 'multi', label: '✚', name: 'Multiball' },
]

const PADDLE_H = 14
const BALL_R = 7

const freshSim = (w, h) => ({
  paddle: { x: w / 2, w: 110, wide: 0 },
  balls: [],
  bricks: [],
  drops: [], parts: [],
  level: 1, lives: 3, score: 0, debtLeft: 0,
  speed: 380, slow: 0, clock: 0, launchT: 0,
})

function buildWall(sim, w) {
  sim.bricks = []
  const rows = Math.min(7, 4 + Math.floor((sim.level - 1) / 2))
  const cols = Math.max(7, Math.min(14, Math.floor(w / 78)))
  const gap = 6
  const bw = (w - gap * (cols + 1)) / cols
  const bh = 26
  let debt = 0
  for (let r = 0; r < rows; r++) {
    const kind = DEBT_ROWS[r % DEBT_ROWS.length]
    for (let c = 0; c < cols; c++) {
      const value = kind.value * (1 + (sim.level - 1) * 0.25)
      debt += value
      sim.bricks.push({
        x: gap + c * (bw + gap), y: 64 + r * (bh + gap), w: bw, h: bh,
        kind, value, hp: r === 0 && sim.level >= 3 ? 2 : 1,
      })
    }
  }
  sim.debtLeft = debt
}

function spawnBall(sim, w, h, stuck = true) {
  sim.balls.push({
    x: sim.paddle.x, y: h - 40 - BALL_R,
    vx: 0, vy: 0, stuck,
  })
}

export default function DebtBreaker() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const toastTimer = useRef(null)
  const keysRef = useRef({ l: false, r: false })

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [debtLeft, setDebtLeft] = useState(0)
  const [toast, setToast] = useState('')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('breaker')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1500)
  }

  const sfx = (name) => {
    switch (name) {
      case 'paddle': tone({ f0: 220, f1: 320, t: 0.06, type: 'square', g: 0.1 }); break
      case 'wall': tone({ f0: 180, f1: 150, t: 0.05, type: 'triangle', g: 0.08 }); break
      case 'brick': tone({ f0: 430, f1: 620, t: 0.07, type: 'square', g: 0.12 }); break
      case 'clink': tone({ f0: 700, f1: 500, t: 0.05, type: 'square', g: 0.08 }); break
      case 'power': [523, 784].forEach((f, i) => tone({ f0: f, t: 0.1, g: 0.13, at: i * 0.06 })); break
      case 'drop': tone({ f0: 400, f1: 120, t: 0.4, type: 'sawtooth', g: 0.12 }); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.14, g: 0.16, at: i * 0.09 })); break
      case 'lose': [330, 262, 196].forEach((f, i) => tone({ f0: f, f1: f * 0.92, t: 0.24, type: 'triangle', g: 0.16, at: i * 0.16 })); break
      default: break
    }
  }

  function burst(sim, x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160
      sim.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.4 + Math.random() * 0.3, color })
    }
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('lose')
    save(sim.score, sim.level)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function levelUp(sim) {
    const { w, h } = sizeRef.current
    sim.level += 1
    sim.score += 250 * sim.level
    sim.speed = Math.min(620, sim.speed + 30)
    sim.balls = []
    sim.drops = []
    sim.paddle.w = 110
    buildWall(sim, w)
    spawnBall(sim, w, h)
    setScore(sim.score); setLevel(sim.level); setDebtLeft(sim.debtLeft)
    showToast(`DEBT FREE! 🎉 Level ${sim.level}`)
    sfx('win')
  }

  function loseBall(sim) {
    const { w, h } = sizeRef.current
    if (sim.balls.length > 0) return // still have another ball in play
    sim.lives -= 1
    setLives(sim.lives)
    sfx('drop')
    if (sim.lives <= 0) { endGame(sim); return }
    sim.paddle.w = 110
    spawnBall(sim, w, h)
    showToast('Ball lost! 💸')
  }

  function hitBrick(sim, bi, bx, by) {
    const b = sim.bricks[bi]
    b.hp -= 1
    if (b.hp > 0) { sfx('clink'); return }
    sim.bricks.splice(bi, 1)
    sim.score += b.value
    sim.debtLeft = Math.max(0, sim.debtLeft - b.value)
    setScore(sim.score)
    setDebtLeft(sim.debtLeft)
    burst(sim, bx, by, b.kind.color)
    sim.parts.push({ txt: `-$${fmt(b.value)}`, x: bx, y: by, vy: -60, life: 0.8, color: b.kind.color })
    sfx('brick')
    if (Math.random() < 0.12) {
      const p = POWERS[Math.floor(Math.random() * POWERS.length)]
      sim.drops.push({ x: bx, y: by, vy: 130, power: p })
    }
    if (sim.bricks.length === 0) levelUp(sim)
  }

  function applyPower(sim, p) {
    const { w, h } = sizeRef.current
    sfx('power')
    showToast(`${p.label} ${p.name}!`)
    if (p.id === 'wide') { sim.paddle.w = 170; sim.paddle.wide = 12 }
    if (p.id === 'slow') sim.slow = 6
    if (p.id === 'multi') {
      const src = sim.balls.find((b) => !b.stuck) || sim.balls[0]
      if (src) {
        for (const sgn of [-1, 1]) {
          const sp = Math.hypot(src.vx, src.vy) || sim.speed
          const a = Math.atan2(src.vy, src.vx) + sgn * 0.5
          sim.balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, stuck: false })
        }
      }
    }
  }

  function launch(sim) {
    let launched = false
    for (const b of sim.balls) {
      if (!b.stuck) continue
      b.stuck = false
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
      b.vx = Math.cos(a) * sim.speed
      b.vy = Math.sin(a) * sim.speed
      launched = true
    }
    if (launched) sfx('paddle')
  }

  function step(sim, dt) {
    const { w, h } = sizeRef.current
    sim.clock += dt
    if (sim.slow > 0) sim.slow -= dt
    if (sim.paddle.wide > 0) {
      sim.paddle.wide -= dt
      if (sim.paddle.wide <= 0) sim.paddle.w = 110
    }

    // keyboard paddle
    const kv = (keysRef.current.r ? 1 : 0) - (keysRef.current.l ? 1 : 0)
    if (kv !== 0) sim.paddle.x += kv * 560 * dt
    sim.paddle.x = Math.max(sim.paddle.w / 2, Math.min(w - sim.paddle.w / 2, sim.paddle.x))

    const speedScale = sim.slow > 0 ? 0.62 : 1
    const py = h - 40

    for (let i = sim.balls.length - 1; i >= 0; i--) {
      const b = sim.balls[i]
      if (b.stuck) {
        b.x = sim.paddle.x
        b.y = py - BALL_R - PADDLE_H / 2
        continue
      }
      b.x += b.vx * speedScale * dt
      b.y += b.vy * speedScale * dt
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); sfx('wall') }
      if (b.x > w - BALL_R) { b.x = w - BALL_R; b.vx = -Math.abs(b.vx); sfx('wall') }
      if (b.y < 56 + BALL_R) { b.y = 56 + BALL_R; b.vy = Math.abs(b.vy); sfx('wall') }

      // paddle
      if (b.vy > 0 && b.y + BALL_R >= py - PADDLE_H / 2 && b.y + BALL_R <= py + PADDLE_H && Math.abs(b.x - sim.paddle.x) <= sim.paddle.w / 2 + BALL_R) {
        const off = (b.x - sim.paddle.x) / (sim.paddle.w / 2) // -1 .. 1
        const ang = -Math.PI / 2 + off * 1.05
        const sp = Math.min(680, Math.hypot(b.vx, b.vy) * 1.02)
        b.vx = Math.cos(ang) * sp
        b.vy = Math.sin(ang) * sp
        b.y = py - PADDLE_H / 2 - BALL_R
        sfx('paddle')
      }

      // bricks
      for (let j = sim.bricks.length - 1; j >= 0; j--) {
        const br = sim.bricks[j]
        if (b.x + BALL_R < br.x || b.x - BALL_R > br.x + br.w || b.y + BALL_R < br.y || b.y - BALL_R > br.y + br.h) continue
        // reflect off the nearer axis
        const dx = Math.min(Math.abs(b.x + BALL_R - br.x), Math.abs(br.x + br.w - (b.x - BALL_R)))
        const dy = Math.min(Math.abs(b.y + BALL_R - br.y), Math.abs(br.y + br.h - (b.y - BALL_R)))
        if (dx < dy) b.vx = -b.vx
        else b.vy = -b.vy
        hitBrick(sim, j, br.x + br.w / 2, br.y + br.h / 2)
        break
      }
      // level-up inside hitBrick swaps the balls array — stop this frame's loop
      if (!sim.balls.includes(b)) return

      if (b.y > h + BALL_R * 2) {
        sim.balls.splice(i, 1)
        loseBall(sim)
        if (statusRef.current !== 'playing') return
      }
    }

    // power drops
    for (let i = sim.drops.length - 1; i >= 0; i--) {
      const d = sim.drops[i]
      d.y += d.vy * dt
      if (d.y >= py - PADDLE_H && Math.abs(d.x - sim.paddle.x) <= sim.paddle.w / 2 + 14) {
        sim.drops.splice(i, 1)
        applyPower(sim, d.power)
      } else if (d.y > h + 20) sim.drops.splice(i, 1)
    }

    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i]
      p.life -= dt
      if (p.life <= 0) { sim.parts.splice(i, 1); continue }
      p.x += (p.vx || 0) * dt
      p.y += p.vy * dt
      if (!p.txt) p.vy += 500 * dt
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#101826')
    bg.addColorStop(1, '#1a2436')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // bricks
    for (const br of sim.bricks) {
      ctx.fillStyle = br.hp > 1 ? br.kind.dark : br.kind.color
      ctx.beginPath()
      ctx.roundRect(br.x, br.y, br.w, br.h, 6)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.beginPath()
      ctx.roundRect(br.x, br.y, br.w, br.h / 2, 6)
      ctx.fill()
      if (br.w > 46) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `${Math.round(br.h * 0.62)}px system-ui, sans-serif`
        ctx.fillText(br.kind.label, br.x + br.w / 2, br.y + br.h / 2 + 1)
      }
    }

    // paddle
    const py = h - 40
    const pw = sim.paddle.w
    const grad = ctx.createLinearGradient(0, py - PADDLE_H / 2, 0, py + PADDLE_H / 2)
    grad.addColorStop(0, '#A3E635')
    grad.addColorStop(1, '#65A30D')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(sim.paddle.x - pw / 2, py - PADDLE_H / 2, pw, PADDLE_H, 8)
    ctx.fill()

    // balls
    for (const b of sim.balls) {
      const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R)
      g.addColorStop(0, '#fff7d6')
      g.addColorStop(1, '#f59e0b')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill()
    }

    // drops
    for (const d of sim.drops) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#65A30D'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillText(d.power.label, d.x, d.y + 1)
    }

    // particles + popups
    for (const p of sim.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2))
      ctx.fillStyle = p.color
      if (p.txt) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = "800 16px 'Bricolage Grotesque', system-ui, sans-serif"
        ctx.fillText(p.txt, p.x, p.y)
      } else {
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      }
      ctx.globalAlpha = 1
    }

    // launch hint
    if (sim.balls.some((b) => b.stuck) && statusRef.current === 'playing') {
      ctx.fillStyle = 'rgba(226,232,240,0.85)'
      ctx.textAlign = 'center'
      ctx.font = "700 14px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.fillText('Tap / click / space to launch', w / 2, h - 90)
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
    const { w, h } = sizeRef.current
    const sim = freshSim(w, h)
    buildWall(sim, w)
    spawnBall(sim, w, h)
    simRef.current = sim
    setScore(0); setLevel(1); setLives(3); setDebtLeft(sim.debtLeft); resetSave()
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

  // input
  useEffect(() => {
    const down = (e) => {
      if (statusRef.current !== 'playing') return
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); keysRef.current.l = true }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); keysRef.current.r = true }
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); launch(simRef.current) }
    }
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.l = false
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.r = false
    }
    window.addEventListener('keydown', down, { passive: false })
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const movePaddle = (e) => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing') return
    const rect = e.currentTarget.getBoundingClientRect()
    sim.paddle.x = e.clientX - rect.left
  }

  // canvas sizing
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

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(toastTimer.current)
  }, [])

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(430px, calc(100svh - 240px), 720px)', minHeight: 430, background: '#101826', borderTop: '1px solid rgba(30,41,59,0.8)', borderBottom: '1px solid rgba(30,41,59,0.8)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={movePaddle}
          onPointerDown={(e) => { e.preventDefault(); movePaddle(e); launch(simRef.current) }}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#93a4c8' }}>Paid off </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#A3E635' }}>${fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>Debt left </span>
              <span className="font-display font-bold text-sm" style={{ color: '#fda4af' }}>${fmt(debtLeft)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>Lv </span>
              <span className="font-display font-bold text-sm" style={{ color: '#cbd5e1' }}>{level}</span>
            </div>
            <div className="text-sm" aria-label={`${lives} balls`}>{'🟡'.repeat(Math.max(0, lives))}</div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full" style={{ background: '#A3E635', color: INK, pointerEvents: 'none' }}>{toast}</div>
        )}

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🧱</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Debt Breaker</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              That wall is your debt — credit cards, car loan, student loans.
              <b style={{ color: GREEN }}> Smash every brick to go debt-free</b> and level up.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Move the paddle with your mouse, finger or arrow keys. Catch the falling power-ups: wider paddle, slow ball, multiball.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best payoff: ${fmt(best)}</div>}
            <PrimaryButton onClick={start}>Start breaking</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>${fmt(score)} paid off — the wall isn&apos;t going anywhere.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">🧱💥</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Out of balls!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>${fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>of debt crushed</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{level}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>level reached</div>
              </div>
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>${fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best payoff</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Break more debt</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Mouse / finger / arrow keys move the paddle · space or tap launches · the paddle edge steers the ball · clear the wall to go debt-free.
      </p>
    </div>
  )
}
