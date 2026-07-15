'use client'
// Guac Muncher — classic maze coin-chomper. The avocado eats every coin in
// the maze while four ghosts hunt it; power coins turn the tables for a few
// seconds. Entities move along tile-graph edges (center → center) so movement
// can't drift; ghosts pick edges greedily toward a target tile (scatter /
// chase / frightened / eyes-home), classic-style, with no mid-edge reversal.
// Sim lives in refs + rAF; React state is only HUD. Sounds are synthesized.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, ROSE, fmt, surfaceBg,
} from './arcadeKit'

const BEST_KEY = 'gg-muncher-best-v1'

// Validated 19×20 maze (scripts flood-fill check: all coins reachable, no
// dead ends). '#' wall · '.' coin · 'o' power coin · '=' ghost door ·
// 'G' house · 'P' player start · ' ' tunnel corridor (wraps horizontally).
const MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.##..#..##.####',
  '####.#.......#.####',
  '####.#.##=##.#.####',
  '    ...#GGG#...    ',
  '####.#.#####.#.####',
  '####.#.......#.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
]
const ROWS = MAZE.length
const COLS = MAZE[0].length
const DOOR = { r: 8, c: 9 }
const HOUSE = { r: 9, c: 9 }
const PLAYER_START = { r: 14, c: 9 }

const DIRS = [
  { dr: 0, dc: 1 },  // 0 right
  { dr: 1, dc: 0 },  // 1 down
  { dr: 0, dc: -1 }, // 2 left
  { dr: -1, dc: 0 }, // 3 up
]
const OPP = (d) => (d + 2) % 4

const GHOSTS = [
  { color: '#EF4444', scatter: { r: 0, c: COLS - 2 } },
  { color: '#EC4899', scatter: { r: 0, c: 1 } },
  { color: '#22D3EE', scatter: { r: ROWS - 1, c: COLS - 2 } },
  { color: '#F97316', scatter: { r: ROWS - 1, c: 1 } },
]

const SCATTER_T = 7
const CHASE_T = 20
const FRIGHT_T = 6

const wrapC = (c) => ((c % COLS) + COLS) % COLS
const cellCh = (r, c) => (MAZE[r] ? MAZE[r][wrapC(c)] : '#')

function passable(r, c, ent) {
  const ch = cellCh(r, c)
  if (ch === '#') return false
  if (ch === '=') return !!ent.ghost && (ent.state === 'eyes' || ent.state === 'exit')
  if (ch === 'G') return !!ent.ghost
  return true
}

const dist2 = (r1, c1, r2, c2) => (r1 - r2) ** 2 + (c1 - c2) ** 2

// Edge-walker position: entity sits at tile (r,c) moving toward (nr,nc) with
// progress 0..1. Render position is the lerp of the two tile centers.
function renderPos(e) {
  const x = (wrapC(e.c) + 0.5) + ((e.nc - e.c) * e.prog)
  const y = (e.r + 0.5) + ((e.nr - e.r) * e.prog)
  return { x, y }
}

function freshGhost(i, level) {
  const inHouse = i > 0
  return {
    ghost: true, i,
    r: inHouse ? HOUSE.r : DOOR.r - 1,
    c: inHouse ? HOUSE.c + (i - 2) : DOOR.c,
    nr: 0, nc: 0, prog: 0, dir: -1, // decided on first tick (sets the edge target)
    state: inHouse ? 'idle' : 'normal', // idle | exit | normal | eyes
    fright: 0,
    releaseAt: inHouse ? i * 2.2 : 0,
  }
}

function buildCoins() {
  const coins = new Map()
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c]
      if (ch === '.') coins.set(`${r},${c}`, 1)
      else if (ch === 'o') coins.set(`${r},${c}`, 2)
    }
  return coins
}

const freshSim = () => ({
  coins: buildCoins(),
  player: { ghost: false, r: PLAYER_START.r, c: PLAYER_START.c, nr: 0, nc: 0, prog: 0, dir: -1, want: 2, mouth: 0 },
  ghosts: GHOSTS.map((_, i) => freshGhost(i, 1)),
  mode: 'scatter', modeT: SCATTER_T, fright: 0, combo: 0,
  level: 1, lives: 3, score: 0, speed: 6.0,
  clock: 0, freeze: 0, parts: [],
  waka: 0,
})

