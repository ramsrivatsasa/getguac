'use client'
// Space Rocks — classic starship asteroid blaster. Rotate, thrust and shoot;
// big rocks split into mediums, mediums into smalls, and a flying saucer
// drops by to make trouble. Screen wraps on every edge, arcade-style.
// Desktop: ← → rotate, ↑ thrust, space to fire. Mobile: on-screen buttons.
// Sim in refs + rAF, React state only for HUD; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-rocks-best-v1'

const ROCK_TIERS = [
  { r: 46, score: 20, speed: 55 },   // large
  { r: 26, score: 50, speed: 95 },   // medium
  { r: 14, score: 100, speed: 140 }, // small
]
const BULLET_SPEED = 470
const BULLET_LIFE = 1.15
const FIRE_COOLDOWN = 0.22
const TURN_RATE = 4.2
const THRUST = 340
const FRICTION = 0.55 // exponential damping per second
const RESPAWN_SHIELD = 2.4
const SAUCER_EVERY = 22

function makeRockShape() {
  const pts = []
  const n = 9 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    pts.push({ a: (i / n) * Math.PI * 2, m: 0.72 + Math.random() * 0.36 })
  }
  return pts
}

function spawnRock(sim, tier, x, y) {
  const t = ROCK_TIERS[tier]
  const a = Math.random() * Math.PI * 2
  const sp = t.speed * (0.7 + Math.random() * 0.6) * (1 + (sim.wave - 1) * 0.08)
  sim.rocks.push({
    tier, x, y,
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    rot: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 1.6,
    shape: makeRockShape(),
  })
}

function spawnWave(sim, w, h) {
  const n = Math.min(9, 3 + sim.wave)
  for (let i = 0; i < n; i++) {
    // spawn along the edges so the ship's center stays safe
    const onX = Math.random() < 0.5
    const x = onX ? Math.random() * w : (Math.random() < 0.5 ? 0 : w)
    const y = onX ? (Math.random() < 0.5 ? 0 : h) : Math.random() * h
    spawnRock(sim, 0, x, y)
  }
}

const freshShip = (w, h) => ({
  x: w / 2, y: h / 2, vx: 0, vy: 0, ang: -Math.PI / 2, shield: RESPAWN_SHIELD,
})

const freshSim = (w, h) => ({
  ship: freshShip(w, h),
  rocks: [], bullets: [], enemyBullets: [], parts: [],
  saucer: null, saucerT: SAUCER_EVERY * 0.6,
  keys: { l: false, r: false, t: false, f: false },
  cooldown: 0, clock: 0,
  wave: 1, lives: 3, score: 0, waveClearT: 0,
  stars: Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.4, tw: Math.random() * 6 })),
})

