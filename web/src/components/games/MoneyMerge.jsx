'use client'
// Money Merge — 2048, GetGuac edition. Slide the board; equal dollar tiles
// merge and double. Turn scattered $1 tiles into one $2,048 — a tactile little
// lesson in compounding. Arrow keys / WASD or swipe.
import { useCallback, useEffect, useRef, useState } from 'react'

const GREEN = '#65A30D'
const INK = '#15281C'
const SIZE = 4

const TILE_STYLE = {
  1: ['#EEF4EA', INK], 2: ['#DFEDD2', INK], 4: ['#CAE3AF', INK], 8: ['#AED67F', INK],
  16: ['#8FC44F', '#fff'], 32: ['#74B02E', '#fff'], 64: ['#65A30D', '#fff'],
  128: ['#4F8A0B', '#fff'], 256: ['#3F7009', '#fff'], 512: ['#D9A514', '#fff'],
  1024: ['#C4920D', '#fff'], 2048: ['#A87B00', '#fff'],
}
const styleFor = (v) => TILE_STYLE[v] || ['#15281C', '#fff']
const fmt = (v) => `$${v.toLocaleString('en-US')}`

let nextId = 1
const makeTile = (r, c, v) => ({ id: nextId++, r, c, v, pop: true })

function spawnInto(tiles) {
  const used = new Set(tiles.map((t) => t.r * SIZE + t.c))
  const free = []
  for (let i = 0; i < SIZE * SIZE; i++) if (!used.has(i)) free.push(i)
  if (!free.length) return tiles
  const cell = free[Math.floor(Math.random() * free.length)]
  const v = Math.random() < 0.9 ? 1 : 2
  return [...tiles, makeTile(Math.floor(cell / SIZE), cell % SIZE, v)]
}

function hasMoves(tiles) {
  if (tiles.length < SIZE * SIZE) return true
  const grid = Array.from({ length: SIZE }, () => new Array(SIZE).fill(0))
  for (const t of tiles) grid[t.r][t.c] = t.v
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true
    if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true
  }
  return false
}

// Slide every line toward `dir`; returns phase-1 tile positions (merge partners
// overlap on the same cell), the merges to resolve after the slide animation,
// and whether anything moved.
function computeMove(tiles, dir) {
  const horizontal = dir === 'left' || dir === 'right'
  const reverse = dir === 'right' || dir === 'down'
  const moved = { any: false }
  const merges = [] // {a, b, r, c, v}
  const placed = []
  for (let line = 0; line < SIZE; line++) {
    const inLine = tiles
      .filter((t) => (horizontal ? t.r : t.c) === line)
      .sort((x, y) => (horizontal ? x.c - y.c : x.r - y.r))
    if (reverse) inLine.reverse()
    let slot = 0
    let last = null
    for (const t of inLine) {
      if (last && last.v === t.v && !last.merged) {
        const pos = last.pos
        placed.push({ ...t, ...(horizontal ? { r: line, c: pos } : { r: pos, c: line }) })
        merges.push({ a: last.tileId, b: t.id, r: horizontal ? line : pos, c: horizontal ? pos : line, v: t.v * 2 })
        last.merged = true
        moved.any = true
      } else {
        const pos = reverse ? SIZE - 1 - slot : slot
        const nr = horizontal ? line : pos
        const nc = horizontal ? pos : line
        if (nr !== t.r || nc !== t.c) moved.any = true
        placed.push({ ...t, r: nr, c: nc, pop: false })
        last = { v: t.v, pos, merged: false, tileId: t.id }
        slot++
      }
    }
  }
  return { placed, merges, moved: moved.any }
}