export default function GuacMuncher() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const swipeRef = useRef(null)
  const toastTimer = useRef(null)

  const [status, setStatus] = useState('idle') // idle | playing | paused | over
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [toast, setToast] = useState('')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('muncher')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1400)
  }

  const sfx = (name) => {
    switch (name) {
      case 'waka': tone({ f0: simRef.current?.waka ? 340 : 260, f1: simRef.current?.waka ? 260 : 340, t: 0.06, type: 'square', g: 0.05 }); break
      case 'power': tone({ f0: 520, f1: 180, t: 0.35, type: 'sawtooth', g: 0.1 }); break
      case 'ghost': tone({ f0: 300, f1: 900, t: 0.25, type: 'square', g: 0.12 }); break
      case 'death': [500, 380, 260, 160].forEach((f, i) => tone({ f0: f, f1: f * 0.7, t: 0.18, type: 'triangle', g: 0.14, at: i * 0.14 })); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.14, g: 0.16, at: i * 0.09 })); break
      case 'start': [262, 330, 392].forEach((f, i) => tone({ f0: f, t: 0.12, g: 0.12, at: i * 0.08 })); break
      default: break
    }
  }

  // ─── movement ─────────────────────────────────────────────────────────────
  function tryDir(e, d) {
    if (d < 0) return false
    const { dr, dc } = DIRS[d]
    return passable(e.r + dr, wrapC(e.c + dc), e)
  }
  function setEdge(e, d) {
    e.dir = d
    e.nr = e.r + DIRS[d].dr
    e.nc = e.c + DIRS[d].dc
  }

  function ghostSpeed(sim, g) {
    if (g.state === 'eyes') return sim.speed * 1.6
    if (g.fright > 0) return sim.speed * 0.62
    // tunnel rows are slower, classic-style
    if (cellCh(g.r, g.c) === ' ') return sim.speed * 0.55
    return sim.speed * 0.88
  }

  function ghostTarget(sim, g) {
    const p = sim.player
    if (g.state === 'eyes') return HOUSE
    if (g.state === 'exit') return { r: DOOR.r - 1, c: DOOR.c }
    if (sim.mode === 'scatter') return GHOSTS[g.i].scatter
    switch (g.i) {
      case 0: return { r: p.r, c: p.c }
      case 1: { const d = p.dir >= 0 ? DIRS[p.dir] : DIRS[2]; return { r: p.r + d.dr * 4, c: p.c + d.dc * 4 } }
      case 2: { const d = p.dir >= 0 ? DIRS[p.dir] : DIRS[2]; return { r: p.r - d.dr * 4, c: p.c - d.dc * 4 } }
      default: return dist2(g.r, g.c, p.r, p.c) > 64 ? { r: p.r, c: p.c } : GHOSTS[3].scatter
    }
  }

  function ghostDecide(sim, g) {
    const opts = []
    for (let d = 0; d < 4; d++) {
      if (g.dir >= 0 && d === OPP(g.dir)) continue
      if (tryDir(g, d)) opts.push(d)
    }
    if (opts.length === 0) { setEdge(g, OPP(g.dir)); return }
    let d
    if (g.fright > 0 && g.state === 'normal') {
      d = opts[Math.floor(Math.random() * opts.length)]
    } else {
      const t = ghostTarget(sim, g)
      d = opts[0]
      let bd = Infinity
      for (const o of opts) {
        const dd = dist2(g.r + DIRS[o].dr, wrapC(g.c + DIRS[o].dc), t.r, t.c)
        if (dd < bd) { bd = dd; d = o }
      }
    }
    setEdge(g, d)
  }

  function arriveGhost(sim, g) {
    g.r = g.nr; g.c = wrapC(g.nc)
    if (g.state === 'eyes' && g.r === HOUSE.r && Math.abs(g.c - HOUSE.c) <= 1) {
      g.state = 'exit'; g.fright = 0; g.dir = -1
    }
    if (g.state === 'exit' && g.r === DOOR.r - 1 && g.c === DOOR.c) {
      g.state = 'normal'
      setEdge(g, tryDir(g, 2) ? 2 : 0)
      return
    }
    ghostDecide(sim, g)
  }

  function arrivePlayer(sim) {
    const p = sim.player
    p.r = p.nr; p.c = wrapC(p.nc)
    const k = `${p.r},${p.c}`
    const coin = sim.coins.get(k)
    if (coin) {
      sim.coins.delete(k)
      sim.waka ^= 1
      sfx('waka')
      if (coin === 2) {
        sim.score += 50
        sim.fright = FRIGHT_T
        sim.combo = 0
        for (const g of sim.ghosts) {
          if (g.state === 'normal') { g.fright = FRIGHT_T; if (g.dir >= 0) setEdge(g, OPP(g.dir)) }
          else if (g.state === 'idle' || g.state === 'exit') g.fright = FRIGHT_T
        }
        sfx('power')
      } else {
        sim.score += 10
      }
      setScore(sim.score)
      if (sim.coins.size === 0) { levelUp(sim); return }
    }
    // choose next edge: buffered wish first, then current dir
    if (tryDir(p, p.want)) setEdge(p, p.want)
    else if (p.dir >= 0 && tryDir(p, p.dir)) setEdge(p, p.dir)
    else p.dir = -1 // stopped at center
  }

  function walk(sim, e, speed, dt, arrive) {
    if (e.dir < 0) return
    e.prog += speed * dt
    while (e.prog >= 1) {
      e.prog -= 1
      arrive(sim, e)
      // stop consuming leftover progress if the entity halted or the board
      // was rebuilt/frozen mid-arrival (level-up, death, game over)
      if (e.dir < 0) { e.prog = 0; break }
      if (sim.freeze > 0 || statusRef.current !== 'playing') break
    }
  }

  function levelUp(sim) {
    sim.level += 1
    sim.score += 500
    sim.speed *= 1.06
    sim.coins = buildCoins()
    resetEntities(sim, true)
    sim.freeze = 1.2
    setScore(sim.score); setLevel(sim.level)
    showToast(`Level ${sim.level}! 🥑 +500`)
    sfx('win')
  }

  function resetEntities(sim, fast) {
    sim.player = { ...sim.player, r: PLAYER_START.r, c: PLAYER_START.c, nr: 0, nc: 0, prog: 0, dir: -1, want: 2 }
    sim.ghosts = GHOSTS.map((_, i) => {
      const g = freshGhost(i, sim.level)
      if (fast) g.releaseAt = i * 1.2
      g.releaseAt += sim.clock
      return g
    })
    sim.fright = 0
    sim.mode = 'scatter'
    sim.modeT = SCATTER_T
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    save(sim.score, sim.level)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function killPlayer(sim) {
    sfx('death')
    sim.lives -= 1
    setLives(sim.lives)
    if (sim.lives <= 0) { endGame(sim); return }
    resetEntities(sim, true)
    sim.freeze = 1.4
    showToast('Ouch! 👻')
  }

  // ─── tick ─────────────────────────────────────────────────────────────────
  function step(sim, dt) {
    sim.clock += dt
    if (sim.freeze > 0) { sim.freeze -= dt; return }

    if (sim.fright > 0) {
      sim.fright -= dt
      if (sim.fright <= 0) { sim.combo = 0; for (const g of sim.ghosts) g.fright = 0 }
    } else {
      sim.modeT -= dt
      if (sim.modeT <= 0) {
        sim.mode = sim.mode === 'scatter' ? 'chase' : 'scatter'
        sim.modeT = sim.mode === 'scatter' ? SCATTER_T : CHASE_T
        for (const g of sim.ghosts) if (g.state === 'normal' && g.dir >= 0) setEdge(g, OPP(g.dir))
      }
    }
    for (const g of sim.ghosts) if (g.fright > 0) g.fright -= dt

    const p = sim.player
    p.mouth += dt * 9
    if (p.dir < 0 && tryDir(p, p.want)) setEdge(p, p.want)
    walk(sim, p, sim.speed, dt, arrivePlayer)
    if (statusRef.current !== 'playing') return

    for (const g of sim.ghosts) {
      if (g.state === 'idle') {
        if (sim.clock >= g.releaseAt) { g.state = 'exit'; g.dir = -1; g.prog = 0 }
        else continue
      }
      if (g.dir < 0) ghostDecide(sim, g)
      walk(sim, g, ghostSpeed(sim, g), dt, arriveGhost)
    }

    // collisions (render-space distance)
    const pp = renderPos(p)
    for (const g of sim.ghosts) {
      if (g.state === 'eyes' || g.state === 'idle') continue
      const gp = renderPos(g)
      if ((pp.x - gp.x) ** 2 + (pp.y - gp.y) ** 2 < 0.45) {
        if (g.fright > 0) {
          sim.combo += 1
          const gain = 200 * sim.combo
          sim.score += gain
          setScore(sim.score)
          sim.parts.push({ txt: `+${fmt(gain)}`, x: gp.x, y: gp.y, vy: -1.6, life: 0.9 })
          g.state = 'eyes'; g.fright = 0
          sfx('ghost')
        } else {
          killPlayer(sim)
          return
        }
      }
    }

    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const pt = sim.parts[i]
      pt.life -= dt
      pt.y += pt.vy * dt
      if (pt.life <= 0) sim.parts.splice(i, 1)
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function boardGeo() {
    const { w, h } = sizeRef.current
    const tile = Math.min((w - 8) / COLS, (h - 64) / ROWS)
    const ox = (w - COLS * tile) / 2
    const oy = 56 + (h - 64 - ROWS * tile) / 2
    return { tile, ox, oy }
  }

  function drawGhost(ctx, x, y, R, g, sim) {
    const frightened = g.fright > 0 && g.state === 'normal'
    const blink = frightened && sim.fright < 2 && Math.floor(sim.clock * 6) % 2 === 0
    const body = g.state === 'eyes' ? null : frightened ? (blink ? '#f8fafc' : '#1e3a8a') : GHOSTS[g.i].color
    if (body) {
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(x, y - R * 0.1, R, Math.PI, 0)
      const skirtY = y + R * 0.85
      ctx.lineTo(x + R, skirtY)
      for (let i = 0; i < 3; i++) {
        const x1 = x + R - ((i * 2 + 1) * R) / 3
        const x2 = x + R - ((i * 2 + 2) * R) / 3
        ctx.quadraticCurveTo(x1, skirtY - R * 0.35, x2, skirtY)
      }
      ctx.closePath()
      ctx.fill()
    }
    // eyes
    const d = g.dir >= 0 ? DIRS[g.dir] : { dr: 0, dc: 0 }
    for (const side of [-1, 1]) {
      const ex = x + side * R * 0.38, ey = y - R * 0.15
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.26, R * 0.32, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = frightened ? '#1e3a8a' : '#1d4ed8'
      ctx.beginPath(); ctx.arc(ex + d.dc * R * 0.12, ey + d.dr * R * 0.12, R * 0.13, 0, Math.PI * 2); ctx.fill()
    }
    if (frightened) {
      ctx.strokeStyle = blink ? '#1e3a8a' : '#f8fafc'
      ctx.lineWidth = Math.max(1, R * 0.09)
      ctx.beginPath()
      for (let i = 0; i <= 4; i++) {
        const zx = x - R * 0.5 + (i * R) / 4
        const zy = y + R * 0.42 + (i % 2 === 0 ? 0 : -R * 0.14)
        i === 0 ? ctx.moveTo(zx, zy) : ctx.lineTo(zx, zy)
      }
      ctx.stroke()
    }
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const { tile, ox, oy } = boardGeo()
    const ctx = cvs.getContext('2d')
    ctx.fillStyle = '#0b1712'
    ctx.fillRect(0, 0, w, h)

    // walls + coins
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = MAZE[r][c]
        const x = ox + c * tile, y = oy + r * tile
        if (ch === '#') {
          ctx.fillStyle = '#12352a'
          const inset = tile * 0.08
          ctx.beginPath()
          ctx.roundRect(x + inset, y + inset, tile - inset * 2, tile - inset * 2, tile * 0.22)
          ctx.fill()
        } else if (ch === '=') {
          ctx.fillStyle = '#8a978d'
          ctx.fillRect(x + tile * 0.15, y + tile * 0.42, tile * 0.7, tile * 0.16)
        }
      }
    }
    for (const [k, v] of sim.coins) {
      const [r, c] = k.split(',').map(Number)
      const x = ox + (c + 0.5) * tile, y = oy + (r + 0.5) * tile
      ctx.fillStyle = '#FBBF24'
      ctx.beginPath()
      if (v === 2) {
        const pulse = 1 + Math.sin(sim.clock * 6) * 0.18
        ctx.arc(x, y, tile * 0.24 * pulse, 0, Math.PI * 2)
      } else {
        ctx.arc(x, y, tile * 0.09, 0, Math.PI * 2)
      }
      ctx.fill()
    }

    // player — avocado-green chomper with animated mouth
    const p = sim.player
    const pp = renderPos(p)
    const px = ox + pp.x * tile, py = oy + pp.y * tile
    const R = tile * 0.46
    const mouth = p.dir >= 0 ? (Math.abs(Math.sin(p.mouth)) * 0.55 + 0.05) : 0.12
    const angBase = p.dir === 0 ? 0 : p.dir === 1 ? Math.PI / 2 : p.dir === 2 ? Math.PI : -Math.PI / 2
    ctx.fillStyle = '#A3E635'
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.arc(px, py, R, angBase + mouth, angBase - mouth + Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3f6212'
    ctx.beginPath()
    ctx.arc(px + Math.cos(angBase - Math.PI / 2.6) * R * 0.45, py + Math.sin(angBase - Math.PI / 2.6) * R * 0.45, R * 0.11, 0, Math.PI * 2)
    ctx.fill()

    // ghosts
    for (const g of sim.ghosts) {
      const gp = renderPos(g)
      drawGhost(ctx, ox + gp.x * tile, oy + gp.y * tile, tile * 0.44, g, sim)
    }

    // score popups
    for (const pt of sim.parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2))
      ctx.fillStyle = '#FBBF24'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `800 ${Math.round(tile * 0.55)}px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText(pt.txt, ox + pt.x * tile, oy + pt.y * tile)
      ctx.globalAlpha = 1
    }

    if (sim.freeze > 0 && statusRef.current === 'playing') {
      ctx.fillStyle = '#A3E635'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `800 ${Math.round(tile * 0.9)}px 'Bricolage Grotesque', system-ui, sans-serif`
      ctx.fillText('Ready!', ox + (COLS / 2) * tile, oy + (HOUSE.r + 2.5) * tile)
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
    const sim = freshSim()
    sim.freeze = 1.2
    simRef.current = sim
    setScore(0); setLevel(1); setLives(3); resetSave()
    setPhase('playing')
    sfx('start')
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

  // ─── input: arrows / WASD + swipe ─────────────────────────────────────────
  useEffect(() => {
    const keyDir = { ArrowRight: 0, d: 0, ArrowDown: 1, s: 1, ArrowLeft: 2, a: 2, ArrowUp: 3, w: 3 }
    const onKey = (e) => {
      const d = keyDir[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (d == null) return
      if (statusRef.current === 'playing') {
        e.preventDefault()
        simRef.current.player.want = d
      }
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = (e) => {
    swipeRef.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e) => {
    const s = swipeRef.current
    swipeRef.current = null
    if (!s || statusRef.current !== 'playing') return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    simRef.current.player.want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3)
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

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(470px, calc(100svh - 170px), 900px)', minHeight: 430, background: surfaceBg('field'), borderTop: '1px solid rgba(20,83,45,0.25)', borderBottom: '1px solid rgba(20,83,45,0.25)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#7ea88f' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#FBBF24' }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#5f8570' }}>Level </span>
              <span className="font-display font-bold text-sm" style={{ color: '#cde7d4' }}>{level}</span>
            </div>
            <div className="text-sm" aria-label={`${lives} lives`}>{'🥑'.repeat(Math.max(0, lives))}</div>
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
            <div className="text-4xl mb-1">🥑</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Guac Muncher</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              Chomp <b style={{ color: AMBER }}>every coin in the maze</b> while four ghosts hunt you down.
              Grab a big power coin and for a few seconds the ghosts run — bite them back for bonus coins.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Arrow keys / WASD on desktop, swipe on your phone. Clear the maze to level up — it only gets faster.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best run: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Start munching</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} so far — the ghosts will wait.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">👻💥</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>The ghosts got you!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>coins chomped</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>{level}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>level reached</div>
              </div>
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
        Arrow keys or WASD to steer · swipe on mobile · power coins let you bite the ghosts back · clear the maze to level up.
      </p>
    </div>
  )
}
