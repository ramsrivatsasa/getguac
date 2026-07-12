'use client'
// Bubble Pop — GetGuac arcade bubble shooter (classic aim-and-match style).
// A hex-packed board of spending bubbles hangs from the top; aim the launcher,
// fire, and match 3+ of a color to pop them. Bubbles cut off from the ceiling
// fall for bonus dollars. Every few shots a new row pushes down — clear the
// board to level up, lose when the wall crosses the danger line.
// Whole sim lives in refs + rAF; React state is only the HUD/status layer.
// Sound is synthesized WebAudio (no assets) with a persisted mute toggle.
// The playfield is full-bleed: column count adapts to the screen width at
// game start so bubbles stay finger-sized on phones and sane on monitors.
import { useCallback, useEffect, useRef, useState } from 'react'
import AdSlot from '../AdSlot'
import { saveGameScore } from '../../lib/gameScores'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const BEST_KEY = 'gg-bubbles-best-v1'
const SOUND_KEY = 'gg-arcade-sound'

// Bubble kinds — money categories. Emoji doubles as the colorblind cue.
const KINDS = [
  { color: '#65A30D', dark: '#3f6b06', emoji: '🥑' }, // grub
  { color: '#2563EB', dark: '#173f96', emoji: '🛒' }, // shopping
  { color: '#D9A514', dark: '#8f6c0a', emoji: '💡' }, // bills
  { color: '#E11D48', dark: '#96122f', emoji: '🍿' }, // treats
  { color: '#7C3AED', dark: '#4c1d95', emoji: '📺' }, // subs
  { color: '#0D9488', dark: '#0a5c53', emoji: '💎' }, // splurges
]

const START_ROWS = 7
// Columns adapt to screen width at game start. Smaller bubbles ≈ 42px so the
// board reads like a real bubble-shooter grid (bubbleshooter.com-style): many
// small bubbles up top, launcher clearly visible below. Phones still get a
// finger-friendly floor via the min; monitors get a wide grid via the max.
const colsForWidth = (w) => Math.max(10, Math.min(34, Math.round(w / 42)))
const FLY_SPEED = 1500
const MAX_ANG = 1.25 // radians off vertical
const TIPS = [
  'Cancel one subscription you forgot about — most budgets quietly carry two.',
  'Late fees and bank fees are pure waste: autopay the minimum and they vanish.',
  'Impulse rule: anything over $25 waits 48 hours in the cart before you buy.',
  'A $6 daily latte is about $2,190 a year — brew-at-home weeks add up fast.',
  'Scan every receipt: a leak you can see is a leak you can plug.',
]

const fmt = (n) => n.toLocaleString()
const key = (r, c) => `${r},${c}`

// ─── geometry (odd rows shift right by R; parityOff flips on row insert) ───
const TOP_PAD = 46 // clears the HUD strip

function makeGeo(w, cols) {
  const R = w / (2 * cols + 1)
  return { R, rowH: R * Math.sqrt(3) }
}
function cellXY(geo, parityOff, r, c) {
  const shift = (r + parityOff) % 2
  return { x: geo.R + c * 2 * geo.R + shift * geo.R, y: TOP_PAD + geo.R + r * geo.rowH }
}
function neighbors(parityOff, r, c) {
  const shifted = (r + parityOff) % 2 // this row sits R to the right
  const side = shifted ? [[-1, 0], [-1, 1], [1, 0], [1, 1]] : [[-1, -1], [-1, 0], [1, -1], [1, 0]]
  return [[0, -1], [0, 1], ...side].map(([dr, dc]) => [r + dr, c + dc])
}

function colorsInPlay(sim) {
  const set = new Set()
  for (const ci of sim.grid.values()) set.add(ci)
  return set.size ? [...set] : [0]
}
const randOf = (arr) => arr[Math.floor(Math.random() * arr.length)]

function buildBoard(sim) {
  sim.grid = new Map()
  sim.parityOff = 0
  const palette = [...Array(sim.colors).keys()]
  for (let r = 0; r < START_ROWS; r++)
    for (let c = 0; c < sim.cols; c++)
      sim.grid.set(key(r, c), randOf(palette))
  sim.cur = randOf(palette)
  sim.nxt = randOf(palette)
}

const freshSim = () => ({
  grid: new Map(), parityOff: 0, cols: 12,
  cur: 0, nxt: 0, fly: null,
  falls: [], parts: [],
  aim: { on: false, ang: 0 },
  level: 1, colors: 4, shotsPerRow: 8, shots: 8,
  score: 0, combo: 0,
})

