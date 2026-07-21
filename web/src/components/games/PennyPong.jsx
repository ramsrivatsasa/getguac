'use client'
// Penny Pong — the original video game, vs a computer paddle. Move with the
// mouse / touch (or arrow keys); first to 7 points wins. The ball picks up
// pace with every paddle hit and the return angle follows where on the
// paddle you catch it. Sim in refs + rAF; React state is HUD only.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-pong-best-v1'
const W = 1000, H = 640
const WIN_POINTS = 7
const PADDLE = { w: 14, h: 112 }
const BALL_R = 11
const SPEED0 = 420, SPEED_UP = 1.045, SPEED_MAX = 980

const serveBall = (dir) => {
  const a = (Math.random() * 0.5 - 0.25) * Math.PI
  return { x: W / 2, y: H / 2, vx: Math.cos(a) * SPEED0 * dir, vy: Math.sin(a) * SPEED0, speed: SPEED0 }
}

const freshSim = () => ({
  clock: 0, you: 0, cpu: 0, rally: 0, bestRally: 0,
  ball: serveBall(Math.random() < 0.5 ? -1 : 1),
  py: H / 2, cy: H / 2,               // paddle centers
  keys: { up: false, down: false },
  serveWait: 0, flash: 0,
})

export default function PennyPong() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const viewRef = useRef({ s: 1, ox: 0, oy: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')

  const [status, setStatus] = useState('idle')
  const [you, setYou] = useState(0)
  const [cpu, setCpu] = useState(0)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('pong')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'paddle': tone({ f0: 460, f1: 520, t: 0.05, type: 'square', g: 0.1 }); break
      case 'wall': tone({ f0: 260, f1: 220, t: 0.05, type: 'square', g: 0.08 }); break
      case 'point': [660, 880].forEach((f, i) => tone({ f0: f, t: 0.1, g: 0.13, at: i * 0.06 })); break
      case 'lose': tone({ f0: 240, f1: 130, t: 0.25, type: 'sawtooth', g: 0.12 }); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.08 })); break
      default: break
    }
  }

  const endGame = (sim, won) => {
    cancelAnimationFrame(rafRef.current)
    sfx(won ? 'win' : 'lose')
    const sc = sim.you * 100 + sim.bestRally * 10 + (won ? 500 : 0)
    sim.final = sc
    save(sc, null)
    submitBest(sc)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    sim.clock += dt
    sim.flash = Math.max(0, sim.flash - dt)

    // player paddle via keys (pointer sets py directly)
    if (sim.keys.up) sim.py -= 620 * dt
    if (sim.keys.down) sim.py += 620 * dt
    sim.py = Math.max(PADDLE.h / 2, Math.min(H - PADDLE.h / 2, sim.py))

    if (sim.serveWait > 0) {
      sim.serveWait -= dt
      return
    }

    const b = sim.ball
    b.x += b.vx * dt
    b.y += b.vy * dt

    // walls
    if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); sfx('wall') }
    if (b.y + BALL_R > H) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy); sfx('wall') }

    // cpu paddle: chases the ball with capped speed + wobble
    const cpuSpeed = 300 + Math.min(260, b.speed * 0.38)
    const targetY = b.vx > 0 ? b.y + Math.sin(sim.clock * 2.2) * 26 : H / 2
    const dy = targetY - sim.cy
    sim.cy += Math.max(-cpuSpeed * dt, Math.min(cpuSpeed * dt, dy))
    sim.cy = Math.max(PADDLE.h / 2, Math.min(H - PADDLE.h / 2, sim.cy))

    // player paddle hit
    const PX = 44
    if (b.vx < 0 && b.x - BALL_R < PX + PADDLE.w / 2 && b.x - BALL_R > PX - 26 &&
        Math.abs(b.y - sim.py) < PADDLE.h / 2 + BALL_R) {
      const off = (b.y - sim.py) / (PADDLE.h / 2)
      const ang = off * 1.0
      b.speed = Math.min(SPEED_MAX, b.speed * SPEED_UP)
      b.vx = Math.cos(ang) * b.speed
      b.vy = Math.sin(ang) * b.speed
      b.x = PX + PADDLE.w / 2 + BALL_R
      sim.rally += 1
      sim.bestRally = Math.max(sim.bestRally, sim.rally)
      sfx('paddle')
    }
    // cpu paddle hit
    const CX = W - 44
    if (b.vx > 0 && b.x + BALL_R > CX - PADDLE.w / 2 && b.x + BALL_R < CX + 26 &&
        Math.abs(b.y - sim.cy) < PADDLE.h / 2 + BALL_R) {
      const off = (b.y - sim.cy) / (PADDLE.h / 2)
      const ang = Math.PI - off * 1.0
      b.speed = Math.min(SPEED_MAX, b.speed * SPEED_UP)
      b.vx = Math.cos(ang) * b.speed
      b.vy = Math.sin(ang) * b.speed
      b.x = CX - PADDLE.w / 2 - BALL_R
      sim.rally += 1
      sim.bestRally = Math.max(sim.bestRally, sim.rally)
      sfx('paddle')
    }

    // scoring
    if (b.x < -30) {
      sim.cpu += 1
      setCpu(sim.cpu)
      sim.rally = 0
      sfx('lose')
      if (sim.cpu >= WIN_POINTS) return endGame(sim, false)
      sim.ball = serveBall(1)
      sim.serveWait = 0.8
    } else if (b.x > W + 30) {
      sim.you += 1
      setYou(sim.you)
      sim.rally = 0
      sim.flash = 0.4
      sfx('point')
      if (sim.you >= WIN_POINTS) return endGame(sim, true)
      sim.ball = serveBall(-1)
      sim.serveWait = 0.8
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    ctx.fillStyle = '#081726'
    ctx.fillRect(0, 0, w, h)

    const s = Math.min(w / W, h / H)
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2
    viewRef.current = { s, ox, oy }
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    // court
    ctx.fillStyle = '#0b2237'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(125,211,252,0.35)'
    ctx.lineWidth = 4
    ctx.setLineDash([16, 18])
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
    ctx.setLineDash([])

    // scores on the court, arcade style
    ctx.fillStyle = sim.flash > 0 ? 'rgba(125,211,252,0.7)' : 'rgba(125,211,252,0.28)'
    ctx.font = `800 110px 'Bricolage Grotesque', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(String(sim.you), W / 2 - 130, 130)
    ctx.fillStyle = 'rgba(125,211,252,0.28)'
    ctx.fillText(String(sim.cpu), W / 2 + 130, 130)

    // paddles
    ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 14
    ctx.fillStyle = '#bef264'
    ctx.beginPath(); ctx.roundRect(44 - PADDLE.w / 2, sim.py - PADDLE.h / 2, PADDLE.w, PADDLE.h, 7); ctx.fill()
    ctx.fillStyle = '#f472b6'
    ctx.beginPath(); ctx.roundRect(W - 44 - PADDLE.w / 2, sim.cy - PADDLE.h / 2, PADDLE.w, PADDLE.h, 7); ctx.fill()

    // ball — a penny
    const b = sim.ball
    if (sim.serveWait <= 0 || Math.floor(sim.clock * 6) % 2 === 0) {
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 16
      ctx.fillStyle = '#d97706'
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R * 0.62, 0, Math.PI * 2); ctx.fill()
    }
    ctx.shadowBlur = 0

    // rally meter
    if (sim.rally >= 4) {
      ctx.fillStyle = '#fde047'
      ctx.font = `800 22px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(`rally ×${sim.rally}`, W / 2, H - 28)
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
    setYou(0); setCpu(0); resetSave()
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

  const onPointerMove = (e) => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing') return
    const rect = canvasRef.current.getBoundingClientRect()
    const { s, oy } = viewRef.current
    const y = (e.clientY - rect.top - oy) / s
    sim.py = Math.max(PADDLE.h / 2, Math.min(H - PADDLE.h / 2, y))
  }

  useEffect(() => {
    const onKey = (e, down) => {
      const sim = simRef.current
      if (!sim) return
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); sim.keys.up = down }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); sim.keys.down = down }
    }
    const kd = (e) => onKey(e, true)
    const ku = (e) => onKey(e, false)
    window.addEventListener('keydown', kd, { passive: false })
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

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

  const won = you >= WIN_POINTS

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: '#081726' }}
      >
        <canvas
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerMove}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#7dd3fc' }}>You </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#bef264' }}>{you}</span>
              <span className="text-[11px] font-semibold mx-1" style={{ color: '#475569' }}>vs</span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#f472b6' }}>{cpu}</span>
            </div>
            <div className="text-[11px] font-semibold" style={{ color: '#7dd3fc' }}>first to {WIN_POINTS}</div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🏓</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Penny Pong</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              <b style={{ color: GREEN }}>Move the mouse (or slide a finger)</b> to steer your paddle — arrow keys work too.
              First to {WIN_POINTS} points takes the match.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              The penny speeds up with every hit, and where it lands on your paddle sets the return angle. Long rallies pay bonus points.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best match: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Serve</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{you}–{cpu}, first to {WIN_POINTS}.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">{won ? '🏆' : '🏓'}</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>{won ? 'You win the match!' : 'The machine takes it'}</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(simRef.current?.final || 0)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{you}–{cpu} · longest rally {simRef.current?.bestRally || 0}</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best match</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best!</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Rematch</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Mouse / finger / arrow keys move your paddle · ball speeds up every hit · edge-of-paddle shots go sharp · first to {WIN_POINTS}.
      </p>
    </div>
  )
}
