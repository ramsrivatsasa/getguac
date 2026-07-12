'use client'
// Tuition Invaders — classic descending-invader shooter with a college-fund
// goal. Every wave is a semester of tuition bills marching down; clear it and
// the semester is paid. Survive eight semesters and you graduate debt-free
// (the waves keep coming for score). A scholarship bus crosses the top for
// bonus cash, and green bunkers soak up hits until they crumble.
// Desktop: ← → / A D move, space fires. Mobile: drag to steer, tap to fire.
// Sim in refs + rAF; React state is HUD only; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-tuition-best-v1'
const GRADUATE_WAVE = 8

const INVADER_ROWS = [
  { emoji: '🎓', pts: 30 },
  { emoji: '📚', pts: 20 },
  { emoji: '📚', pts: 20 },
  { emoji: '✏️', pts: 10 },
  { emoji: '✏️', pts: 10 },
]
const INV_W = 34
const INV_H = 30
const PLAYER_Y_OFF = 46

function buildWave(sim, w) {
  sim.invaders = []
  const cols = Math.max(6, Math.min(11, Math.floor(w / 74)))
  const gridW = cols * (INV_W + 16)
  const x0 = (w - gridW) / 2
  for (let r = 0; r < INVADER_ROWS.length; r++) {
    for (let c = 0; c < cols; c++) {
      sim.invaders.push({
        x: x0 + c * (INV_W + 16), y: 84 + r * (INV_H + 12),
        row: r, alive: true,
      })
    }
  }
  sim.total = sim.invaders.length
  sim.dir = 1
  sim.baseV = 26 + (sim.wave - 1) * 7
  sim.bombT = Math.max(0.5, 1.5 - sim.wave * 0.1)
}

function buildBunkers(sim, w, h) {
  sim.bunkers = []
  const n = w > 700 ? 4 : 3
  for (let i = 0; i < n; i++) {
    sim.bunkers.push({
      x: ((i + 1) * w) / (n + 1) - 34, y: h - PLAYER_Y_OFF - 78,
      w: 68, h: 26, hp: 8,
    })
  }
}

const freshSim = (w, h) => {
  const sim = {
    player: { x: w / 2, cool: 0 },
    invaders: [], bunkers: [], bullets: [], bombs: [], parts: [],
    bus: null, busT: 14,
    wave: 1, lives: 3, score: 0, total: 0,
    dir: 1, baseV: 26, bombT: 1.4, bombClock: 1.4,
    clock: 0, freeze: 0, graduated: false,
  }
  buildWave(sim, w)
  buildBunkers(sim, w, h)
  return sim
}

