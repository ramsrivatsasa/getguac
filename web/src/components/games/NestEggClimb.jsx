'use client'
// Nest Egg Climb — endless jumper with a retirement goal. Your avocado starts
// at $0 and every foot climbed grows the nest egg; hit $1,000,000 and you're
// officially retired (the climb keeps going for the leaderboard). Solid
// platforms are steady index funds, blue ones drift with the market, amber
// ones are risky bets that crumble after one bounce, and gold springs are
// 401(k) matches that launch you. Fall off the bottom and the run ends.
// Desktop: ← → / A D. Mobile: hold the left or right half of the screen.
// Sim in refs + rAF; React state is HUD only; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-nestegg-best-v1'

const GRAV = 1500
const JUMP_V = 640
const SPRING_V = 1080
const MOVE_V = 330
const PLAT_W = 70
const PLAT_H = 14
const DOLLARS_PER_PX = 150
const GOAL = 1_000_000

const MILESTONES = [
  { at: 100_000, msg: '$100k saved! Compound interest is waking up 📈' },
  { at: 250_000, msg: '$250k! A quarter of the way to freedom 🎉' },
  { at: 500_000, msg: 'Half a million! The nest egg is real 🪺' },
  { at: 750_000, msg: '$750k — you can smell the beach 🌊' },
  { at: GOAL, msg: '$1,000,000 — RETIRED! 🏖️ Keep climbing for glory' },
]

function makePlatform(sim, y) {
  const { w } = sim.view
  const p = {
    x: 20 + Math.random() * (w - PLAT_W - 40), y,
    type: 'solid', vx: 0, gone: false, squish: 0,
    spring: Math.random() < 0.09,
  }
  const alt = sim.altitude(y)
  const hard = Math.min(0.55, alt / 9000) // more tricky platforms higher up
  const roll = Math.random()
  if (roll < hard * 0.5) { p.type = 'crumble'; p.spring = false }
  else if (roll < hard) { p.type = 'moving'; p.vx = (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 80) }
  return p
}

