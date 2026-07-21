'use client'
// Dream House Stack — crane-stacker with a home-ownership goal. A floor of
// your future house swings from the crane; tap / click / space to drop it on
// the stack. Any overhang is sliced away, so sloppy drops shrink every floor
// after them — a perfect drop wins width back. Land 20 floors and the dream
// house is officially built (keep stacking the penthouse for score).
// Sim in refs + rAF; React state is HUD only; synthesized sound.
//
// This game owns CHAPTER 5 of the shared financial journey — 🏡 Buy a house
// (lib/financialJourney). It opens with that chapter's real lesson (20% down to
// skip PMI, payment near a third of take-home), its build milestones are the
// chapter's stages, and the 20th floor clears it. Crane speed rides the
// auto-learning engine (lib/adaptiveDifficulty).
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'
import { roundById } from '../../lib/financialJourney'
import { useAdaptive, AdaptiveChip, RoundIntro, ChapterComplete, JourneyBar } from './journeyKit'

const BEST_KEY = 'gg-house-best-v1'

// The journey chapter this game teaches. The 20-floor house stays the goal —
// the auto-learning engine tunes how fast the crane swings, not the finish line.
const CHAPTER = roundById('house')
const CHAPTER_STAGES = 4      // milestones at 5 / 10 / 15 / 20 floors
const CHAPTER_PAR = 90

const FLOOR_H = 34
const START_W = 190
const PERFECT_TOL = 7
const HOUSE_DONE = 20

const MILESTONES = {
  5: 'Down payment saved! 💰',
  10: 'Framing done — halfway home 🔨',
  15: 'Kitchen fitted 🍳',
  [HOUSE_DONE]: 'DREAM HOUSE BUILT! 🏡 Keep stacking the penthouse',
  25: 'Penthouse level 🍾',
  30: 'Roof garden growing 🌱',
}

const WALL_COLORS = [
  ['#FDE68A', '#D97706'], // warm stucco
  ['#FCA5A5', '#B91C1C'], // brick
  ['#BFDBFE', '#2563EB'], // blue siding
  ['#DDD6FE', '#7C3AED'], // lilac
  ['#BBF7D0', '#15803D'], // sage
]

const freshSim = (w, h) => ({
  view: { w, h },
  floors: [{ x: w / 2 - START_W / 2, w: START_W }], // foundation
  swing: { w: START_W, t: 0, dropping: false, x: 0, y: 0, vy: 0 },
  debris: [], parts: [],
  cameraY: 0, // how far the world has been pushed down (px)
  speed: 1.15,
  score: 0, perfects: 0, combo: 0,
  clock: 0,
})