export default function SpaceRocks() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const toastTimer = useRef(null)

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)
  const [toast, setToast] = useState('')
  const [touchUI, setTouchUI] = useState(false)

  useEffect(() => {
    try { setTouchUI(window.matchMedia('(pointer: coarse)').matches) } catch {}
  }, [])

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('rocks')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1400)
  }

  const sfx = (name) => {
    switch (name) {
      case 'fire': tone({ f0: 620, f1: 190, t: 0.09, type: 'square', g: 0.07 }); break
      case 'thrust': tone({ f0: 70, f1: 55, t: 0.08, type: 'sawtooth', g: 0.05 }); break
      case 'boom0': tone({ f0: 110, f1: 40, t: 0.4, type: 'sawtooth', g: 0.18 }); break
      case 'boom1': tone({ f0: 180, f1: 60, t: 0.3, type: 'sawtooth', g: 0.15 }); break
      case 'boom2': tone({ f0: 280, f1: 90, t: 0.22, type: 'sawtooth', g: 0.12 }); break
      case 'saucer': tone({ f0: 480, f1: 640, t: 0.18, type: 'triangle', g: 0.08 }); break
      case 'die': [340, 220, 120, 60].forEach((f, i) => tone({ f0: f, f1: f * 0.6, t: 0.22, type: 'sawtooth', g: 0.16, at: i * 0.12 })); break
      case 'wave': [392, 523, 659].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.13, at: i * 0.08 })); break
      default: break
    }
  }

  function burst(sim, x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 190
      sim.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, color })
    }
  }

  const wrap = (o, w, h, m = 50) => {
    if (o.x < -m) o.x += w + m * 2
    if (o.x > w + m) o.x -= w + m * 2
    if (o.y < -m) o.y += h + m * 2
    if (o.y > h + m) o.y -= h + m * 2
  }

  function breakRock(sim, i, byPlayer) {
    const rk = sim.rocks[i]
    sim.rocks.splice(i, 1)
    sfx(`boom${rk.tier}`)
    burst(sim, rk.x, rk.y, 12 - rk.tier * 3, '#cbd5e1')
    if (byPlayer) {
      sim.score += ROCK_TIERS[rk.tier].score
      setScore(sim.score)
    }
    if (rk.tier < 2) {
      spawnRock(sim, rk.tier + 1, rk.x, rk.y)
      spawnRock(sim, rk.tier + 1, rk.x, rk.y)
    }
  }

  function killShip(sim) {
    sfx('die')
    burst(sim, sim.ship.x, sim.ship.y, 26, '#fca5a5')
    sim.lives -= 1
    setLives(sim.lives)
    if (sim.lives <= 0) {
      endGame(sim)
      return
    }
    const { w, h } = sizeRef.current
    sim.ship = freshShip(w, h)
    showToast('Ship down! 🚀')
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    save(sim.score, sim.wave)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  // ─── tick ─────────────────────────────────────────────────────────────────
  function step(sim, dt) {
    const { w, h } = sizeRef.current
    sim.clock += dt
    const sh = sim.ship

    // controls
    if (sim.keys.l) sh.ang -= TURN_RATE * dt
    if (sim.keys.r) sh.ang += TURN_RATE * dt
    if (sim.keys.t) {
      sh.vx += Math.cos(sh.ang) * THRUST * dt
      sh.vy += Math.sin(sh.ang) * THRUST * dt
      if (Math.floor(sim.clock * 14) % 2 === 0) sfx('thrust')
      // exhaust
      sim.parts.push({
        x: sh.x - Math.cos(sh.ang) * 14, y: sh.y - Math.sin(sh.ang) * 14,
        vx: -Math.cos(sh.ang) * 130 + (Math.random() - 0.5) * 50,
        vy: -Math.sin(sh.ang) * 130 + (Math.random() - 0.5) * 50,
        life: 0.25, color: '#fbbf24',
      })
    }
    sim.cooldown -= dt
    if (sim.keys.f && sim.cooldown <= 0 && sim.bullets.length < 5) {
      sim.bullets.push({
        x: sh.x + Math.cos(sh.ang) * 16, y: sh.y + Math.sin(sh.ang) * 16,
        vx: Math.cos(sh.ang) * BULLET_SPEED + sh.vx, vy: Math.sin(sh.ang) * BULLET_SPEED + sh.vy,
        life: BULLET_LIFE,
      })
      sim.cooldown = FIRE_COOLDOWN
      sfx('fire')
    }

    const damp = Math.exp(-FRICTION * dt)
    sh.vx *= damp; sh.vy *= damp
    sh.x += sh.vx * dt; sh.y += sh.vy * dt
    wrap(sh, w, h, 24)
    if (sh.shield > 0) sh.shield -= dt

    // rocks
    for (const rk of sim.rocks) {
      rk.x += rk.vx * dt; rk.y += rk.vy * dt
      rk.rot += rk.spin * dt
      wrap(rk, w, h)
    }

    // bullets
    for (const arr of [sim.bullets, sim.enemyBullets]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const b = arr[i]
        b.x += b.vx * dt; b.y += b.vy * dt
        b.life -= dt
        wrap(b, w, h, 4)
        if (b.life <= 0) arr.splice(i, 1)
      }
    }

    // saucer
    sim.saucerT -= dt
    if (!sim.saucer && sim.saucerT <= 0 && sim.rocks.length > 0) {
      const dir = Math.random() < 0.5 ? 1 : -1
      sim.saucer = { x: dir > 0 ? -40 : w + 40, y: 60 + Math.random() * (h * 0.5), vx: dir * 110, fireT: 1 }
      sfx('saucer')
    }
    if (sim.saucer) {
      const sc = sim.saucer
      sc.x += sc.vx * dt
      sc.y += Math.sin(sim.clock * 2.2) * 40 * dt
      sc.fireT -= dt
      if (sc.fireT <= 0) {
        const a = Math.atan2(sh.y - sc.y, sh.x - sc.x) + (Math.random() - 0.5) * 0.5
        sim.enemyBullets.push({ x: sc.x, y: sc.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 2.2 })
        sc.fireT = 1.4
        sfx('saucer')
      }
      if (sc.x < -60 || sc.x > w + 60) { sim.saucer = null; sim.saucerT = SAUCER_EVERY }
    }

    // bullets → rocks / saucer
    for (let i = sim.rocks.length - 1; i >= 0; i--) {
      const rk = sim.rocks[i]
      const R = ROCK_TIERS[rk.tier].r
      for (let j = sim.bullets.length - 1; j >= 0; j--) {
        const b = sim.bullets[j]
        if ((rk.x - b.x) ** 2 + (rk.y - b.y) ** 2 < R * R) {
          sim.bullets.splice(j, 1)
          breakRock(sim, i, true)
          break
        }
      }
    }
    if (sim.saucer) {
      for (let j = sim.bullets.length - 1; j >= 0; j--) {
        const b = sim.bullets[j]
        if ((sim.saucer.x - b.x) ** 2 + (sim.saucer.y - b.y) ** 2 < 22 * 22) {
          sim.bullets.splice(j, 1)
          burst(sim, sim.saucer.x, sim.saucer.y, 16, '#a5b4fc')
          sim.score += 200
          setScore(sim.score)
          sfx('boom1')
          sim.saucer = null
          sim.saucerT = SAUCER_EVERY
          break
        }
      }
    }

    // ship collisions
    if (sh.shield <= 0 && statusRef.current === 'playing') {
      let hit = false
      for (const rk of sim.rocks) {
        const R = ROCK_TIERS[rk.tier].r * 0.85
        if ((rk.x - sh.x) ** 2 + (rk.y - sh.y) ** 2 < (R + 10) ** 2) { hit = true; break }
      }
      if (!hit) {
        for (let i = sim.enemyBullets.length - 1; i >= 0; i--) {
          const b = sim.enemyBullets[i]
          if ((b.x - sh.x) ** 2 + (b.y - sh.y) ** 2 < 13 * 13) { sim.enemyBullets.splice(i, 1); hit = true; break }
        }
      }
      if (!hit && sim.saucer && (sim.saucer.x - sh.x) ** 2 + (sim.saucer.y - sh.y) ** 2 < 30 * 30) hit = true
      if (hit) { killShip(sim); if (statusRef.current !== 'playing') return }
    }

    // wave cleared
    if (sim.rocks.length === 0 && !sim.saucer) {
      sim.waveClearT += dt
      if (sim.waveClearT > 1.4) {
        sim.wave += 1
        sim.waveClearT = 0
        sim.score += 100 * sim.wave
        setScore(sim.score)
        setWave(sim.wave)
        spawnWave(sim, w, h)
        sim.ship.shield = Math.max(sim.ship.shield, 1.2)
        showToast(`Wave ${sim.wave}! 🚀 +${fmt(100 * sim.wave)}`)
        sfx('wave')
      }
    }

    // particles
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i]
      p.life -= dt
      if (p.life <= 0) { sim.parts.splice(i, 1); continue }
      p.x += p.vx * dt; p.y += p.vy * dt
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#0b1026')
    bg.addColorStop(1, '#111a3a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // stars
    for (const st of sim.stars) {
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(sim.clock * 0.8 + st.tw))
      ctx.fillStyle = '#dbeafe'
      ctx.fillRect(st.x * w, st.y * h, st.s, st.s)
    }
    ctx.globalAlpha = 1

    // rocks
    ctx.lineWidth = 2
    ctx.strokeStyle = '#94a3b8'
    ctx.shadowColor = '#64748b'
    ctx.shadowBlur = 8
    for (const rk of sim.rocks) {
      const R = ROCK_TIERS[rk.tier].r
      ctx.beginPath()
      rk.shape.forEach((p, i) => {
        const x = rk.x + Math.cos(p.a + rk.rot) * R * p.m
        const y = rk.y + Math.sin(p.a + rk.rot) * R * p.m
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(30,41,59,0.55)'
      ctx.fill()
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    // saucer
    if (sim.saucer) {
      const { x, y } = sim.saucer
      ctx.strokeStyle = '#a5b4fc'
      ctx.fillStyle = 'rgba(67,56,202,0.4)'
      ctx.lineWidth = 2
      ctx.shadowColor = '#818cf8'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.ellipse(x, y, 22, 8, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y - 5, 8, Math.PI, 0)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // ship
    const sh = sim.ship
    if (statusRef.current !== 'over') {
      const blink = sh.shield > 0 && Math.floor(sim.clock * 8) % 2 === 0
      if (!blink) {
        ctx.save()
        ctx.translate(sh.x, sh.y)
        ctx.rotate(sh.ang)
        ctx.lineWidth = 2
        ctx.strokeStyle = '#67e8f9'
        ctx.fillStyle = 'rgba(8,51,68,0.6)'
        ctx.shadowColor = '#22d3ee'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.moveTo(16, 0); ctx.lineTo(-11, 9); ctx.lineTo(-6, 0); ctx.lineTo(-11, -9)
        ctx.closePath()
        ctx.fill(); ctx.stroke()
        ctx.shadowBlur = 0
        ctx.restore()
      }
      if (sh.shield > 0 && !blink) {
        ctx.strokeStyle = 'rgba(103,232,249,0.5)'
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 24, 0, Math.PI * 2); ctx.stroke()
      }
    }

    // bullets
    ctx.fillStyle = '#fde68a'
    ctx.shadowColor = '#f59e0b'
    ctx.shadowBlur = 8
    for (const b of sim.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.6, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = '#fda4af'
    ctx.shadowColor = '#e11d48'
    for (const b of sim.enemyBullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill() }
    ctx.shadowBlur = 0

    // particles
    for (const p of sim.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.4))
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3)
    }
    ctx.globalAlpha = 1
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
    spawnWave(sim, w, h)
    simRef.current = sim
    setScore(0); setWave(1); setLives(3); resetSave()
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

  // keyboard
  useEffect(() => {
    const map = (k) => {
      switch (k) {
        case 'ArrowLeft': case 'a': return 'l'
        case 'ArrowRight': case 'd': return 'r'
        case 'ArrowUp': case 'w': return 't'
        case ' ': case 'Spacebar': return 'f'
        default: return null
      }
    }
    const down = (e) => {
      const k = map(e.key.length === 1 ? e.key.toLowerCase() : e.key)
      if (!k) return
      if (statusRef.current === 'playing') {
        e.preventDefault()
        simRef.current.keys[k] = true
      }
    }
    const up = (e) => {
      const k = map(e.key.length === 1 ? e.key.toLowerCase() : e.key)
      if (k && simRef.current) simRef.current.keys[k] = false
    }
    window.addEventListener('keydown', down, { passive: false })
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

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

  // auto-pause on blur
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

  const holdBtn = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); if (simRef.current) simRef.current.keys[k] = true },
    onPointerUp: () => { if (simRef.current) simRef.current.keys[k] = false },
    onPointerCancel: () => { if (simRef.current) simRef.current.keys[k] = false },
    onPointerLeave: () => { if (simRef.current) simRef.current.keys[k] = false },
  })
  const touchBtnStyle = {
    width: 58, height: 58, borderRadius: '50%', border: '1.5px solid rgba(148,163,184,0.5)',
    background: 'rgba(15,23,42,0.55)', color: '#e2e8f0', fontSize: 22, touchAction: 'none',
  }

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: '#0b1026' }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#93a4c8' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#fde68a' }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>Wave </span>
              <span className="font-display font-bold text-sm" style={{ color: '#cbd5e1' }}>{wave}</span>
            </div>
            <div className="text-sm" aria-label={`${lives} ships`}>{'🚀'.repeat(Math.max(0, lives))}</div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {/* touch controls — only on coarse-pointer (touch) devices */}
        {status === 'playing' && touchUI && (
          <div className="absolute bottom-4 inset-x-0 px-5 flex justify-between items-end">
            <div className="flex gap-3">
              <button {...holdBtn('l')} aria-label="Rotate left" style={touchBtnStyle}>⟲</button>
              <button {...holdBtn('r')} aria-label="Rotate right" style={touchBtnStyle}>⟳</button>
            </div>
            <div className="flex gap-3">
              <button {...holdBtn('t')} aria-label="Thrust" style={touchBtnStyle}>▲</button>
              <button {...holdBtn('f')} aria-label="Fire" style={{ ...touchBtnStyle, borderColor: 'rgba(253,230,138,0.6)', color: '#fde68a' }}>●</button>
            </div>
          </div>
        )}

        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full" style={{ background: '#fde68a', color: '#111a3a', pointerEvents: 'none' }}>{toast}</div>
        )}

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🚀</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Space Rocks</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              Classic starship arcade: <b style={{ color: GREEN }}>rotate, thrust and blast the asteroids</b> before
              they crush you. Big rocks split into fast little ones — and watch for the saucer.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Desktop: ← → rotate, ↑ thrust, space to fire. Phone: on-screen thrusters.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best run: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Launch</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} banked — the rocks drift on without you.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">🚀💥</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Ship destroyed!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>final score</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{wave}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>waves survived</div>
              </div>
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best score</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best!</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Fly again</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        ← → rotate · ↑ thrust · space to fire (WASD works too) · on phones use the on-screen thrusters · rocks split when shot — small ones are worth the most.
      </p>
    </div>
  )
}
