'use client'
// Flappy Guac — one-tap flyer. Tap / click / space to flap the winged avocado
// through the gaps in the fee pipes. One pipe = 10 points; the gaps tighten
// and the world speeds up as you go. Sim in refs + rAF; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-flappy-best-v1'
const W = 520, H = 720, GROUND = 640
const GRAV = 1250, FLAP = -345
const PIPE_W = 74

const freshSim = () => ({
  clock: 0, score: 0, pipes: [], nextX: W + 140,
  bird: { y: 300, vy: 0, wing: 0 },
  speed: 168, gap: 178,
  clouds: Array.from({ length: 3 }, (_, i) => ({ x: 80 + i * 190, y: 60 + (i % 2) * 90 })),
  started: false,
})

export default function FlappyGuac() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('flappy')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'flap': tone({ f0: 420, f1: 620, t: 0.07, type: 'triangle', g: 0.08 }); break
      case 'point': tone({ f0: 880, f1: 1175, t: 0.09, type: 'square', g: 0.1 }); break
      case 'die': [300, 200, 120].forEach((f, i) => tone({ f0: f, f1: f * 0.6, t: 0.18, type: 'sawtooth', g: 0.13, at: i * 0.09 })); break
      default: break
    }
  }

  const flap = () => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing') return
    sim.started = true
    sim.bird.vy = FLAP
    sim.bird.wing = 1
    sfx('flap')
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('die')
    const pts = sim.score * 10
    sim.final = pts
    save(pts, null)
    submitBest(pts)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    sim.clock += dt
    for (const c of sim.clouds) { c.x -= dt * 12; if (c.x < -80) c.x = W + 60 }
    const b = sim.bird
    b.wing = Math.max(0, b.wing - dt * 4)
    if (!sim.started) {
      b.y = 300 + Math.sin(sim.clock * 3) * 14
      return
    }
    b.vy += GRAV * dt
    b.y += b.vy * dt

    // spawn pipes
    if (sim.nextX <= W + 100) {
      const cy = 150 + Math.random() * (GROUND - 300)
      sim.pipes.push({ x: W + 100, cy, passed: false })
      sim.nextX = W + 100 + 265
    }
    sim.nextX -= sim.speed * dt

    for (const p of sim.pipes) p.x -= sim.speed * dt
    sim.pipes = sim.pipes.filter((p) => p.x > -PIPE_W - 20)

    const bx = W * 0.32, br = 19
    // collisions
    if (b.y + br > GROUND) { b.y = GROUND - br; return endGame(sim) }
    if (b.y - br < 0) { b.y = br; b.vy = 40 }
    for (const p of sim.pipes) {
      const half = sim.gap / 2
      if (bx + br > p.x && bx - br < p.x + PIPE_W) {
        if (b.y - br < p.cy - half || b.y + br > p.cy + half) return endGame(sim)
      }
      if (!p.passed && p.x + PIPE_W < bx - br) {
        p.passed = true
        sim.score += 1
        setScore(sim.score)
        sim.speed = Math.min(255, sim.speed + 1.6)
        sim.gap = Math.max(146, sim.gap - 0.7)
        sfx('point')
      }
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#7dd3fc'); bg.addColorStop(1, '#e0f2fe')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const s = Math.min(w / W, h / H)
    const ox = (w - W * s) / 2
    // side letterbox tint
    ctx.fillStyle = 'rgba(3,105,161,0.12)'
    if (ox > 0) { ctx.fillRect(0, 0, ox, h); ctx.fillRect(w - ox, 0, ox, h) }
    const oy = (h - H * s) / 2
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (const c of sim.clouds) {
      ctx.beginPath()
      ctx.arc(c.x, c.y, 22, 0, Math.PI * 2)
      ctx.arc(c.x + 22, c.y + 6, 17, 0, Math.PI * 2)
      ctx.arc(c.x - 22, c.y + 7, 15, 0, Math.PI * 2)
      ctx.fill()
    }

    // pipes — fee pipes with $ tags
    for (const p of sim.pipes) {
      const half = sim.gap / 2
      for (const [py, ph, flip] of [[0, p.cy - half, true], [p.cy + half, GROUND - p.cy - half, false]]) {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0)
        grad.addColorStop(0, '#15803d'); grad.addColorStop(0.5, '#22c55e'); grad.addColorStop(1, '#15803d')
        ctx.fillStyle = grad
        ctx.fillRect(p.x, py, PIPE_W, ph)
        // lip
        ctx.fillStyle = '#166534'
        const lipY = flip ? py + ph - 26 : py
        ctx.fillRect(p.x - 6, lipY, PIPE_W + 12, 26)
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = `800 17px 'Bricolage Grotesque', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('$', p.x + PIPE_W / 2, lipY + 18)
      }
    }

    // ground
    ctx.fillStyle = '#86c94f'
    ctx.fillRect(0, GROUND, W, H - GROUND)
    ctx.fillStyle = '#65A30D'
    const shift = (sim.clock * sim.speed) % 34
    for (let x = -34; x < W + 34; x += 34) {
      ctx.fillRect(x - shift, GROUND, 18, 7)
    }

    // bird — avocado with a wing
    const bx = W * 0.32
    const b = sim.bird
    const rot = sim.started ? Math.max(-0.5, Math.min(1.1, b.vy / 600)) : 0
    ctx.save()
    ctx.translate(bx, b.y)
    ctx.rotate(rot)
    ctx.fillStyle = '#4d7c0f'
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 20, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#84cc16'
    ctx.beginPath(); ctx.ellipse(0, 2.5, 11.5, 13.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#78350f'
    ctx.beginPath(); ctx.arc(0, 5, 5.5, 0, Math.PI * 2); ctx.fill()
    // wing
    ctx.fillStyle = '#fefce8'
    ctx.save()
    ctx.rotate(b.wing > 0.4 ? -0.9 : 0.15)
    ctx.beginPath(); ctx.ellipse(-11, -2, 11, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    // eye + beak-ish smile
    ctx.fillStyle = '#15281C'
    ctx.beginPath(); ctx.arc(6, -7, 2.6, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

    // in-world score
    if (sim.started && statusRef.current === 'playing') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = `800 56px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(String(sim.score), W / 2, 90)
    }
    if (!sim.started && statusRef.current === 'playing') {
      ctx.fillStyle = 'rgba(21,40,28,0.65)'
      ctx.font = `800 24px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('Tap to flap!', W / 2, 200)
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
    setScore(0); resetSave()
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
      if ((e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp') && statusRef.current === 'playing') {
        e.preventDefault()
        flap()
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
        style={{ height: 'min(84vh, 900px)', minHeight: 480, background: '#7dd3fc', borderTop: '1px solid rgba(20,83,45,0.12)', borderBottom: '1px solid rgba(20,83,45,0.12)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => { e.preventDefault(); flap() }}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: status === 'playing' ? 'pointer' : 'default' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#0c4a6e' }}>Pipes </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#0c4a6e' }}>{score}</span>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay>
            <div className="text-4xl mb-1">🐤</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Flappy Guac</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              <b style={{ color: GREEN }}>Tap, click or press space</b> to flap. Thread the gaps between the fee pipes —
              one touch and it&apos;s over.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Every pipe is 10 points. The gaps tighten and the world speeds up the further you fly.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best flight: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Fly</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{score} pipes so far.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay>
            <div className="text-3xl mb-1">🐤💥</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Grounded!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(simRef.current?.final || 0)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{score} pipes cleared</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best flight</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Fly again</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Tap / click / space to flap · every pipe is +10 · gaps tighten as you go.
      </p>
    </div>
  )
}