export default function NestEggClimb() {
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
  const [dollars, setDollars] = useState(0)
  const [retired, setRetired] = useState(false)
  const [toast, setToast] = useState('')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('nestegg')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2100)
  }

  const sfx = (name) => {
    switch (name) {
      case 'boing': tone({ f0: 240, f1: 480, t: 0.12, type: 'sine', g: 0.12 }); break
      case 'spring': tone({ f0: 300, f1: 900, t: 0.22, type: 'square', g: 0.12 }); break
      case 'crumble': tone({ f0: 200, f1: 80, t: 0.18, type: 'sawtooth', g: 0.1 }); break
      case 'milestone': [523, 659, 784].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.14, at: i * 0.08 })); break
      case 'retire': [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f0: f, t: 0.16, g: 0.16, at: i * 0.1 })); break
      case 'fall': [330, 262, 196, 131].forEach((f, i) => tone({ f0: f, f1: f * 0.9, t: 0.2, type: 'triangle', g: 0.14, at: i * 0.12 })); break
      default: break
    }
  }

  const freshSim = (w, h) => {
    const sim = {
      view: { w, h },
      player: { x: w / 2, y: h - 120, vx: 0, vy: -JUMP_V, face: 1 },
      platforms: [],
      parts: [],
      cameraY: 0, // world y of the top of the view
      startY: h - 100,
      maxDollars: 0, milestoneIdx: 0,
      clock: 0,
      altitude(y) { return Math.max(0, this.startY - y) },
    }
    // base platform right under the player + a ladder of starters
    sim.platforms.push({ x: w / 2 - PLAT_W / 2, y: h - 90, type: 'solid', vx: 0, gone: false, squish: 0, spring: false })
    for (let y = h - 170; y > -200; y -= 62 + Math.random() * 40) {
      sim.platforms.push(makePlatform(sim, y))
    }
    return sim
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('fall')
    save(sim.maxDollars, null)
    submitBest(sim.maxDollars)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    const { w, h } = sim.view
    sim.clock += dt
    const p = sim.player

    const kv = (keysRef.current.r ? 1 : 0) - (keysRef.current.l ? 1 : 0)
    p.vx = kv * MOVE_V
    if (kv !== 0) p.face = kv
    p.x += p.vx * dt
    if (p.x < -14) p.x += w + 28
    if (p.x > w + 14) p.x -= w + 28

    const prevY = p.y
    p.vy += GRAV * dt
    p.y += p.vy * dt

    // land only when falling and crossing a platform top this frame
    if (p.vy > 0) {
      for (const pl of sim.platforms) {
        if (pl.gone) continue
        const top = pl.y
        if (prevY + 16 <= top && p.y + 16 >= top && p.x > pl.x - 12 && p.x < pl.x + PLAT_W + 12) {
          if (pl.type === 'crumble') {
            pl.gone = true
            sfx('crumble')
            for (let i = 0; i < 6; i++) sim.parts.push({ x: pl.x + Math.random() * PLAT_W, y: pl.y, vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 120, life: 0.5, color: '#D9A514' })
          }
          p.y = top - 16
          p.vy = pl.spring ? -SPRING_V : -JUMP_V
          pl.squish = 0.18
          sfx(pl.spring ? 'spring' : 'boing')
          if (pl.spring) showToast('401(k) match! 🚀')
          break
        }
      }
    }

    // camera follows upward only
    const target = p.y - h * 0.42
    if (target < sim.cameraY) sim.cameraY = target

    // moving platforms
    for (const pl of sim.platforms) {
      if (pl.type === 'moving') {
        pl.x += pl.vx * dt
        if (pl.x < 6) { pl.x = 6; pl.vx = Math.abs(pl.vx) }
        if (pl.x > w - PLAT_W - 6) { pl.x = w - PLAT_W - 6; pl.vx = -Math.abs(pl.vx) }
      }
      if (pl.squish > 0) pl.squish -= dt
    }

    // recycle platforms
    sim.platforms = sim.platforms.filter((pl) => pl.y < sim.cameraY + h + 60)
    let topY = Infinity
    for (const pl of sim.platforms) if (pl.y < topY) topY = pl.y
    while (topY > sim.cameraY - 120) {
      const ny = topY - (58 + Math.random() * 46)
      sim.platforms.push(makePlatform(sim, ny))
      topY = ny
    }

    // dollars from altitude
    const d = Math.round(sim.altitude(p.y) * DOLLARS_PER_PX)
    if (d > sim.maxDollars) {
      sim.maxDollars = d
      setDollars(d)
      while (sim.milestoneIdx < MILESTONES.length && d >= MILESTONES[sim.milestoneIdx].at) {
        const m = MILESTONES[sim.milestoneIdx]
        showToast(m.msg)
        sfx(m.at >= GOAL ? 'retire' : 'milestone')
        if (m.at >= GOAL) setRetired(true)
        sim.milestoneIdx += 1
      }
    }

    // particles
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const pt = sim.parts[i]
      pt.life -= dt
      if (pt.life <= 0) { sim.parts.splice(i, 1); continue }
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.vy += 700 * dt
    }

    // fell off the bottom
    if (p.y > sim.cameraY + h + 40) endGame(sim)
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function skyColors(frac) {
    // dawn greens → daylight blue → high-altitude indigo
    const stops = [
      [214, 244, 222], [186, 230, 253], [147, 197, 253], [129, 140, 248],
    ]
    const t = Math.min(0.999, frac) * (stops.length - 1)
    const i = Math.floor(t), k = t - i
    const mix = (a, b) => Math.round(a + (b - a) * k)
    const c0 = stops[i], c1 = stops[Math.min(i + 1, stops.length - 1)]
    return `rgb(${mix(c0[0], c1[0])},${mix(c0[1], c1[1])},${mix(c0[2], c1[2])})`
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const frac = Math.min(1, sim.maxDollars / GOAL)
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, skyColors(Math.min(1, frac + 0.15)))
    bg.addColorStop(1, skyColors(frac))
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // drifting clouds (parallax on camera)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 6; i++) {
      const cy = ((i * 260 - sim.cameraY * 0.35) % (h + 160)) - 80
      const cx = ((i * 173) % w)
      ctx.beginPath()
      ctx.ellipse(cx, cy, 46, 14, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 26, cy - 8, 30, 12, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // goal line at $1M altitude
    const goalWorldY = sim.startY - GOAL / DOLLARS_PER_PX
    const goalScreen = goalWorldY - sim.cameraY
    if (goalScreen > -20 && goalScreen < h + 20) {
      ctx.setLineDash([10, 8])
      ctx.strokeStyle = 'rgba(217,165,20,0.85)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(0, goalScreen); ctx.lineTo(w, goalScreen); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(217,165,20,1)'
      ctx.font = "800 15px 'Bricolage Grotesque', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText('🏖️ RETIREMENT — $1,000,000', w / 2, goalScreen - 10)
    }

    // platforms
    for (const pl of sim.platforms) {
      if (pl.gone) continue
      const y = pl.y - sim.cameraY
      if (y < -30 || y > h + 30) continue
      const squishY = pl.squish > 0 ? 3 : 0
      let c0 = '#34D399', c1 = '#059669'
      if (pl.type === 'moving') { c0 = '#60A5FA'; c1 = '#2563EB' }
      if (pl.type === 'crumble') { c0 = '#FCD34D'; c1 = '#D97706' }
      const g = ctx.createLinearGradient(0, y, 0, y + PLAT_H)
      g.addColorStop(0, c0); g.addColorStop(1, c1)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.roundRect(pl.x, y + squishY, PLAT_W, PLAT_H - squishY, 7)
      ctx.fill()
      if (pl.type === 'crumble') {
        ctx.strokeStyle = 'rgba(120,53,15,0.6)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(pl.x + PLAT_W * 0.3, y + 2); ctx.lineTo(pl.x + PLAT_W * 0.42, y + PLAT_H - 3)
        ctx.moveTo(pl.x + PLAT_W * 0.66, y + 1); ctx.lineTo(pl.x + PLAT_W * 0.58, y + PLAT_H - 4)
        ctx.stroke()
      }
      if (pl.spring) {
        ctx.fillStyle = '#FBBF24'
        ctx.beginPath(); ctx.arc(pl.x + PLAT_W / 2, y - 7, 7, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#92400E'
        ctx.font = '700 9px system-ui'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('$', pl.x + PLAT_W / 2, y - 6.5)
      }
    }

    // player — bouncing avocado
    const p = sim.player
    const py = p.y - sim.cameraY
    ctx.save()
    ctx.translate(p.x, py)
    ctx.scale(p.face, 1)
    ctx.font = '30px system-ui'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🥑', 0, 0)
    ctx.restore()

    // particles
    for (const pt of sim.parts) {
      ctx.globalAlpha = Math.max(0, pt.life * 2)
      ctx.fillStyle = pt.color
      ctx.fillRect(pt.x - 2, (pt.y - sim.cameraY) - 2, 4, 4)
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
    const { w, h } = sizeRef.current
    simRef.current = freshSim(w, h)
    setDollars(0); setRetired(false); resetSave()
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

  // input: keys + touch halves
  useEffect(() => {
    const down = (e) => {
      if (statusRef.current !== 'playing') return
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); keysRef.current.l = true }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); keysRef.current.r = true }
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

  const touchSide = (e, on) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const left = e.clientX - rect.left < rect.width / 2
    if (on) {
      keysRef.current.l = left
      keysRef.current.r = !left
    } else {
      keysRef.current.l = false
      keysRef.current.r = false
    }
  }

  // canvas sizing
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
        style={{ height: 'clamp(430px, calc(100svh - 240px), 720px)', minHeight: 430, background: '#d6f4de', borderTop: '1px solid rgba(20,83,45,0.12)', borderBottom: '1px solid rgba(20,83,45,0.12)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => touchSide(e, true)}
          onPointerMove={(e) => { if (e.buttons > 0) touchSide(e, true) }}
          onPointerUp={(e) => touchSide(e, false)}
          onPointerCancel={(e) => touchSide(e, false)}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Nest egg </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#065f46' }}>${fmt(dollars)}</span>
            </div>
            {retired && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>RETIRED 🏖️</span>}
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full text-center" style={{ background: INK, color: '#fff', pointerEvents: 'none', maxWidth: '90%' }}>{toast}</div>
        )}

        {status === 'idle' && (
          <Overlay>
            <div className="text-4xl mb-1">🪺</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Nest Egg Climb</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              Bounce your way from $0 to a <b style={{ color: GREEN }}>$1,000,000 retirement</b>. Green platforms are steady
              funds, blue ones move with the market, cracked amber ones are risky bets — they crumble.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Gold springs are 401(k) matches: free launch upward. Steer with ← → or hold either side of the screen. Don&apos;t fall!
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best nest egg: ${fmt(best)}</div>}
            <PrimaryButton onClick={start}>Start climbing</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>${fmt(dollars)} in the nest egg — it compounds while you rest.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay>
            <div className="text-3xl mb-1">{retired ? '🏖️🎉' : '🪺💨'}</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
              {retired ? 'Retired in style!' : 'The market got you!'}
            </div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>${fmt(dollars)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>final nest egg</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{Math.min(100, Math.round((dollars / GOAL) * 100))}%</div>
                <div className="text-[11px]" style={{ color: FAINT }}>of the $1M goal</div>
              </div>
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>${fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best nest egg</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Climb again</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        ← → or A/D to steer, or hold either side of the screen · edges wrap around · cracked platforms crumble · gold springs launch you toward the $1M line.
      </p>
    </div>
  )
}