export default function MoneyMerge() {
  const [tiles, setTiles] = useState([])
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [biggest, setBiggest] = useState(0)
  const [status, setStatus] = useState('idle') // idle | running | won | over
  const [keepGoing, setKeepGoing] = useState(false)
  const lockRef = useRef(false)
  const swipeRef = useRef(null)
  const stateRef = useRef({ tiles: [], score: 0, keepGoing: false, status: 'idle' })
  stateRef.current = { tiles, score, keepGoing, status }

  useEffect(() => {
    try { setBest(Number(localStorage.getItem('gg-merge-best-v1')) || 0) } catch {}
  }, [])

  const start = () => {
    let t = spawnInto([])
    t = spawnInto(t)
    setTiles(t); setScore(0); setBiggest(0); setKeepGoing(false); setStatus('running')
  }

  const move = useCallback((dir) => {
    const { tiles: cur, score: sc, keepGoing: kg, status: st } = stateRef.current
    if (lockRef.current || (st !== 'running' && !(st === 'won' && kg))) return
    const { placed, merges, moved } = computeMove(cur, dir)
    if (!moved) return
    lockRef.current = true
    setTiles(placed) // phase 1: slide (merge partners overlap)
    setTimeout(() => {
      const dead = new Set(merges.flatMap((m) => [m.a, m.b]))
      let next = placed.filter((t) => !dead.has(t.id))
      let gained = 0
      let maxMerged = 0
      for (const m of merges) {
        next.push(makeTile(m.r, m.c, m.v))
        gained += m.v
        maxMerged = Math.max(maxMerged, m.v)
      }
      next = spawnInto(next)
      const newScore = sc + gained
      setTiles(next)
      setScore(newScore)
      setBiggest((b) => Math.max(b, maxMerged))
      setBest((b) => {
        const nb = Math.max(b, newScore)
        if (nb !== b) try { localStorage.setItem('gg-merge-best-v1', String(nb)) } catch {}
        return nb
      })
      if (maxMerged >= 2048 && !kg) setStatus('won')
      else if (!hasMoves(next)) setStatus('over')
      lockRef.current = false
    }, 130)
  }, [])

  useEffect(() => {
    const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' }
    const h = (e) => {
      const dir = KEYS[e.key]
      if (dir && stateRef.current.status !== 'idle') { e.preventDefault(); move(dir) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [move])

  const onPointerDown = (e) => { swipeRef.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const s = swipeRef.current
    swipeRef.current = null
    if (!s) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
  }

  const overlay = (title, sub, btnLabel, onBtn, extraBtn) => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl text-center px-6" style={{ background: 'rgba(255,255,255,0.92)' }}>
      <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>{title}</div>
      <p className="text-sm mt-2 mb-4" style={{ color: '#3d4a42' }}>{sub}</p>
      <div className="flex gap-2">
        <button onClick={onBtn} className="font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>{btnLabel}</button>
        {extraBtn}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-md px-4 select-none">
      {/* HUD */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        {[[fmt(score), 'Compounded'], [fmt(best), 'Best'], [biggest ? fmt(biggest) : '—', 'Biggest tile']].map(([v, l]) => (
          <div key={l} className="rounded-2xl py-2" style={{ border: '1px solid rgba(20,83,45,0.10)' }}>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>{v}</div>
            <div className="text-[11px]" style={{ color: '#5C6B60' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div
        className="relative rounded-2xl"
        style={{ aspectRatio: '1', background: '#E7ECE8', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Grid wells */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute rounded-xl" style={{
            width: 'calc(25% - 10px)', height: 'calc(25% - 10px)',
            left: `calc(${i % 4} * 25% + 5px)`, top: `calc(${Math.floor(i / 4)} * 25% + 5px)`,
            background: 'rgba(255,255,255,0.55)',
          }} />
        ))}
        {/* Tiles */}
        {tiles.map((t) => {
          const [bg, fg] = styleFor(t.v)
          return (
            <div key={t.id} className="absolute rounded-xl flex items-center justify-center font-display font-extrabold" style={{
              width: 'calc(25% - 10px)', height: 'calc(25% - 10px)',
              left: `calc(${t.c} * 25% + 5px)`, top: `calc(${t.r} * 25% + 5px)`,
              background: bg, color: fg,
              fontSize: t.v >= 1024 ? 17 : t.v >= 128 ? 20 : 24,
              transition: 'left .12s ease, top .12s ease',
              animation: t.pop ? 'ggpop .15s ease' : 'none',
              boxShadow: t.v >= 512 ? '0 4px 14px rgba(217,165,20,0.35)' : 'none',
            }}>{fmt(t.v)}</div>
          )
        })}

        {status === 'idle' && overlay('Money Merge 🥑', 'Swipe or use arrow keys. Equal dollars merge and double — compound your way from $1 to $2,048.', 'Start', start)}
        {status === 'won' && overlay('$2,048! Compounding wins. 🥑', 'That is 11 doublings from a single dollar — the whole secret of saving early.', 'Keep going', () => { setKeepGoing(true); setStatus('running') },
          <button onClick={start} className="font-bold px-5 py-2.5 rounded-full" style={{ background: '#E7ECE8', color: INK }}>New game</button>)}
        {status === 'over' && overlay('No moves left', `You compounded ${fmt(score)}${score >= best && score > 0 ? ' — a new best!' : ''}. Biggest tile: ${biggest ? fmt(biggest) : '$0'}.`, 'Play again', start)}
      </div>

      <p className="text-xs text-center mt-4 mb-2" style={{ color: '#8a978d' }}>
        Every merge is a doubling — $1 needs just 11 of them to become $2,048.
        Swipe on touch, arrows/WASD on keyboard.
      </p>

      <style>{`@keyframes ggpop { 0%{transform:scale(.4)} 80%{transform:scale(1.08)} 100%{transform:scale(1)} }`}</style>
    </div>
  )
}
