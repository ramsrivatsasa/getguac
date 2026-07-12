'use client'
// Guac Fling — slingshot physics arcade (the Angry-Birds formula, GetGuac
// edition). Drag the avocado back in the sling, release, and demolish towers
// of fee blocks to squash every money-waster (💸) hiding inside. Simplified
// rigid-body model: the avocado is a bouncing circle, blocks are destructible
// AABBs with a support/collapse pass (crush-the-castle style), wasters are
// circles that pop on impact or a hard fall. Sim in refs + rAF; React state
// is HUD only; synthesized sound.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-fling-best-v1'
const W = 1280, H = 720, GY = 640            // world size, ground surface y
const SLING = { x: 190, y: 468 }             // fork of the slingshot
const PULL_MAX = 115, LAUNCH_K = 10.2
const GRAV = 1450, BLOCK_GRAV = 1150
const BIRDS_PER_LEVEL = 4

const MATS = {
  g: { hp: 60, pts: 50, fill: 'rgba(165,220,255,0.55)', edge: '#7cb8e8' },   // glass
  w: { hp: 150, pts: 100, fill: '#d9a05b', edge: '#a9723a' },                // wood
  s: { hp: 330, pts: 200, fill: '#a8a29e', edge: '#78716c' },                // stone
}

// Layout DSL: blocks in world coords (x,y = center), monsters as {x,y}.
// Ground is GY; a block of height h resting on the ground sits at y = GY-h/2.
const col = (t, x, h, yTop = GY) => ({ t, x, y: yTop - h / 2, w: 22, h })
const slab = (t, x, w, yBottom) => ({ t, x, y: yBottom - 11, w, h: 22 })
const box = (t, x, yBottom, s = 46) => ({ t, x, y: yBottom - s / 2, w: s, h: s })
const mon = (x, yBottom) => ({ x, y: yBottom - 21 })

function levelLayout(n) {
  const L = ((n - 1) % 5) + 1
  const mult = 1 + Math.floor((n - 1) / 5) * 0.35   // later loops: tougher blocks
  let blocks = [], monsters = []
  if (L === 1) {
    blocks = [col('w', 800, 130), col('w', 960, 130), slab('w', 880, 240, GY - 130), mon(880, GY), mon(880, GY - 152)]
  } else if (L === 2) {
    blocks = [
      col('g', 760, 110), col('g', 880, 110), col('g', 1000, 110), slab('w', 820, 170, GY - 110), slab('w', 940, 170, GY - 110),
      col('w', 820, 100, GY - 132), col('w', 940, 100, GY - 132), slab('w', 880, 220, GY - 232),
      mon(820, GY), mon(940, GY), mon(880, GY - 254),
    ]
  } else if (L === 3) {
    blocks = [
      box('s', 790, GY), box('s', 970, GY), slab('s', 880, 260, GY - 46),
      col('w', 812, 96, GY - 68), col('w', 948, 96, GY - 68), slab('w', 880, 200, GY - 164),
      mon(880, GY), mon(880, GY - 186),
    ]
  } else if (L === 4) {
    // pyramid of boxes with wasters in the gaps
    blocks = [
      box('w', 760, GY), box('g', 850, GY), box('w', 940, GY), box('g', 1030, GY),
      box('w', 805, GY - 46), box('g', 895, GY - 46), box('w', 985, GY - 46),
      box('w', 850, GY - 92), box('w', 940, GY - 92),
      box('s', 895, GY - 138),
      mon(895, GY - 184), // sits on the top stone box
    ]
    monsters = [mon(710, GY), mon(1080, GY)]
  } else {
    // castle: two stone towers + glass keep
    blocks = [
      col('s', 720, 150), col('s', 800, 150), slab('s', 760, 140, GY - 150),
      col('s', 1000, 150), col('s', 1080, 150), slab('s', 1040, 140, GY - 150),
      col('g', 860, 90), col('g', 940, 90), slab('w', 900, 200, GY - 90),
      col('w', 760, 90, GY - 172), col('w', 1040, 90, GY - 172), slab('w', 900, 420, GY - 262),
      mon(900, GY), mon(760, GY - 172), mon(1040, GY - 172), mon(900, GY - 284),
    ]
  }
  const bs = [], ms = [...monsters]
  for (const e of blocks) {
    if (e.t) bs.push(e); else ms.push(e)
  }
  return {
    blocks: bs.map((b) => ({ ...b, hp: MATS[b.t].hp * mult, hp0: MATS[b.t].hp * mult, vy: 0, dead: false })),
    monsters: ms.map((m) => ({ ...m, r: 21, vy: 0, dead: false })),
  }
}