export default function DreamHouseStack() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const toastTimer = useRef(null)

  const [status, setStatus] = useState('idle')
  const [floorsBuilt, setFloorsBuilt] = useState(0)
  const [perfects, setPerfects] = useState(0)
  const [toast, setToast] = useState('')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('house')
  // Auto-learning difficulty for this chapter.
  const { diff, diffRef, record, note } = useAdaptive('house')
  const stage = Math.max(1, Math.min(CHAPTER_STAGES, Math.floor(floorsBuilt / 5) + 1))

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  // Fold the build into the skill profile: did the house top out, how fast,
  // and how clean were the drops.
  const learn = (cleared) => {
    const sim = simRef.current
    if (!sim) return
    record({
      cleared,
      seconds: sim.t0 ? (performance.now() - sim.t0) / 1000 : 0,
      par: CHAPTER_PAR,
      livesLost: 0,
      accuracy: sim.score > 0 ? Math.min(1, sim.perfects / sim.score) : null,
    })
  }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1900)
  }

  const sfx = (name) => {
    switch (name) {
      case 'drop': tone({ f0: 500, f1: 200, t: 0.12, type: 'triangle', g: 0.09 }); break
      case 'land': tone({ f0: 140, f1: 90, t: 0.1, type: 'square', g: 0.15 }); break
      case 'slice': tone({ f0: 320, f1: 120, t: 0.18, type: 'sawtooth', g: 0.1 }); break
      case 'perfect': [660, 880, 1100].forEach((f, i) => tone({ f0: f, t: 0.09, g: 0.14, at: i * 0.06 })); break
      case 'milestone': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.15, at: i * 0.08 })); break
      case 'crash': [300, 200, 120].forEach((f, i) => tone({ f0: f, f1: f * 0.6, t: 0.22, type: 'sawtooth', g: 0.16, at: i * 0.1 })); break
      default: break
    }
  }

  // stack top position on screen: foundation sits near the bottom
  const stackTopScreenY = (sim) => {
    const { h } = sim.view
    return h - 60 - sim.floors.length * FLOOR_H + sim.cameraY
  }

  const dropFloor = () => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing' || sim.swing.dropping) return
    const { w } = sim.view
    const amp = (w - sim.swing.w) / 2 - 8
    sim.swing.x = w / 2 + Math.sin(sim.swing.t) * Math.max(30, amp) - sim.swing.w / 2
    sim.swing.y = 74
    sim.swing.vy = 0
    sim.swing.dropping = true
    sfx('drop')
  }

  function landFloor(sim) {
    const top = sim.floors[sim.floors.length - 1]
    const topX = top.x, topW = top.w
    const newL = Math.max(sim.swing.x, topX)
    const newR = Math.min(sim.swing.x + sim.swing.w, topX + topW)
    const overlap = newR - newL
    if (overlap <= 10) {
      // whole floor missed — it tumbles away, house is done
      sim.debris.push({ x: sim.swing.x, w: sim.swing.w, y: stackTopScreenY(sim) - FLOOR_H, vy: -60, vr: (Math.random() - 0.5) * 4, rot: 0 })
      sim.swing.dropping = false
      sfx('crash')
      endGame(sim)
      return
    }
    const off = Math.abs(sim.swing.x - topX)
    const perfect = off <= PERFECT_TOL && Math.abs(sim.swing.w - topW) <= PERFECT_TOL + 2
    let placedX = newL, placedW = overlap
    if (perfect) {
      placedX = topX
      placedW = Math.min(START_W, topW + 6) // perfect drops win width back
      sim.perfects += 1
      sim.combo += 1
      setPerfects(sim.perfects)
      sfx('perfect')
      showToast(sim.combo >= 2 ? `Perfect ×${sim.combo}! 🎯` : 'Perfect! 🎯')
      for (let i = 0; i < 12; i++) {
        sim.parts.push({ x: placedX + Math.random() * placedW, y: stackTopScreenY(sim) - FLOOR_H, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.6, color: '#FBBF24' })
      }
    } else {
      sim.combo = 0
      // slice the overhang(s)
      if (sim.swing.x < newL) sim.debris.push({ x: sim.swing.x, w: newL - sim.swing.x, y: stackTopScreenY(sim) - FLOOR_H, vy: 20, vr: -3, rot: 0 })
      if (sim.swing.x + sim.swing.w > newR) sim.debris.push({ x: newR, w: sim.swing.x + sim.swing.w - newR, y: stackTopScreenY(sim) - FLOOR_H, vy: 20, vr: 3, rot: 0 })
      if (overlap < sim.swing.w - 1) sfx('slice')
      else sfx('land')
    }
    sim.floors.push({ x: placedX, w: placedW })
    sim.swing.w = placedW
    sim.swing.dropping = false
    sim.swing.t = Math.random() * Math.PI * 2
    sim.speed = Math.min(2.6, sim.speed + 0.045)
    sim.score = sim.floors.length - 1
    setFloorsBuilt(sim.score)
    const m = MILESTONES[sim.score]
    if (m) { showToast(m); sfx('milestone') }
    // Topped out the dream house — chapter cleared.
    if (sim.score >= HOUSE_DONE && !sim.won) { sim.won = true; winChapter(sim); return }
  }

  const endGame = (sim) => {
    learn(sim.score >= HOUSE_DONE)
    save(sim.score + sim.perfects, null) // floors + perfect bonus
    submitBest(sim.score)
    setPhase('over')
  }

  // 20 floors up — the dream house is built. Stacking can carry on afterwards
  // for the penthouse score.
  const winChapter = (sim) => {
    cancelAnimationFrame(rafRef.current)
    learn(true)
    sfx('milestone')
    save(sim.score + sim.perfects, null)
    submitBest(sim.score)
    setPhase('won')
  }

  function step(sim, dt) {
    sim.clock += dt
    if (!sim.swing.dropping) {
      sim.swing.t += dt * sim.speed
    } else {
      sim.swing.vy += 2100 * dt
      sim.swing.y += sim.swing.vy * dt
      const targetY = stackTopScreenY(sim) - FLOOR_H
      if (sim.swing.y >= targetY) {
        sim.swing.y = targetY
        landFloor(sim)
      }
    }

    // camera keeps the stack top around 55% height
    const want = Math.max(0, (sim.view.h * 0.45) - (sim.view.h - 60 - sim.floors.length * FLOOR_H))
    sim.cameraY += (want - sim.cameraY) * Math.min(1, dt * 4)

    for (let i = sim.debris.length - 1; i >= 0; i--) {
      const d = sim.debris[i]
      d.vy += 1500 * dt
      d.y += d.vy * dt
      d.rot += d.vr * dt
      if (d.y > sim.view.h + 60) sim.debris.splice(i, 1)
    }
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i]
      p.life -= dt
      if (p.life <= 0) { sim.parts.splice(i, 1); continue }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 800 * dt
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function drawFloorBlock(ctx, x, y, w, idx, done) {
    const [wall, trim] = WALL_COLORS[idx % WALL_COLORS.length]
    ctx.fillStyle = wall
    ctx.beginPath()
    ctx.roundRect(x, y, w, FLOOR_H - 2, 4)
    ctx.fill()
    ctx.strokeStyle = trim
    ctx.lineWidth = 2
    ctx.stroke()
    // windows
    const nWin = Math.max(1, Math.floor(w / 44))
    const winW = 16, winH = 14
    for (let i = 0; i < nWin; i++) {
      const wx = x + ((i + 0.5) * w) / nWin - winW / 2
      ctx.fillStyle = done ? '#FEF3C7' : '#93C5FD'
      ctx.fillRect(wx, y + (FLOOR_H - 2 - winH) / 2, winW, winH)
      ctx.strokeStyle = trim
      ctx.lineWidth = 1
      ctx.strokeRect(wx, y + (FLOOR_H - 2 - winH) / 2, winW, winH)
    }
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const frac = Math.min(1, sim.floors.length / (HOUSE_DONE + 6))
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, frac < 0.5 ? '#bae6fd' : '#a5b4fc')
    bg.addColorStop(1, '#fde68a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // sun
    ctx.fillStyle = 'rgba(253,224,71,0.9)'
    ctx.beginPath(); ctx.arc(w * 0.82, 90 + sim.cameraY * 0.15, 34, 0, Math.PI * 2); ctx.fill()

    // distant skyline
    ctx.fillStyle = 'rgba(51,65,85,0.25)'
    for (let i = 0; i < 8; i++) {
      const bw = 60 + (i * 37) % 50
      const bh = 60 + (i * 53) % 110
      ctx.fillRect((i * (w / 7.5)) % w, h - 60 - bh + sim.cameraY * 0.3, bw, bh + 100)
    }

    // ground
    ctx.fillStyle = '#4d7c0f'
    ctx.fillRect(0, h - 60 + sim.cameraY, w, 80)
    ctx.fillStyle = '#65A30D'
    ctx.fillRect(0, h - 60 + sim.cameraY, w, 8)

    // floors
    const doneHouse = sim.floors.length - 1 >= HOUSE_DONE
    for (let i = 0; i < sim.floors.length; i++) {
      const f = sim.floors[i]
      const y = h - 60 - (i + 1) * FLOOR_H + sim.cameraY
      if (y > h + 20 || y < -FLOOR_H * 2) continue
      if (i === 0) {
        ctx.fillStyle = '#78716C'
        ctx.beginPath(); ctx.roundRect(f.x, y, f.w, FLOOR_H - 2, 4); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(f.x, y, f.w, 5)
      } else {
        drawFloorBlock(ctx, f.x, y, f.w, i, doneHouse)
      }
    }
    // roof once the dream house is done
    if (doneHouse) {
      const top = sim.floors[sim.floors.length - 1]
      const y = h - 60 - sim.floors.length * FLOOR_H + sim.cameraY
      ctx.fillStyle = '#B91C1C'
      ctx.beginPath()
      ctx.moveTo(top.x - 10, y)
      ctx.lineTo(top.x + top.w / 2, y - 26)
      ctx.lineTo(top.x + top.w + 10, y)
      ctx.closePath()
      ctx.fill()
    }

    // crane + swinging floor
    if (statusRef.current === 'playing') {
      const amp = (w - sim.swing.w) / 2 - 8
      const sx = sim.swing.dropping ? sim.swing.x : w / 2 + Math.sin(sim.swing.t) * Math.max(30, amp) - sim.swing.w / 2
      const sy = sim.swing.dropping ? sim.swing.y : 74
      // cable
      ctx.strokeStyle = '#57534E'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.lineTo(sx + sim.swing.w / 2, sy)
      ctx.stroke()
      drawFloorBlock(ctx, sx, sy, sim.swing.w, sim.floors.length, false)
      // drop guide
      if (!sim.swing.dropping) {
        ctx.setLineDash([4, 6])
        ctx.strokeStyle = 'rgba(87,83,78,0.4)'
        ctx.beginPath()
        ctx.moveTo(sx, sy + FLOOR_H); ctx.lineTo(sx, stackTopScreenY(sim))
        ctx.moveTo(sx + sim.swing.w, sy + FLOOR_H); ctx.lineTo(sx + sim.swing.w, stackTopScreenY(sim))
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // debris
    for (const d of sim.debris) {
      ctx.save()
      ctx.translate(d.x + d.w / 2, d.y + FLOOR_H / 2)
      ctx.rotate(d.rot)
      ctx.fillStyle = '#D6D3D1'
      ctx.fillRect(-d.w / 2, -FLOOR_H / 2, d.w, FLOOR_H - 4)
      ctx.restore()
    }

    // particles
    for (const p of sim.parts) {
      ctx.globalAlpha = Math.max(0, p.life * 1.8)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
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
    if (statusRef.current !== 'idle') draw(sim)
    if (statusRef.current === 'playing') rafRef.current = requestAnimationFrame(loop)
  }

  // Open the chapter with its lesson card; the crane starts from there.
  const start = () => { resetSave(); setPhase('intro') }

  const beginPlay = () => {
    const { w, h } = sizeRef.current
    const sim = freshSim(w, h)
    sim.t0 = performance.now()
    // Auto-learning difficulty: the crane swings faster for builders the
    // engine has watched land clean drops.
    sim.speed = 1.15 * Math.max(0.85, Math.min(1.4, diffRef.current.mul))
    simRef.current = sim
    setFloorsBuilt(0); setPerfects(0)
    setPhase('playing')
    lastRef.current = performance.now()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  // Chapter cleared but the penthouse is still up for grabs.
  const keepStacking = () => {
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
        dropFloor()
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
      if (simRef.current) simRef.current.view = { w, h }
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
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: '#bae6fd' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => { e.preventDefault(); dropFloor() }}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: status === 'playing' ? 'pointer' : 'default' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#44403c' }}>Floors </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#065f46' }}>{floorsBuilt}</span>
              <span className="text-[11px] font-semibold" style={{ color: '#78716c' }}> / {HOUSE_DONE} 🏡</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#78716c' }}>Perfects </span>
              <span className="font-display font-bold text-sm" style={{ color: '#D97706' }}>{perfects}</span>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'playing' && (
          <JourneyBar round={CHAPTER} banked={floorsBuilt} target={HOUSE_DONE} stage={stage} stages={CHAPTER_STAGES} top={44} unit="floors" />
        )}

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full text-center" style={{ top: 120, background: INK, color: '#fff', pointerEvents: 'none', maxWidth: '90%' }}>{toast}</div>
        )}

        {status === 'idle' && (
          <Overlay>
            <div className="text-4xl mb-1">🏡</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Dream House Stack</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              The crane swings a floor of your future house — <b style={{ color: GREEN }}>drop it square on the stack</b>.
              Overhang gets sliced off, so every sloppy drop makes the next floor smaller.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Perfect drops win width back. Stack {HOUSE_DONE} floors and the dream house is yours — then keep going for the penthouse.
            </p>
            <div className="text-[11px] font-bold px-3 py-1 rounded-full inline-block mb-2"
              style={{ background: `${CHAPTER.color}1a`, color: CHAPTER.dark }}>
              CHAPTER {CHAPTER.n} OF THE MONEY JOURNEY · {CHAPTER.emoji} {CHAPTER.title}
            </div>
            {best > 0 && <div className="text-xs font-bold mb-2" style={{ color: AMBER }}>Best build: {fmt(best)} floors</div>}
            <AdaptiveChip diff={diff} note={note} compact />
            <div className="mt-3"><PrimaryButton onClick={start}>Start building</PrimaryButton></div>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'intro' && (
          <RoundIntro round={CHAPTER} target={HOUSE_DONE} stages={CHAPTER_STAGES} diff={diff} note={note}
            goalText={`Stack all ${HOUSE_DONE} floors to finish the dream house.`}
            onStart={beginPlay} cta="Start building" />
        )}

        {status === 'won' && (
          <ChapterComplete round={CHAPTER} banked={floorsBuilt} unit=" floors" caption="built — dream house done 🏡"
            diff={diff} note={note} onReplay={keepStacking} replayLabel="Keep stacking 🍾" />
        )}

        {status === 'paused' && (
          <Overlay maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{floorsBuilt} floors up — the crane can wait.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay>
            <div className="text-3xl mb-1">{floorsBuilt >= HOUSE_DONE ? '🏡🎉' : '🏗️💥'}</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
              {floorsBuilt >= HOUSE_DONE ? 'Dream house — built!' : 'The floor slipped!'}
            </div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{floorsBuilt}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>floors stacked</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: '#D97706' }}>{perfects}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>perfect drops</div>
              </div>
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best floors</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best!</div>}
            <SaveScoreLine res={saveRes} />
            <AdaptiveChip diff={diff} note={note} compact />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Build again</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Tap, click or press space to drop the swinging floor · overhang gets sliced off · perfect drops restore width · {HOUSE_DONE} floors = dream house.
      </p>
    </div>
  )
}
