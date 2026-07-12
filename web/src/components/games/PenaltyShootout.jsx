'use client'
// Penalty Shootout — behind-the-ball soccer penalties. Two taps per kick:
// the first locks the sweeping crosshair (where you aim), the second stops
// the power meter (how hard). The keeper reads slow shots and dives; corners
// beat gloves, sky-high power beats the crossbar. Ten shots a game.
// Sim in refs + rAF; React state is HUD only; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-penalty-best-v1'
const SHOTS_PER_GAME = 10
const W = 1000, H = 640
const GOAL = { x0: 210, x1: 790, bar: 168, line: 428 } // goal mouth in world coords
const BALL0 = { x: 500, y: 556 }

const freshSim = () => ({
  clock: 0, phase: 'aim', shot: 0, score: 0, streak: 0,
  results: [],                 // '⚽' | '🧤' | '❌'
  aimT: Math.random() * 10, aim: { x: 500, y: 300 },
  power: 0, powerT: 0,
  target: null, flight: null,  // {t, from, to, over}
  keeper: { x: 500, dir: 0, high: false, t: 0, guessed: false },
  resultWait: 0, resultTxt: '',
  netRipple: 0,
})

export default function PenaltyShootout() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [shotNo, setShotNo] = useState(0)
  const [results, setResults] = useState([])

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('penalty')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'lock': tone({ f0: 700, f1: 900, t: 0.07, type: 'square', g: 0.09 }); break
      case 'kick': tone({ f0: 200, f1: 60, t: 0.14, type: 'square', g: 0.18 }); break
      case 'goal': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.15, at: i * 0.07 })); break
      case 'save': tone({ f0: 150, f1: 70, t: 0.18, type: 'square', g: 0.16 }); break
      case 'miss': [330, 247].forEach((f, i) => tone({ f0: f, t: 0.2, type: 'triangle', g: 0.12, at: i * 0.12 })); break
      case 'end': [392, 494, 587, 784].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.09 })); break
      default: break
    }
  }

  // ─── flow ─────────────────────────────────────────────────────────────────
  const act = () => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing') return
    if (sim.phase === 'aim') {
      sim.target = { ...sim.aim }
      sim.phase = 'power'
      sim.powerT = 0
      sfx('lock')
    } else if (sim.phase === 'power') {
      kick(sim)
    }
  }

  function kick(sim) {
    const p = sim.power
    const t = { ...sim.target }
    // overpowered shots climb — past the bar and it's a skied miss
    if (p > 90) t.y -= (p - 90) * 14
    // underpowered shots drop a touch
    if (p < 30) t.y += (30 - p) * 3
    const over = t.y < GOAL.bar - 6 || t.x < GOAL.x0 - 10 || t.x > GOAL.x1 + 10
    const speed = 0.62 - p * 0.0032           // flight seconds (fast = short)
    sim.flight = { t: 0, dur: Math.max(0.26, speed), from: { ...BALL0 }, to: t, over }
    // keeper decides at the moment of the kick: slow balls get read
    const readChance = 0.24 + Math.max(0, (70 - p)) * 0.008
    const trueDir = t.x < 440 ? -1 : t.x > 560 ? 1 : 0
    const guessed = Math.random() < readChance
    const dir = guessed ? trueDir : [-1, 0, 1][Math.floor(Math.random() * 3)]
    sim.keeper = { x: 500, dir, high: t.y < 300 ? Math.random() < 0.7 : Math.random() < 0.25, t: 0, guessed }
    sim.phase = 'ball'
    sfx('kick')
  }

  function resolveShot(sim) {
    const t = sim.flight.to
    let res, txt
    if (sim.flight.over) {
      res = '❌'; txt = t.y < GOAL.bar ? 'Over the bar!' : 'Wide!'
      sim.streak = 0
      sfx('miss')
    } else {
      // keeper hands position after the dive
      const kx = 500 + sim.keeper.dir * 190
      const ky = sim.keeper.high ? 250 : 360
      const reach = 96 - sim.power * 0.42 + (sim.keeper.guessed ? 18 : 0)
      const saved = Math.hypot(t.x - kx, t.y - ky) < Math.max(40, reach)
      if (saved) {
        res = '🧤'; txt = 'Saved!'
        sim.streak = 0
        sfx('save')
      } else {
        const cornerBonus = Math.round((Math.min(1, Math.abs(t.x - 500) / 270) * 30 + Math.max(0, (GOAL.line - t.y) / (GOAL.line - GOAL.bar)) * 20))
        const pts = 100 + cornerBonus + sim.streak * 25
        sim.streak += 1
        sim.score += pts
        setScore(sim.score)
        res = '⚽'; txt = sim.streak >= 3 ? `GOAL! 🔥 +${pts}` : `GOAL! +${pts}`
        sim.netRipple = 1
        sfx('goal')
      }
    }
    sim.results.push(res)
    setResults([...sim.results])
    sim.resultTxt = txt
    sim.phase = 'result'
    sim.resultWait = 0
    sim.shot += 1
    setShotNo(sim.shot)
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('end')
    save(sim.score, null)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    sim.clock += dt
    if (sim.phase === 'aim') {
      sim.aimT += dt
      const sweepX = Math.sin(sim.aimT * 1.9)
      const sweepY = Math.sin(sim.aimT * 2.7 + 1.3)
      sim.aim.x = 500 + sweepX * 275
      sim.aim.y = (GOAL.bar + 55) + (sweepY * 0.5 + 0.5) * (GOAL.line - GOAL.bar - 90)
    } else if (sim.phase === 'power') {
      sim.powerT += dt
      const c = (sim.powerT % 1.2) / 1.2
      sim.power = Math.round((c < 0.5 ? c * 2 : (1 - c) * 2) * 100)
    } else if (sim.phase === 'ball') {
      sim.flight.t += dt
      sim.keeper.t = Math.min(1, sim.keeper.t + dt / 0.34)
      if (sim.flight.t >= sim.flight.dur) resolveShot(sim)
    } else if (sim.phase === 'result') {
      sim.keeper.t = Math.min(1, sim.keeper.t + dt / 0.34)
      sim.netRipple = Math.max(0, sim.netRipple - dt * 2)
      sim.resultWait += dt
      if (sim.resultWait > 1.05) {
        if (sim.shot >= SHOTS_PER_GAME) { endGame(sim); return }
        sim.phase = 'aim'
        sim.target = null
        sim.flight = null
        sim.keeper = { x: 500, dir: 0, high: false, t: 0, guessed: false }
      }
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function drawKeeper(ctx, k, s) {
    const lean = k.dir * k.t
    const x = 500 + lean * 190
    const y = 388 - (k.high ? k.t * 66 : 0) + Math.sin(k.t * Math.PI) * -14
    const rot = lean * (k.high ? 1.15 : 0.8)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    // legs
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 9; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(-6, 26); ctx.lineTo(-14, 58); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(6, 26); ctx.lineTo(14, 58); ctx.stroke()
    // torso
    ctx.fillStyle = '#facc15'
    ctx.beginPath(); ctx.roundRect(-17, -18, 34, 48, 8); ctx.fill()
    // arms reach toward dive
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 8
    const ax = k.t > 0 && k.dir !== 0 ? 30 * Math.sign(k.dir) : 24
    const ay = k.high ? -34 : -6
    ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-ax, ay); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(12, -8); ctx.lineTo(ax, ay); ctx.stroke()
    // gloves
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath(); ctx.arc(-ax, ay, 7, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.fill()
    // head
    ctx.fillStyle = '#fcd9b6'
    ctx.beginPath(); ctx.arc(0, -30, 12, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#16a34a'
    ctx.beginPath(); ctx.arc(0, -36, 12, Math.PI, 0); ctx.fill()
    ctx.restore()
  }

  function drawBall(ctx, x, y, r) {
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#1e293b'
    ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, r * 0.18, 0, Math.PI * 2); ctx.fill()
    }
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    // stadium: dusk sky + stands + pitch
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#0f2d4a'); bg.addColorStop(0.42, '#27547a'); bg.addColorStop(0.42, '#2f7d3b'); bg.addColorStop(1, '#3f9c4c')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const s = Math.min(w / W, h / H)
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    // crowd dots
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    for (let i = 0; i < 90; i++) {
      const cx = (i * 97) % W, cy = 30 + ((i * 53) % 210)
      if (cy < H * 0.4) { ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, Math.PI * 2); ctx.fill() }
    }
    // pitch stripes
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'transparent'
      ctx.fillRect(0, 270 + i * 76, W, 76)
    }
    // penalty box lines
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(60, GOAL.line + 4); ctx.lineTo(940, GOAL.line + 4); ctx.stroke()

    // net
    const nr = sim.netRipple || 0
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + nr * 0.3})`
    ctx.lineWidth = 1
    for (let i = 0; i <= 16; i++) {
      const nx = GOAL.x0 + ((GOAL.x1 - GOAL.x0) * i) / 16
      ctx.beginPath(); ctx.moveTo(nx, GOAL.bar); ctx.lineTo(nx + Math.sin(nr * 9 + i) * nr * 7, GOAL.line); ctx.stroke()
    }
    for (let i = 0; i <= 8; i++) {
      const ny = GOAL.bar + ((GOAL.line - GOAL.bar) * i) / 8
      ctx.beginPath(); ctx.moveTo(GOAL.x0, ny); ctx.lineTo(GOAL.x1, ny + Math.sin(nr * 8 + i) * nr * 5); ctx.stroke()
    }
    // goal frame
    ctx.strokeStyle = '#f8fafc'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(GOAL.x0, GOAL.line)
    ctx.lineTo(GOAL.x0, GOAL.bar)
    ctx.lineTo(GOAL.x1, GOAL.bar)
    ctx.lineTo(GOAL.x1, GOAL.line)
    ctx.stroke()

    drawKeeper(ctx, sim.keeper, s)

    // ball
    if (sim.phase === 'ball' || sim.phase === 'result') {
      const f = sim.flight
      const t = f ? Math.min(1, f.t / f.dur) : 1
      const e = 1 - Math.pow(1 - t, 2)
      const bx = f.from.x + (f.to.x - f.from.x) * e
      const by = f.from.y + (f.to.y - f.from.y) * e - Math.sin(e * Math.PI) * 26
      drawBall(ctx, bx, by, 26 - e * 13)
    } else {
      drawBall(ctx, BALL0.x, BALL0.y, 26)
      // penalty spot shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath(); ctx.ellipse(BALL0.x, BALL0.y + 26, 30, 7, 0, 0, Math.PI * 2); ctx.fill()
    }

    // crosshair
    if (sim.phase === 'aim' || sim.phase === 'power') {
      const a = sim.phase === 'aim' ? sim.aim : sim.target
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3
      ctx.shadowColor = '#fde047'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(a.x, a.y, 22, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(a.x - 32, a.y); ctx.lineTo(a.x - 12, a.y)
      ctx.moveTo(a.x + 12, a.y); ctx.lineTo(a.x + 32, a.y)
      ctx.moveTo(a.x, a.y - 32); ctx.lineTo(a.x, a.y - 12)
      ctx.moveTo(a.x, a.y + 12); ctx.lineTo(a.x, a.y + 32)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // power meter
    if (sim.phase === 'power') {
      const mw = 320, mh = 22, mx = 500 - mw / 2, my = 590
      ctx.fillStyle = 'rgba(15,40,28,0.55)'
      ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 12); ctx.fill()
      const grad = ctx.createLinearGradient(mx, 0, mx + mw, 0)
      grad.addColorStop(0, '#4ade80'); grad.addColorStop(0.65, '#fde047'); grad.addColorStop(1, '#ef4444')
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.roundRect(mx, my, (mw * sim.power) / 100, mh, 9); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = `800 15px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`POWER ${sim.power}`, 500, my - 12)
    }

    // result banner
    if (sim.phase === 'result' && sim.resultTxt) {
      ctx.textAlign = 'center'
      ctx.fillStyle = sim.resultTxt.startsWith('GOAL') ? '#fde047' : '#f8fafc'
      ctx.font = `800 52px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(sim.resultTxt, 500, 120)
    }
    ctx.restore()
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
    setScore(0); setShotNo(0); setResults([]); resetSave()
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
        act()
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

  const goals = results.filter((r) => r === '⚽').length

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: '#0f2d4a', borderTop: '1px solid rgba(20,83,45,0.12)', borderBottom: '1px solid rgba(20,83,45,0.12)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => { e.preventDefault(); act() }}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: status === 'playing' ? 'pointer' : 'default' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#93c5fd' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#fde047' }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#93c5fd' }}>Shot </span>
              <span className="font-display font-bold text-sm text-white">{Math.min(shotNo + 1, SHOTS_PER_GAME)}/{SHOTS_PER_GAME}</span>
            </div>
            <div className="text-xs tracking-wider">{results.join('')}</div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">⚽</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Penalty Shootout</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              Two taps per penalty: the first <b style={{ color: GREEN }}>locks the moving crosshair</b>, the
              second <b style={{ color: GREEN }}>stops the power bar</b>.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              The keeper reads soft shots — corners and pace beat the gloves, but over 90 power can sail over the bar.
              Ten shots; goals build a streak bonus.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best shootout: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Step up</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} on the board, shot {Math.min(shotNo + 1, SHOTS_PER_GAME)} of {SHOTS_PER_GAME}.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">⚽🏁</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Full time!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{goals} of {SHOTS_PER_GAME} scored {results.join('')}</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best shootout</div>
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
        Tap once to lock your aim, again to set power (space works too) · corners + pace beat the keeper · 10 shots, streaks pay extra.
      </p>
    </div>
  )
}