export default function TuitionInvaders() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const toastTimer = useRef(null)
  const keysRef = useRef({ l: false, r: false, f: false })

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)
  const [graduated, setGraduated] = useState(false)
  const [toast, setToast] = useState('')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('tuition')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1900)
  }

  const sfx = (name) => {
    switch (name) {
      case 'fire': tone({ f0: 700, f1: 240, t: 0.08, type: 'square', g: 0.07 }); break
      case 'hit': tone({ f0: 320, f1: 620, t: 0.08, type: 'square', g: 0.12 }); break
      case 'bunker': tone({ f0: 150, f1: 90, t: 0.08, type: 'triangle', g: 0.1 }); break
      case 'bus': tone({ f0: 500, f1: 700, t: 0.15, type: 'triangle', g: 0.09 }); break
      case 'bonus': [660, 880, 1100].forEach((f, i) => tone({ f0: f, t: 0.1, g: 0.13, at: i * 0.06 })); break
      case 'die': [340, 220, 120].forEach((f, i) => tone({ f0: f, f1: f * 0.6, t: 0.22, type: 'sawtooth', g: 0.16, at: i * 0.12 })); break
      case 'wave': [392, 523, 659, 784].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.14, at: i * 0.08 })); break
      case 'grad': [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f0: f, t: 0.15, g: 0.16, at: i * 0.1 })); break
      default: break
    }
  }

  function burst(sim, x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 170
      sim.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.3, color })
    }
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('die')
    save(sim.score, sim.wave)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function hitPlayer(sim) {
    const { w } = sizeRef.current
    sim.lives -= 1
    setLives(sim.lives)
    burst(sim, sim.player.x, sizeRef.current.h - PLAYER_Y_OFF, '#fca5a5', 18)
    sfx('die')
    if (sim.lives <= 0) { endGame(sim); return }
    sim.player.x = w / 2
    sim.freeze = 1.1
    showToast('Hit! 📉')
  }

  function nextWave(sim) {
    const { w, h } = sizeRef.current
    sim.wave += 1
    sim.score += 150 * sim.wave
    setScore(sim.score)
    setWave(sim.wave)
    if (sim.wave > GRADUATE_WAVE && !sim.graduated) {
      sim.graduated = true
      setGraduated(true)
      showToast('GRADUATED DEBT-FREE! 🎓🎉 Bonus rounds begin')
      sfx('grad')
    } else {
      showToast(`Semester ${Math.min(sim.wave, GRADUATE_WAVE)} paid! 🎓 +${fmt(150 * sim.wave)}`)
      sfx('wave')
    }
    buildWave(sim, w)
    buildBunkers(sim, w, h)
    sim.bullets = []
    sim.bombs = []
    sim.freeze = 1.2
  }

  function step(sim, dt) {
    const { w, h } = sizeRef.current
    sim.clock += dt
    if (sim.freeze > 0) { sim.freeze -= dt; return }
    const py = h - PLAYER_Y_OFF

    // player
    const kv = (keysRef.current.r ? 1 : 0) - (keysRef.current.l ? 1 : 0)
    sim.player.x += kv * 420 * dt
    sim.player.x = Math.max(24, Math.min(w - 24, sim.player.x))
    sim.player.cool -= dt
    if (keysRef.current.f && sim.player.cool <= 0 && sim.bullets.length < 2) {
      sim.bullets.push({ x: sim.player.x, y: py - 18, vy: -560 })
      sim.player.cool = 0.34
      sfx('fire')
    }

    // invaders march
    const alive = sim.invaders.filter((i) => i.alive)
    if (alive.length === 0) { nextWave(sim); return }
    const speed = sim.baseV * (1 + (1 - alive.length / sim.total) * 2.4)
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const inv of alive) {
      inv.x += sim.dir * speed * dt
      if (inv.x < minX) minX = inv.x
      if (inv.x + INV_W > maxX) maxX = inv.x + INV_W
      if (inv.y + INV_H > maxY) maxY = inv.y + INV_H
    }
    if ((sim.dir > 0 && maxX > w - 10) || (sim.dir < 0 && minX < 10)) {
      sim.dir *= -1
      for (const inv of alive) inv.y += 16
    }
    if (maxY >= py - 14) { endGame(sim); return } // they reached you

    // invader bombs — bottom-most invader of a random column drops
    sim.bombClock -= dt
    if (sim.bombClock <= 0) {
      sim.bombClock = sim.bombT * (0.7 + Math.random() * 0.6)
      const cols = new Map()
      for (const inv of alive) {
        const key = Math.round(inv.x / (INV_W + 16))
        const cur = cols.get(key)
        if (!cur || inv.y > cur.y) cols.set(key, inv)
      }
      const arr = [...cols.values()]
      const src = arr[Math.floor(Math.random() * arr.length)]
      if (src) sim.bombs.push({ x: src.x + INV_W / 2, y: src.y + INV_H, vy: 190 + sim.wave * 14 })
    }

    // scholarship bus
    sim.busT -= dt
    if (!sim.bus && sim.busT <= 0) {
      const dir = Math.random() < 0.5 ? 1 : -1
      sim.bus = { x: dir > 0 ? -50 : w + 50, vx: dir * 130 }
      sfx('bus')
    }
    if (sim.bus) {
      sim.bus.x += sim.bus.vx * dt
      if (sim.bus.x < -70 || sim.bus.x > w + 70) { sim.bus = null; sim.busT = 16 + Math.random() * 10 }
    }

    // bullets
    for (let i = sim.bullets.length - 1; i >= 0; i--) {
      const b = sim.bullets[i]
      b.y += b.vy * dt
      if (b.y < 40) { sim.bullets.splice(i, 1); continue }
      let used = false
      // bus
      if (sim.bus && Math.abs(b.x - sim.bus.x) < 26 && Math.abs(b.y - 58) < 14) {
        const bonus = 100 * (1 + Math.floor(Math.random() * 3))
        sim.score += bonus
        setScore(sim.score)
        sim.parts.push({ txt: `Scholarship! +${bonus}`, x: sim.bus.x, y: 58, vy: -40, life: 1.1, color: '#FBBF24' })
        burst(sim, sim.bus.x, 58, '#FBBF24', 14)
        sim.bus = null
        sim.busT = 18 + Math.random() * 10
        sim.bullets.splice(i, 1)
        sfx('bonus')
        continue
      }
      // invaders
      for (const inv of sim.invaders) {
        if (!inv.alive) continue
        if (b.x > inv.x - 2 && b.x < inv.x + INV_W + 2 && b.y > inv.y - 2 && b.y < inv.y + INV_H + 2) {
          inv.alive = false
          const pts = INVADER_ROWS[inv.row].pts
          sim.score += pts
          setScore(sim.score)
          burst(sim, inv.x + INV_W / 2, inv.y + INV_H / 2, '#93C5FD')
          sim.bullets.splice(i, 1)
          used = true
          sfx('hit')
          break
        }
      }
      if (used) continue
      // bunkers
      for (const bk of sim.bunkers) {
        if (bk.hp > 0 && b.x > bk.x && b.x < bk.x + bk.w && b.y > bk.y && b.y < bk.y + bk.h) {
          bk.hp -= 1
          sim.bullets.splice(i, 1)
          sfx('bunker')
          break
        }
      }
    }

    // bombs
    for (let i = sim.bombs.length - 1; i >= 0; i--) {
      const b = sim.bombs[i]
      b.y += b.vy * dt
      if (b.y > h + 10) { sim.bombs.splice(i, 1); continue }
      let used = false
      for (const bk of sim.bunkers) {
        if (bk.hp > 0 && b.x > bk.x && b.x < bk.x + bk.w && b.y > bk.y && b.y < bk.y + bk.h) {
          bk.hp -= 1
          sim.bombs.splice(i, 1)
          used = true
          sfx('bunker')
          break
        }
      }
      if (used) continue
      if (Math.abs(b.x - sim.player.x) < 20 && b.y > py - 14 && b.y < py + 16) {
        sim.bombs.splice(i, 1)
        hitPlayer(sim)
        if (statusRef.current !== 'playing') return
      }
    }

    // particles
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i]
      p.life -= dt
      if (p.life <= 0) { sim.parts.splice(i, 1); continue }
      p.x += (p.vx || 0) * dt
      p.y += p.vy * dt
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#111c33')
    bg.addColorStop(1, '#1e2a4a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const py = h - PLAYER_Y_OFF

    // scholarship bus
    if (sim.bus) {
      ctx.font = '30px system-ui'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.save()
      if (sim.bus.vx < 0) { ctx.translate(sim.bus.x, 58); ctx.scale(-1, 1); ctx.fillText('🚌', 0, 0) }
      else ctx.fillText('🚌', sim.bus.x, 58)
      ctx.restore()
    }

    // invaders — subtle march bob
    ctx.font = `${INV_H - 4}px system-ui`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const bob = Math.sin(sim.clock * 6) * 2
    for (const inv of sim.invaders) {
      if (!inv.alive) continue
      ctx.fillText(INVADER_ROWS[inv.row].emoji, inv.x + INV_W / 2, inv.y + INV_H / 2 + (inv.row % 2 === 0 ? bob : -bob))
    }

    // bunkers
    for (const bk of sim.bunkers) {
      if (bk.hp <= 0) continue
      ctx.globalAlpha = 0.35 + (bk.hp / 8) * 0.65
      ctx.fillStyle = '#65A30D'
      ctx.beginPath()
      ctx.roundRect(bk.x, bk.y, bk.w, bk.h, 6)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // player cannon
    ctx.fillStyle = '#A3E635'
    ctx.beginPath()
    ctx.roundRect(sim.player.x - 22, py - 6, 44, 14, 5)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(sim.player.x - 5, py - 18, 10, 14, 3)
    ctx.fill()
    ctx.font = '16px system-ui'
    ctx.fillText('🎒', sim.player.x, py + 22)

    // bullets & bombs
    ctx.fillStyle = '#FDE68A'
    for (const b of sim.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 10)
    ctx.fillStyle = '#FDA4AF'
    for (const b of sim.bombs) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill()
    }

    // particles + popups
    for (const p of sim.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2))
      if (p.txt) {
        ctx.fillStyle = p.color
        ctx.font = "800 16px 'Bricolage Grotesque', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText(p.txt, p.x, p.y)
      } else {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      }
      ctx.globalAlpha = 1
    }

    if (sim.freeze > 0 && statusRef.current === 'playing') {
      ctx.fillStyle = '#A3E635'
      ctx.textAlign = 'center'
      ctx.font = "800 26px 'Bricolage Grotesque', system-ui, sans-serif"
      ctx.fillText(sim.wave <= 1 ? 'Semester 1 — defend the fund!' : 'Ready!', w / 2, h * 0.55)
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
    sim.freeze = 1.4
    simRef.current = sim
    setScore(0); setWave(1); setLives(3); setGraduated(false); resetSave()
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
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); keysRef.current.f = true }
    }
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.l = false
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.r = false
      if (e.key === ' ' || e.key === 'Spacebar') keysRef.current.f = false
    }
    window.addEventListener('keydown', down, { passive: false })
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // touch: drag steers, tap fires
  const dragRef = useRef(null)
  const onPointerDown = (e) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { x: e.clientX, moved: false }
  }
  const onPointerMove = (e) => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing' || !dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    if (Math.abs(dx) > 4) dragRef.current.moved = true
    sim.player.x = Math.max(24, Math.min(sizeRef.current.w - 24, sim.player.x + dx))
    dragRef.current.x = e.clientX
  }
  const onPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d || statusRef.current !== 'playing') return
    if (!d.moved) {
      // tap = fire one shot
      const sim = simRef.current
      if (sim && sim.player.cool <= 0 && sim.bullets.length < 2) {
        sim.bullets.push({ x: sim.player.x, y: sizeRef.current.h - PLAYER_Y_OFF - 18, vy: -560 })
        sim.player.cool = 0.34
        sfx('fire')
      }
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
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: '#111c33', borderTop: '1px solid rgba(30,41,59,0.8)', borderBottom: '1px solid rgba(30,41,59,0.8)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#93a4c8' }}>College fund </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#FDE68A' }}>${fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#64748b' }}>Semester </span>
              <span className="font-display font-bold text-sm" style={{ color: '#cbd5e1' }}>{Math.min(wave, GRADUATE_WAVE)}/{GRADUATE_WAVE}</span>
            </div>
            {graduated && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>GRADUATED 🎓</span>}
            <div className="text-sm" aria-label={`${lives} lives`}>{'🎒'.repeat(Math.max(0, lives))}</div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full text-center" style={{ background: '#FDE68A', color: '#111c33', pointerEvents: 'none', maxWidth: '90%' }}>{toast}</div>
        )}

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🎓</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Tuition Invaders</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              The tuition bills are marching down on the college fund — <b style={{ color: GREEN }}>shoot down the whole
              wave to pay off the semester</b>. Eight semesters and you graduate debt-free.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Bunkers soak up fire until they crumble, and hitting the scholarship bus is free money. ← → move, space fires; on phones drag to steer and tap to shoot.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best fund: ${fmt(best)}</div>}
            <PrimaryButton onClick={start}>Defend the fund</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>${fmt(score)} in the fund — the bills will hold position.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">{graduated ? '🎓🎉' : '📚💥'}</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
              {graduated ? 'Graduated — and then some!' : 'The bills won this round!'}
            </div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>${fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>college fund defended</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{Math.min(wave, GRADUATE_WAVE)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>semesters</div>
              </div>
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>${fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best fund</div>
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
        ← → or A/D to move · space to fire · on phones drag to steer, tap to shoot · clear each wave to pay the semester · 8 semesters = debt-free diploma.
      </p>
    </div>
  )
}