const freshSim = (level = 1, score = 0) => ({
  clock: 0, level, score,
  birds: BIRDS_PER_LEVEL,
  bird: { x: SLING.x, y: SLING.y, vx: 0, vy: 0, r: 21, state: 'loaded', age: 0, settle: 0 },
  drag: null,               // {x,y} current pull point in world coords
  banner: null,             // {txt, life}
  particles: [], popups: [],
  clouds: Array.from({ length: 4 }, (_, i) => ({ x: 200 + i * 320 + Math.random() * 120, y: 70 + Math.random() * 120, s: 0.7 + Math.random() * 0.7 })),
  ...levelLayout(level),
})

export default function GuacFling() {
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
  const [level, setLevel] = useState(1)
  const [birdsLeft, setBirdsLeft] = useState(BIRDS_PER_LEVEL)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('fling')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'stretch': tone({ f0: 180, f1: 320, t: 0.08, type: 'triangle', g: 0.05 }); break
      case 'launch': tone({ f0: 700, f1: 180, t: 0.25, type: 'sawtooth', g: 0.1 }); break
      case 'thud': tone({ f0: 130, f1: 60, t: 0.1, type: 'square', g: 0.15 }); break
      case 'crack': tone({ f0: 420, f1: 120, t: 0.09, type: 'square', g: 0.12 }); break
      case 'shatter': [900, 1300, 700].forEach((f, i) => tone({ f0: f, f1: f * 0.5, t: 0.1, type: 'triangle', g: 0.08, at: i * 0.03 })); break
      case 'pop': tone({ f0: 500, f1: 950, t: 0.12, type: 'square', g: 0.14 }); break
      case 'clear': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.14, g: 0.15, at: i * 0.08 })); break
      case 'fail': [330, 262, 196].forEach((f, i) => tone({ f0: f, t: 0.2, type: 'triangle', g: 0.13, at: i * 0.11 })); break
      default: break
    }
  }

  const addPts = (sim, pts, x, y) => {
    sim.score += pts
    setScore(sim.score)
    sim.popups.push({ txt: `+${pts}`, x, y, life: 0.9, big: pts >= 400 })
  }

  const burst = (sim, x, y, color, n = 10) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 220
      sim.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.5 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 })
    }
  }

  const killBlock = (sim, b) => {
    b.dead = true
    addPts(sim, MATS[b.t].pts, b.x, b.y - 20)
    burst(sim, b.x, b.y, b.t === 'g' ? '#bfdbfe' : b.t === 'w' ? '#d9a05b' : '#a8a29e', 12)
    sfx(b.t === 'g' ? 'shatter' : 'crack')
  }

  const killMonster = (sim, m) => {
    m.dead = true
    addPts(sim, 500, m.x, m.y - 26)
    burst(sim, m.x, m.y, '#86efac', 14)
    sfx('pop')
  }

  const damage = (sim, b, dmg) => {
    if (b.dead || dmg <= 0) return
    b.hp -= dmg
    if (b.hp <= 0) killBlock(sim, b)
    else sfx('thud')
  }

  // ─── physics ───────────────────────────────────────────────────────────────
  function stepBird(sim, dt) {
    const bd = sim.bird
    if (bd.state !== 'flying') return
    bd.age += dt
    bd.vy += GRAV * dt
    bd.x += bd.vx * dt
    bd.y += bd.vy * dt

    // ground
    if (bd.y + bd.r > GY) {
      bd.y = GY - bd.r
      if (Math.abs(bd.vy) > 60) sfx('thud')
      bd.vy *= -0.42
      bd.vx *= 0.72
    }
    // blocks: circle vs AABB, damage on impact
    for (const b of sim.blocks) {
      if (b.dead) continue
      const cx = Math.max(b.x - b.w / 2, Math.min(bd.x, b.x + b.w / 2))
      const cy = Math.max(b.y - b.h / 2, Math.min(bd.y, b.y + b.h / 2))
      const dx = bd.x - cx, dy = bd.y - cy
      const d2 = dx * dx + dy * dy
      if (d2 >= bd.r * bd.r) continue
      const d = Math.sqrt(d2) || 0.001
      const nx = dx / d, ny = dy / d
      const speed = Math.hypot(bd.vx, bd.vy)
      damage(sim, b, Math.max(0, speed - 70) * 0.55)
      // push out + reflect
      const push = bd.r - d
      bd.x += nx * push; bd.y += ny * push
      const vn = bd.vx * nx + bd.vy * ny
      if (vn < 0) {
        bd.vx -= (1 + 0.35) * vn * nx
        bd.vy -= (1 + 0.35) * vn * ny
        bd.vx *= 0.82; bd.vy *= 0.82
      }
    }
    // monsters
    for (const m of sim.monsters) {
      if (m.dead) continue
      const d = Math.hypot(bd.x - m.x, bd.y - m.y)
      if (d < bd.r + m.r && Math.hypot(bd.vx, bd.vy) > 60) killMonster(sim, m)
    }
    // spent?
    const slow = Math.hypot(bd.vx, bd.vy) < 40 && bd.y + bd.r > GY - 4
    if (slow) bd.settle += dt; else bd.settle = 0
    if (bd.settle > 0.7 || bd.age > 9 || bd.x > W + 80 || bd.x < -80) {
      bd.state = 'spent'
      bd.wait = 0
    }
  }

  // support & collapse: blocks/monsters fall when nothing holds them up
  function stepStructure(sim, dt) {
    const live = sim.blocks.filter((b) => !b.dead)
    const supported = (x0, x1, bottom) => {
      if (bottom >= GY - 4) return true
      for (const o of live) {
        if (o.falling) continue
        const oTop = o.y - o.h / 2
        if (Math.abs(oTop - bottom) <= 6 && x1 > o.x - o.w / 2 + 3 && x0 < o.x + o.w / 2 - 3) return true
      }
      return false
    }
    for (const b of live) {
      const bottom = b.y + b.h / 2
      if (!b.falling && !supported(b.x - b.w / 2, b.x + b.w / 2, bottom)) { b.falling = true; b.vy = 0 }
      if (b.falling) {
        b.vy += BLOCK_GRAV * dt
        b.y += b.vy * dt
        // falling block squashes wasters beneath it
        for (const m of sim.monsters) {
          if (m.dead) continue
          if (Math.abs(m.x - b.x) < b.w / 2 + m.r - 4 && Math.abs(m.y - b.y) < b.h / 2 + m.r - 2) killMonster(sim, m)
        }
        // land on ground or the highest support below
        let landY = GY
        for (const o of live) {
          if (o === b || o.falling) continue
          const oTop = o.y - o.h / 2
          if (b.x + b.w / 2 > o.x - o.w / 2 + 3 && b.x - b.w / 2 < o.x + o.w / 2 - 3 && oTop >= b.y + b.h / 2 - 8 && oTop < landY) landY = oTop
        }
        if (b.y + b.h / 2 >= landY) {
          b.y = landY - b.h / 2
          if (b.vy > 260) { damage(sim, b, (b.vy - 200) * 0.4); sfx('thud') }
          b.falling = false; b.vy = 0
        }
      }
    }
    for (const m of sim.monsters) {
      if (m.dead) continue
      const bottom = m.y + m.r
      let landY = GY
      for (const o of live) {
        if (o.falling) continue
        const oTop = o.y - o.h / 2
        if (m.x > o.x - o.w / 2 - 4 && m.x < o.x + o.w / 2 + 4 && oTop >= bottom - 8 && oTop < landY) landY = oTop
      }
      if (bottom < landY - 2) {
        m.vy += BLOCK_GRAV * dt
        m.y += m.vy * dt
        if (m.y + m.r >= landY) {
          if (m.vy > 430) { killMonster(sim, m); continue }
          m.y = landY - m.r; m.vy = 0
        }
      } else { m.vy = 0 }
    }
  }

  const nextBirdOrEnd = (sim) => {
    if (sim.monsters.every((m) => m.dead)) return // level-clear handles it
    if (sim.birds > 0) {
      sim.bird = { x: SLING.x, y: SLING.y, vx: 0, vy: 0, r: 21, state: 'loaded', age: 0, settle: 0 }
    } else {
      sfx('fail')
      endGame(sim)
    }
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    save(sim.score, sim.level)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function step(sim, dt) {
    sim.clock += dt
    for (const c of sim.clouds) { c.x += dt * 8 * c.s; if (c.x > W + 120) c.x = -120 }
    stepBird(sim, dt)
    stepStructure(sim, dt)

    if (sim.bird.state === 'spent') {
      sim.bird.wait += dt
      if (sim.bird.wait > 0.8) { sim.bird.state = 'gone'; nextBirdOrEnd(sim) }
    }

    // level cleared?
    if (!sim.banner && sim.monsters.length > 0 && sim.monsters.every((m) => m.dead)) {
      const bonus = sim.birds * 500 + (sim.bird.state === 'loaded' ? 0 : 0)
      if (bonus > 0) addPts(sim, bonus, W / 2, 200)
      sim.banner = { txt: `Level ${sim.level} cleared! 🎉`, life: 1.4 }
      sfx('clear')
    }
    if (sim.banner) {
      sim.banner.life -= dt
      if (sim.banner.life <= 0) {
        const lv = sim.level + 1
        const keep = { clock: sim.clock, clouds: sim.clouds }
        Object.assign(sim, freshSim(lv, sim.score), keep)
        setLevel(lv); setBirdsLeft(BIRDS_PER_LEVEL)
      }
    }

    for (let i = sim.particles.length - 1; i >= 0; i--) {
      const p = sim.particles[i]
      p.life -= dt; p.vy += 500 * dt
      p.x += p.vx * dt; p.y += p.vy * dt
      if (p.life <= 0) sim.particles.splice(i, 1)
    }
    for (let i = sim.popups.length - 1; i >= 0; i--) {
      const p = sim.popups[i]
      p.life -= dt; p.y -= dt * 46
      if (p.life <= 0) sim.popups.splice(i, 1)
    }
  }

  // ─── render ────────────────────────────────────────────────────────────────
  const toWorld = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const { s, ox, oy } = viewRef.current
    return { x: (e.clientX - rect.left - ox) / s, y: (e.clientY - rect.top - oy) / s }
  }

  function drawAvocado(ctx, x, y, r, angle = 0) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillStyle = '#4d7c0f'
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#84cc16'
    ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.62, r * 0.68, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#78350f'
    ctx.beginPath(); ctx.arc(0, r * 0.22, r * 0.3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#15281C'
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.34, r * 0.11, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.34, r * 0.11, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#15281C'; ctx.lineWidth = Math.max(1.5, r * 0.09)
    ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 0.22, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke()
    ctx.restore()
  }

  function drawBlock(ctx, b) {
    const m = MATS[b.t]
    ctx.fillStyle = m.fill
    ctx.strokeStyle = m.edge
    ctx.lineWidth = 2
    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)
    ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)
    if (b.t === 'w') {
      ctx.strokeStyle = 'rgba(120,80,40,0.35)'; ctx.lineWidth = 1
      if (b.w > b.h) for (let i = 1; i < 3; i++) { const yy = b.y - b.h / 2 + (b.h * i) / 3; ctx.beginPath(); ctx.moveTo(b.x - b.w / 2 + 3, yy); ctx.lineTo(b.x + b.w / 2 - 3, yy); ctx.stroke() }
      else for (let i = 1; i < 3; i++) { const xx = b.x - b.w / 2 + (b.w * i) / 3; ctx.beginPath(); ctx.moveTo(xx, b.y - b.h / 2 + 3); ctx.lineTo(xx, b.y + b.h / 2 - 3); ctx.stroke() }
    }
    if (b.hp < b.hp0 * 0.55) {
      ctx.strokeStyle = 'rgba(30,20,10,0.5)'; ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(b.x - b.w * 0.3, b.y - b.h * 0.35)
      ctx.lineTo(b.x + b.w * 0.05, b.y)
      ctx.lineTo(b.x - b.w * 0.15, b.y + b.h * 0.32)
      ctx.stroke()
    }
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    // sky across the whole canvas
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#bae6fd'); bg.addColorStop(0.75, '#e0f2fe'); bg.addColorStop(1, '#dcfce7')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const s = Math.min(w / W, h / H)
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2
    viewRef.current = { s, ox, oy }
    // ground across the whole canvas at world ground height
    const gy = oy + GY * s
    ctx.fillStyle = '#86c94f'
    ctx.fillRect(0, gy, w, h - gy)
    ctx.fillStyle = '#65A30D'
    ctx.fillRect(0, gy, w, 8 * s)

    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    // sun + clouds + hills
    ctx.fillStyle = 'rgba(253,224,71,0.9)'
    ctx.beginPath(); ctx.arc(W - 130, 100, 46, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (const c of sim.clouds) {
      ctx.beginPath()
      ctx.arc(c.x, c.y, 26 * c.s, 0, Math.PI * 2)
      ctx.arc(c.x + 26 * c.s, c.y + 6 * c.s, 20 * c.s, 0, Math.PI * 2)
      ctx.arc(c.x - 26 * c.s, c.y + 8 * c.s, 18 * c.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(134,201,79,0.5)'
    ctx.beginPath(); ctx.ellipse(240, GY, 330, 60, 0, Math.PI, 0); ctx.fill()
    ctx.beginPath(); ctx.ellipse(1000, GY, 420, 46, 0, Math.PI, 0); ctx.fill()

    // slingshot (behind band when loaded)
    const bd = sim.bird
    const loadedPos = bd.state === 'loaded' ? (sim.drag || { x: SLING.x, y: SLING.y }) : null
    ctx.strokeStyle = '#7c4a21'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(SLING.x, GY); ctx.lineTo(SLING.x, SLING.y + 40); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 40); ctx.lineTo(SLING.x - 22, SLING.y - 14); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(SLING.x, SLING.y + 40); ctx.lineTo(SLING.x + 22, SLING.y - 14); ctx.stroke()
    if (loadedPos) {
      ctx.strokeStyle = '#57431f'
      ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(SLING.x - 22, SLING.y - 14); ctx.lineTo(loadedPos.x, loadedPos.y); ctx.stroke()
    }

    // blocks + monsters
    for (const b of sim.blocks) if (!b.dead) drawBlock(ctx, b)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = '34px serif'
    for (const m of sim.monsters) if (!m.dead) ctx.fillText('💸', m.x, m.y + 2)

    // trajectory preview while dragging
    if (sim.drag && bd.state === 'loaded') {
      const vx = (SLING.x - sim.drag.x) * LAUNCH_K, vy = (SLING.y - sim.drag.y) * LAUNCH_K
      ctx.fillStyle = 'rgba(21,40,28,0.4)'
      for (let i = 1; i <= 11; i++) {
        const t = i * 0.07
        const px = sim.drag.x + vx * t
        const py = sim.drag.y + vy * t + 0.5 * GRAV * t * t
        if (py > GY) break
        ctx.beginPath(); ctx.arc(px, py, 4.5 - i * 0.25, 0, Math.PI * 2); ctx.fill()
      }
    }

    // the avocado
    if (bd.state === 'loaded') {
      const p = sim.drag || { x: SLING.x, y: SLING.y }
      drawAvocado(ctx, p.x, p.y, bd.r)
    } else if (bd.state !== 'gone') {
      drawAvocado(ctx, bd.x, bd.y, bd.r, Math.atan2(bd.vy, bd.vx) * 0.2)
    }
    // waiting queue
    for (let i = 0; i < sim.birds - (bd.state === 'loaded' ? 1 : 0); i++) {
      drawAvocado(ctx, 96 - i * 44, GY - 16, 15)
    }
    if (loadedPos) {
      ctx.strokeStyle = '#6b4f24'
      ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(SLING.x + 22, SLING.y - 14); ctx.lineTo(loadedPos.x, loadedPos.y); ctx.stroke()
    }

    // particles / popups
    for (const p of sim.particles) {
      ctx.globalAlpha = Math.max(0, p.life * 1.8)
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    for (const p of sim.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2))
      ctx.fillStyle = p.big ? '#b45309' : '#374151'
      ctx.font = `800 ${p.big ? 30 : 22}px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(p.txt, p.x, p.y)
      ctx.globalAlpha = 1
    }
    if (sim.banner) {
      ctx.fillStyle = 'rgba(21,40,28,0.75)'
      ctx.font = `800 54px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(sim.banner.txt, W / 2, 260)
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
    simRef.current = freshSim(1, 0)
    setScore(0); setLevel(1); setBirdsLeft(BIRDS_PER_LEVEL); resetSave()
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

  // ─── slingshot pointer handling ───────────────────────────────────────────
  const onDown = (e) => {
    e.preventDefault()
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing' || sim.bird.state !== 'loaded') return
    const p = toWorld(e)
    if (Math.hypot(p.x - SLING.x, p.y - SLING.y) < 150) {
      sim.drag = { x: SLING.x, y: SLING.y }
      sfx('stretch')
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
  }
  const onMove = (e) => {
    const sim = simRef.current
    if (!sim || !sim.drag) return
    const p = toWorld(e)
    let dx = p.x - SLING.x, dy = p.y - SLING.y
    const d = Math.hypot(dx, dy)
    if (d > PULL_MAX) { dx *= PULL_MAX / d; dy *= PULL_MAX / d }
    sim.drag = { x: SLING.x + dx, y: SLING.y + dy }
  }
  const onUp = () => {
    const sim = simRef.current
    if (!sim || !sim.drag) return
    const { x, y } = sim.drag
    sim.drag = null
    const vx = (SLING.x - x) * LAUNCH_K, vy = (SLING.y - y) * LAUNCH_K
    if (Math.hypot(vx, vy) < 120) return // tiny pull = putback
    const bd = sim.bird
    bd.x = x; bd.y = y; bd.vx = vx; bd.vy = vy
    bd.state = 'flying'; bd.age = 0; bd.settle = 0
    sim.birds -= 1
    setBirdsLeft(sim.birds)
    sfx('launch')
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
        style={{ height: 'min(84vh, 900px)', minHeight: 480, background: '#bae6fd', borderTop: '1px solid rgba(20,83,45,0.12)', borderBottom: '1px solid rgba(20,83,45,0.12)' }}
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
              <span className="text-[11px] font-semibold" style={{ color: '#5C6B60' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: INK }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#5C6B60' }}>Level </span>
              <span className="font-display font-bold text-sm" style={{ color: INK }}>{level}</span>
            </div>
            <div className="text-sm">{'🥑'.repeat(Math.max(0, birdsLeft))}</div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay>
            <div className="text-4xl mb-1">🏹</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Guac Fling</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              Money-wasters (💸) are holed up in towers of fees. <b style={{ color: GREEN }}>Drag the avocado back</b> in
              the slingshot and let go to bring the whole thing down.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Four avocados per level — squash every waster to advance. Glass shatters, wood cracks, stone takes a real hit.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best run: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Fling!</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} banked, level {level}.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay>
            <div className="text-3xl mb-1">🏹💥</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Out of avocados!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>reached level {level}</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best run</div>
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
        Drag the avocado back, aim with the dotted arc, release to fire · 💸 squashed = 500 · unused avocados pay a bonus.
      </p>
    </div>
  )
}