export default function BubbleBudget() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const playsRef = useRef(0)
  const toastTimer = useRef(null)
  const audioRef = useRef({ ctx: null, muted: false })

  const [status, setStatus] = useState('idle') // idle | playing | paused | over
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [muted, setMuted] = useState(false)
  const [saveState, setSaveState] = useState(null) // saveGameScore result: { signedIn, saved, gm }
  const [tipIdx, setTipIdx] = useState(0)
  const [toast, setToast] = useState('')
  const [, bumpHud] = useState(0) // re-render for next-bubble preview

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1500)
  }

  // ─── sound: tiny WebAudio synth, context created on first gesture ────────
  const tone = useCallback(({ f0, f1, t = 0.1, type = 'sine', g = 0.16, at = 0 }) => {
    const a = audioRef.current
    if (a.muted) return
    try {
      if (!a.ctx) a.ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (a.ctx.state === 'suspended') a.ctx.resume()
      const now = a.ctx.currentTime + at
      const osc = a.ctx.createOscillator()
      const gain = a.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(f0, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1 ?? f0), now + t)
      gain.gain.setValueAtTime(g, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + t)
      osc.connect(gain).connect(a.ctx.destination)
      osc.start(now); osc.stop(now + t + 0.02)
    } catch {}
  }, [])
  const sfx = useCallback((name, n = 1) => {
    switch (name) {
      case 'shoot': tone({ f0: 240, f1: 540, t: 0.09, type: 'square', g: 0.08 }); break
      case 'bounce': tone({ f0: 190, f1: 150, t: 0.05, type: 'triangle', g: 0.1 }); break
      case 'stick': tone({ f0: 330, f1: 260, t: 0.06, g: 0.12 }); break
      case 'pop': for (let i = 0; i < Math.min(n, 9); i++) tone({ f0: 430 * (1 + i * 0.13), f1: 900, t: 0.09, g: 0.14, at: i * 0.045 }); break
      case 'fall': tone({ f0: 520, f1: 140, t: 0.3, type: 'sawtooth', g: 0.09 }); break
      case 'row': tone({ f0: 120, f1: 75, t: 0.16, type: 'square', g: 0.12 }); break
      case 'swap': tone({ f0: 300, f1: 380, t: 0.06, g: 0.1 }); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.14, g: 0.16, at: i * 0.09 })); break
      case 'lose': [330, 262, 196].forEach((f, i) => tone({ f0: f, f1: f * 0.92, t: 0.24, type: 'triangle', g: 0.16, at: i * 0.16 })); break
      default: break
    }
  }, [tone])
  const toggleMute = () => {
    const m = !audioRef.current.muted
    audioRef.current.muted = m
    setMuted(m)
    try { localStorage.setItem(SOUND_KEY, m ? 'off' : 'on') } catch {}
  }

  // ─── board logic ─────────────────────────────────────────────────────────
  const shooterPos = () => {
    const { w, h } = sizeRef.current
    return { x: w / 2, y: h - 78 }
  }
  const dangerY = () => sizeRef.current.h - 165

  function snapCell(sim, geo, x, y) {
    const r = Math.max(0, Math.round((y - TOP_PAD - geo.R) / geo.rowH))
    const shift = (r + sim.parityOff) % 2
    let c = Math.round((x - geo.R - shift * geo.R) / (2 * geo.R))
    c = Math.max(0, Math.min(sim.cols - 1, c))
    if (!sim.grid.has(key(r, c))) return [r, c]
    // occupied — pick the nearest free neighbor cell
    let bestCell = null, bestD = Infinity
    for (const [nr, nc] of neighbors(sim.parityOff, r, c)) {
      if (nr < 0 || nc < 0 || nc > sim.cols - 1 || sim.grid.has(key(nr, nc))) continue
      const p = cellXY(geo, sim.parityOff, nr, nc)
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < bestD) { bestD = d; bestCell = [nr, nc] }
    }
    return bestCell || [r + 1, c]
  }

  function burst(sim, x, y, color, txt) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 150
      sim.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, life: 0.45 + Math.random() * 0.25, size: 2.5 + Math.random() * 3, color })
    }
    if (txt) sim.parts.push({ txt, x, y, vy: -55, life: 0.9, color: GREEN })
  }

  function floodSame(sim, r, c, ci) {
    const out = [], seen = new Set([key(r, c)]), stack = [[r, c]]
    while (stack.length) {
      const [cr, cc] = stack.pop()
      out.push([cr, cc])
      for (const [nr, nc] of neighbors(sim.parityOff, cr, cc)) {
        const k = key(nr, nc)
        if (seen.has(k) || sim.grid.get(k) !== ci) continue
        seen.add(k); stack.push([nr, nc])
      }
    }
    return out
  }

  function dropOrphans(sim, geo) {
    const seen = new Set()
    const stack = []
    for (let c = 0; c < sim.cols; c++) if (sim.grid.has(key(0, c))) { seen.add(key(0, c)); stack.push([0, c]) }
    while (stack.length) {
      const [cr, cc] = stack.pop()
      for (const [nr, nc] of neighbors(sim.parityOff, cr, cc)) {
        const k = key(nr, nc)
        if (seen.has(k) || !sim.grid.has(k)) continue
        seen.add(k); stack.push([nr, nc])
      }
    }
    let dropped = 0
    for (const [k, ci] of [...sim.grid]) {
      if (seen.has(k)) continue
      const [r, c] = k.split(',').map(Number)
      const p = cellXY(geo, sim.parityOff, r, c)
      sim.grid.delete(k)
      sim.falls.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 120, vy: -60, ci })
      dropped++
    }
    return dropped
  }

  function insertRow(sim) {
    const next = new Map()
    for (const [k, ci] of sim.grid) {
      const [r, c] = k.split(',').map(Number)
      next.set(key(r + 1, c), ci)
    }
    sim.grid = next
    sim.parityOff ^= 1
    const palette = [...Array(sim.colors).keys()]
    for (let c = 0; c < sim.cols; c++) if (Math.random() < 0.92) sim.grid.set(key(0, c), randOf(palette))
    sfx('row')
  }

  function lowestY(sim, geo) {
    let low = 0
    for (const k of sim.grid.keys()) {
      const r = Number(k.split(',')[0])
      const y = TOP_PAD + geo.R + r * geo.rowH
      if (y > low) low = y
    }
    return low
  }

  const endGame = (sim, won) => {
    cancelAnimationFrame(rafRef.current)
    sfx(won ? 'win' : 'lose')
    // Signed-in players get the score on their account (migration_078) and
    // the first game each day earns GuacMoney; best-effort — never blocks.
    saveGameScore('bubbles', sim.score, sim.level).then(setSaveState)
    if (sim.score > bestRef.current) {
      bestRef.current = sim.score
      setBest(sim.score)
      setNewBest(true)
      try { localStorage.setItem(BEST_KEY, String(sim.score)) } catch {}
    } else setNewBest(false)
    setTipIdx((playsRef.current - 1) % TIPS.length)
    setPhase('over')
    draw(sim)
  }

  function levelUp(sim) {
    sim.level += 1
    sim.score += 150 * sim.level
    sim.colors = Math.min(KINDS.length, 3 + sim.level)
    sim.shotsPerRow = Math.max(4, 9 - sim.level)
    sim.shots = sim.shotsPerRow
    buildBoard(sim)
    setScore(sim.score); setLevel(sim.level)
    showToast(`Level ${sim.level}! 🥑 +$${fmt(150 * sim.level)}`)
    sfx('win')
  }

  function landBubble(sim, geo, x, y) {
    const [r, c] = snapCell(sim, geo, x, y)
    const ci = sim.fly.ci
    sim.fly = null
    sim.grid.set(key(r, c), ci)
    const cluster = floodSame(sim, r, c, ci)
    if (cluster.length >= 3) {
      for (const [cr, cc] of cluster) {
        const p = cellXY(geo, sim.parityOff, cr, cc)
        sim.grid.delete(key(cr, cc))
        burst(sim, p.x, p.y, KINDS[ci].color)
      }
      const dropped = dropOrphans(sim, geo)
      const gain = cluster.length * 10 + dropped * 25
      sim.score += gain
      sim.combo += 1
      const p = cellXY(geo, sim.parityOff, r, c)
      sim.parts.push({ txt: `+$${fmt(gain)}`, x: p.x, y: Math.max(24, p.y), vy: -55, life: 0.9, color: GREEN })
      sfx('pop', cluster.length)
      if (dropped) sfx('fall')
      if (sim.combo >= 2) showToast(`${sim.combo} pops in a row! 💥`)
      setScore(sim.score)
      if (sim.grid.size === 0) { levelUp(sim); return }
    } else {
      sim.combo = 0
      sfx('stick')
      sim.shots -= 1
      if (sim.shots <= 0) {
        insertRow(sim)
        sim.shots = sim.shotsPerRow
      }
    }
    bumpHud(n => n + 1)
    if (lowestY(sim, geo) + geo.R >= dangerY()) endGame(sim, false)
  }

  // ─── render ──────────────────────────────────────────────────────────────
  function drawBubbleAt(ctx, x, y, R, ci) {
    const kind = KINDS[ci]
    const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.15, x, y, R)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.25, kind.color)
    g.addColorStop(1, kind.dark)
    ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2)
    ctx.fillStyle = g; ctx.fill()
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `${Math.round(R * 0.85)}px system-ui, sans-serif`
    ctx.fillText(kind.emoji, x, y + 1)
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const geo = makeGeo(w, sim.cols)
    const ctx = cvs.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    // board bubbles
    for (const [k, ci] of sim.grid) {
      const [r, c] = k.split(',').map(Number)
      const p = cellXY(geo, sim.parityOff, r, c)
      drawBubbleAt(ctx, p.x, p.y, geo.R, ci)
    }

    // danger line
    const dy = dangerY()
    const close = lowestY(sim, geo) + geo.R > dy - geo.rowH * 1.5
    ctx.setLineDash([7, 7])
    ctx.lineWidth = 2
    ctx.strokeStyle = close ? 'rgba(225,29,72,0.55)' : 'rgba(20,83,45,0.18)'
    ctx.beginPath(); ctx.moveTo(10, dy); ctx.lineTo(w - 10, dy); ctx.stroke()
    ctx.setLineDash([])

    const S = shooterPos()

    // aim guide with wall reflections
    if (sim.aim.on && statusRef.current === 'playing' && !sim.fly) {
      let px = S.x, py = S.y
      let dx = Math.sin(sim.aim.ang), dyy = -Math.cos(sim.aim.ang)
      ctx.fillStyle = 'rgba(20,83,45,0.35)'
      let traveled = 0
      const stepLen = 22
      while (traveled < 1400 && py > TOP_PAD + geo.R) {
        px += dx * stepLen; py += dyy * stepLen; traveled += stepLen
        if (px < geo.R) { px = geo.R + (geo.R - px); dx = -dx }
        if (px > w - geo.R) { px = (w - geo.R) - (px - (w - geo.R)); dx = -dx }
        let hit = false
        for (const [k] of sim.grid) {
          const [r, c] = k.split(',').map(Number)
          const p = cellXY(geo, sim.parityOff, r, c)
          if ((p.x - px) ** 2 + (p.y - py) ** 2 < (geo.R * 1.8) ** 2) { hit = true; break }
        }
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill()
        if (hit) break
      }
    }

    // flying bubble
    if (sim.fly) drawBubbleAt(ctx, sim.fly.x, sim.fly.y, geo.R, sim.fly.ci)

    // falling bubbles
    for (const f of sim.falls) drawBubbleAt(ctx, f.x, f.y, geo.R, f.ci)

    // launcher: base ring + current bubble
    ctx.beginPath(); ctx.arc(S.x, S.y, geo.R + 9, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill()
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(20,83,45,0.22)'; ctx.stroke()
    if (statusRef.current !== 'over') drawBubbleAt(ctx, S.x, S.y, geo.R, sim.cur)

    // particles
    for (const p of sim.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2))
      ctx.fillStyle = p.color
      if (p.txt) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = "800 18px 'Bricolage Grotesque', system-ui, sans-serif"
        ctx.fillText(p.txt, p.x, p.y)
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  }

  function step(sim, dt) {
    const { w, h } = sizeRef.current
    const geo = makeGeo(w, sim.cols)
    if (sim.fly) {
      const f = sim.fly
      f.x += f.vx * dt; f.y += f.vy * dt
      if (f.x < geo.R) { f.x = geo.R + (geo.R - f.x); f.vx = -f.vx; sfx('bounce') }
      if (f.x > w - geo.R) { f.x = (w - geo.R) - (f.x - (w - geo.R)); f.vx = -f.vx; sfx('bounce') }
      let hit = f.y <= TOP_PAD + geo.R
      if (!hit) {
        for (const [k] of sim.grid) {
          const [r, c] = k.split(',').map(Number)
          const p = cellXY(geo, sim.parityOff, r, c)
          if ((p.x - f.x) ** 2 + (p.y - f.y) ** 2 < (geo.R * 1.82) ** 2) { hit = true; break }
        }
      }
      if (hit) landBubble(sim, geo, f.x, f.y)
    }
    for (let i = sim.falls.length - 1; i >= 0; i--) {
      const f = sim.falls[i]
      f.vy += 1600 * dt
      f.x += f.vx * dt; f.y += f.vy * dt
      if (f.y > h + geo.R * 2) sim.falls.splice(i, 1)
    }
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i]
      p.life -= dt
      if (p.life <= 0) { sim.parts.splice(i, 1); continue }
      p.x += (p.vx || 0) * dt
      p.y += p.vy * dt
      if (!p.txt) p.vy += 320 * dt
    }
  }

  function loop(ts) {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    if (!sim) return
    const dt = Math.min(0.05, Math.max(0, (ts - lastRef.current) / 1000))
    lastRef.current = ts
    step(sim, dt)
    draw(sim)
    rafRef.current = requestAnimationFrame(loop)
  }

  const start = () => {
    const sim = freshSim()
    sim.cols = colsForWidth(sizeRef.current.w || 800)
    buildBoard(sim)
    simRef.current = sim
    setScore(0); setLevel(1); setSaveState(null)
    playsRef.current += 1
    setPhase('playing')
    lastRef.current = performance.now()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return
    cancelAnimationFrame(rafRef.current)
    statusRef.current = 'paused'
    setStatus('paused')
  }, [])

  const resume = () => {
    if (statusRef.current !== 'paused') return
    setPhase('playing')
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
  }

  const swap = () => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing' || sim.fly) return
    ;[sim.cur, sim.nxt] = [sim.nxt, sim.cur]
    sfx('swap')
    bumpHud(n => n + 1)
  }

  // ─── aiming (pointer events cover mouse + touch) ─────────────────────────
  const angleFor = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left, py = e.clientY - rect.top
    const S = shooterPos()
    const dx = px - S.x, dy = py - S.y
    if (dy >= -6) return dx >= 0 ? MAX_ANG : -MAX_ANG // pointer at/below the launcher
    const ang = Math.atan2(dx, -dy)
    return Math.max(-MAX_ANG, Math.min(MAX_ANG, ang))
  }
  const onDown = (e) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const sim = simRef.current
    sim.aim.on = true
    sim.aim.ang = angleFor(e)
  }
  const onMove = (e) => {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    sim.aim.ang = angleFor(e)
    if (!sim.fly && !sim.aim.on) { sim.aim.on = true } // mouse hover aims too
  }
  const onUp = (e) => {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    if (!sim.aim.on || sim.fly) return
    sim.aim.on = false
    const ang = angleFor(e)
    sim.fly = {
      x: shooterPos().x, y: shooterPos().y,
      vx: Math.sin(ang) * FLY_SPEED, vy: -Math.cos(ang) * FLY_SPEED,
      ci: sim.cur,
    }
    sim.cur = sim.nxt
    sim.nxt = randOf(colorsInPlay(sim))
    sfx('shoot')
    bumpHud(n => n + 1)
  }

  // Load best + sound pref once
  useEffect(() => {
    try {
      const b = parseInt(localStorage.getItem(BEST_KEY), 10)
      if (Number.isFinite(b) && b > 0) { bestRef.current = b; setBest(b) }
      const s = localStorage.getItem(SOUND_KEY)
      if (s === 'off') { audioRef.current.muted = true; setMuted(true) }
    } catch {}
  }, [])

  // Canvas sizing with devicePixelRatio scaling; logic runs in CSS pixels
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

  // Auto-pause when the tab blurs or hides
  useEffect(() => {
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [pause])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(toastTimer.current)
    try { audioRef.current.ctx?.close() } catch {}
  }, [])

  const sim = simRef.current
  const shotsLeft = sim && status !== 'idle' ? sim.shots : null

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)', border: CARD_BORDER }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: status === 'playing' ? 'crosshair' : 'default' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Banked </span>
              <span className="font-display font-extrabold text-lg" style={{ color: GREEN }}>${fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: FAINT }}>Level </span>
              <span className="font-display font-bold text-sm" style={{ color: MUTED }}>{level}</span>
            </div>
            {shotsLeft != null && status !== 'over' && (
              <div>
                <span className="text-[11px] font-semibold" style={{ color: FAINT }}>Next row in </span>
                <span className="font-display font-bold text-sm" style={{ color: shotsLeft <= 2 ? ROSE : MUTED }}>{shotsLeft}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <button onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} className="text-xs font-bold px-2.5 py-1.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
              {muted ? '🔇' : '🔊'}
            </button>
            {status === 'playing' && (
              <button onClick={pause} className="text-xs font-bold px-3 py-1.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>⏸ Pause</button>
            )}
          </div>
        </div>

        {/* next-bubble preview / swap */}
        {status === 'playing' && sim && (
          <button
            onClick={swap}
            className="absolute bottom-4 flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-full border bg-white"
            style={{ left: 14, borderColor: 'rgba(20,83,45,0.18)', color: MUTED }}
            aria-label="Swap with next bubble"
          >
            Next
            <span
              className="inline-flex items-center justify-center rounded-full text-sm"
              style={{ width: 26, height: 26, background: KINDS[sim.nxt].color, boxShadow: 'inset -2px -3px 6px rgba(0,0,0,0.25)' }}
            >{KINDS[sim.nxt].emoji}</span>
            ⇄
          </button>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full" style={{ background: INK, color: '#fff', pointerEvents: 'none' }}>{toast}</div>
        )}

        {/* Idle start overlay */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(242,251,243,0.9)' }}>
            <div className="rounded-2xl bg-white p-5 text-center w-full max-h-full overflow-y-auto" style={{ border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-4xl mb-1">🫧</div>
              <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Bubble Pop</div>
              <p className="text-sm mb-1" style={{ color: BODY }}>
                Aim, shoot, and <b style={{ color: GREEN }}>match 3+ spending bubbles</b> to pop them and bank the dollars. Cut a cluster loose and the whole thing falls for bonus cash.
              </p>
              <p className="text-sm mb-3" style={{ color: BODY }}>
                Every few shots the wall pushes down — don&apos;t let it cross the line. Clear the board to level up!
              </p>
              {best > 0 && (
                <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best game: ${fmt(best)} banked</div>
              )}
              <button onClick={start} className="text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Start popping</button>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INGRID || '1890940391'} minHeight={250} className="mt-4" />
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(242,251,243,0.9)' }}>
            <div className="rounded-2xl bg-white p-5 text-center w-full" style={{ border: CARD_BORDER, maxWidth: 300 }}>
              <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
              <p className="text-xs mb-3" style={{ color: MUTED }}>${fmt(score)} banked so far — the bubbles will wait.</p>
              <div className="flex justify-center gap-2">
                <button onClick={resume} className="text-sm font-bold px-5 py-2 rounded-full text-white" style={{ background: GREEN }}>Resume</button>
                <button onClick={() => setPhase('idle')} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>Quit</button>
              </div>
            </div>
          </div>
        )}

        {/* Game-over card */}
        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(242,251,243,0.9)' }}>
            <div className="rounded-2xl bg-white p-5 text-center w-full max-h-full overflow-y-auto" style={{ border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-3xl mb-1">🫧💥</div>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>The wall got you!</div>
              <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>${fmt(score)}</div>
              <div className="text-[11px] font-semibold" style={{ color: MUTED }}>banked this game</div>
              <div className="flex justify-center gap-8 mt-3">
                <div>
                  <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{level}</div>
                  <div className="text-[11px]" style={{ color: FAINT }}>level reached</div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>${fmt(best)}</div>
                  <div className="text-[11px]" style={{ color: FAINT }}>best banked</div>
                </div>
              </div>
              {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
              {saveState?.gm > 0 && (
                <div className="text-xs font-bold mt-2 inline-block px-3 py-1 rounded-full" style={{ background: '#f2fbf3', color: '#065f46' }}>
                  🥑 +{saveState.gm} GuacMoney — first game today
                </div>
              )}
              {saveState?.saved && !saveState?.gm && (
                <div className="text-xs font-bold mt-2" style={{ color: GREEN }}>✓ Score saved to your account</div>
              )}
              {saveState?.signedIn === false && (
                <div className="text-xs mt-2" style={{ color: MUTED }}>
                  <a href="/login" className="font-bold" style={{ color: '#065f46' }}>Sign in</a> to earn GuacMoney for playing and keep your scores.
                </div>
              )}
              <p className="text-xs mt-3" style={{ color: BODY }}>💡 {TIPS[tipIdx]}</p>
              <button onClick={start} className="mt-4 text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Play again</button>
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INGRID || '1890940391'} minHeight={250} className="mt-4" />
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Aim with your mouse or finger, release to fire. Match 3+ of a color to pop · cut clusters loose for bonus dollars · tap Next to swap bubbles.
      </p>
    </div>
  )
}
