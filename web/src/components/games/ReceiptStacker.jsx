'use client'
// Receipt Stacker — falling-block arcade game, GetGuac edition. The week's
// expenses tumble down; stack them tight on the receipt. Fill a row all the
// way across to balance it and bank the savings — four rows at once is a
// GUAC SMASH. Best run persists in localStorage. Just for fun.
import { useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, GameFrame } from './arcadeKit'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const GREEN_BG = '#f2fbf3'
const AMBER = '#D9A514'
const KEY_BG = '#E7ECE8'
const BORDER = '1px solid rgba(20,83,45,0.10)'

const COLS = 10
const ROWS = 20
const BEST_KEY = 'gg-stacker-best-v1'
const LINE_CASH = [0, 100, 300, 500, 800] // $ for 1/2/3/4 balanced rows, × level

// Each block type is a spending category.
const PIECES = {
  I: { emoji: '🛒', name: 'Groceries', color: '#65A30D', m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { emoji: '💡', name: 'Bills', color: '#D9A514', m: [[1, 1], [1, 1]] },
  T: { emoji: '🍔', name: 'Dining', color: '#F97316', m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { emoji: '⛽', name: 'Transport', color: '#3B82F6', m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { emoji: '🛍️', name: 'Shopping', color: '#EC4899', m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { emoji: '💊', name: 'Health', color: '#14B8A6', m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { emoji: '🎬', name: 'Fun', color: '#8B5CF6', m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
}
const TYPES = Object.keys(PIECES)

function rotateCW(m) {
  const n = m.length
  return m.map((row, y) => row.map((_, x) => m[n - 1 - x][y]))
}

function collides(board, m, px, py) {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m.length; x++) {
      if (!m[y][x]) continue
      const bx = px + x, by = py + y
      if (bx < 0 || bx >= COLS || by >= ROWS) return true
      if (by >= 0 && board[by][bx]) return true
    }
  }
  return false
}

function eachCell(m, fn) {
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m.length; x++) if (m[y][x]) fn(x, y)
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function paintCell(ctx, cx, cy, cell, color, ghost) {
  const pad = Math.max(1, cell * 0.07)
  const s = cell - pad * 2
  ctx.save()
  rr(ctx, cx * cell + pad, cy * cell + pad, s, s, Math.max(3, cell * 0.2))
  if (ghost) {
    ctx.globalAlpha = 0.14; ctx.fillStyle = color; ctx.fill()
    ctx.globalAlpha = 0.5; ctx.setLineDash([4, 3]); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke()
  } else {
    ctx.fillStyle = color; ctx.fill()
    ctx.strokeStyle = shade(color, 0.72); ctx.lineWidth = Math.max(1.25, cell * 0.07); ctx.stroke()
  }
  ctx.restore()
}

export default function ReceiptStacker() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0, cell: 0 })
  const game = useRef(null)
  const rafRef = useRef(0)
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const repeatRef = useRef(null)
  const smashTimer = useRef(null)
  const [status, setStatus] = useState('idle') // idle | running | paused | over
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, best: 0, next: null })
  const [smash, setSmash] = useState(false)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('stacker')

  function setStatusBoth(s) { statusRef.current = s; setStatus(s) }

  function syncHud() {
    const g = game.current
    setHud({ score: g.score, lines: g.lines, level: g.level, best: bestRef.current, next: g.next })
  }

  function pullFromBag(g) {
    if (!g.bag.length) g.bag = TYPES.map((t) => [Math.random(), t]).sort((a, b) => a[0] - b[0]).map((p) => p[1])
    return g.bag.pop()
  }

  function spawn(g) {
    const type = g.next || pullFromBag(g)
    g.next = pullFromBag(g)
    const m = PIECES[type].m.map((r) => [...r])
    g.active = { type, m, x: Math.floor((COLS - m.length) / 2), y: 0 }
    if (collides(g.board, m, g.active.x, 0)) endGame()
  }

  function endGame() {
    const g = game.current
    g.active = null
    save(g.score, g.level)
    const beat = g.score > bestRef.current
    if (beat) {
      bestRef.current = g.score
      try { localStorage.setItem(BEST_KEY, String(g.score)) } catch {}
    }
    setNewBest(beat)
    setStatusBoth('over')
    syncHud()
  }

  function lockPiece() {
    const g = game.current
    const a = g.active
    let topOut = false
    eachCell(a.m, (x, y) => {
      const by = a.y + y
      if (by < 0) topOut = true
      else g.board[by][a.x + x] = a.type
    })
    if (topOut) { endGame(); return }
    g.board = g.board.filter((row) => !row.every(Boolean))
    const cleared = ROWS - g.board.length
    while (g.board.length < ROWS) g.board.unshift(Array(COLS).fill(null))
    if (cleared) {
      g.lines += cleared
      g.score += LINE_CASH[cleared] * g.level
      g.level = 1 + Math.floor(g.lines / 10)
      if (cleared === 4) {
        setSmash(true); clearTimeout(smashTimer.current)
        smashTimer.current = setTimeout(() => setSmash(false), 1100)
      }
    }
    spawn(g)
    syncHud()
  }

  function move(dx) {
    const g = game.current, a = g && g.active
    if (!a || statusRef.current !== 'running') return
    if (!collides(g.board, a.m, a.x + dx, a.y)) a.x += dx
  }

  function rotate() {
    const g = game.current, a = g && g.active
    if (!a || statusRef.current !== 'running') return
    const rm = rotateCW(a.m)
    for (const k of [0, -1, 1, -2, 2]) {
      if (!collides(g.board, rm, a.x + k, a.y)) { a.m = rm; a.x += k; return }
    }
  }

  function stepDown(reward) {
    const g = game.current, a = g && g.active
    if (!a || statusRef.current !== 'running') return
    if (collides(g.board, a.m, a.x, a.y + 1)) { lockPiece(); return }
    a.y += 1
    if (reward) { g.score += 1; syncHud() }
  }

  function hardDrop() {
    const g = game.current, a = g && g.active
    if (!a || statusRef.current !== 'running') return
    let d = 0
    while (!collides(g.board, a.m, a.x, a.y + 1)) { a.y += 1; d++ }
    g.score += d * 2
    lockPiece()
  }

  function start() {
    const g = { board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), bag: [], active: null, next: null, score: 0, lines: 0, level: 1, acc: 0, last: 0 }
    game.current = g
    spawn(g)
    setSmash(false); setNewBest(false); resetSave(); setStatusBoth('running'); syncHud()
  }

  function togglePause() {
    if (statusRef.current === 'running') setStatusBoth('paused')
    else if (statusRef.current === 'paused') setStatusBoth('running')
  }

  function draw() {
    const cv = canvasRef.current
    if (!cv) return
    const { w, h, cell } = sizeRef.current
    if (!w) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(20,83,45,0.05)'; ctx.lineWidth = 1; ctx.beginPath()
    for (let c = 1; c < COLS; c++) { const x = Math.round(c * cell) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let r = 1; r < ROWS; r++) { const y = Math.round(r * cell) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()
    const g = game.current
    if (!g) return
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (g.board[y][x]) paintCell(ctx, x, y, cell, PIECES[g.board[y][x]].color, false)
    }
    const a = g.active
    if (a) {
      const color = PIECES[a.type].color
      let gy = a.y
      while (!collides(g.board, a.m, a.x, gy + 1)) gy++
      if (gy !== a.y) eachCell(a.m, (x, y) => { if (gy + y >= 0) paintCell(ctx, a.x + x, gy + y, cell, color, true) })
      eachCell(a.m, (x, y) => { if (a.y + y >= 0) paintCell(ctx, a.x + x, a.y + y, cell, color, false) })
    }
  }

  function stopRepeat() {
    const r = repeatRef.current
    if (r) { clearTimeout(r.t); clearInterval(r.i); repeatRef.current = null }
  }

  // Big touch buttons: fire on press, auto-repeat while held (move / soft drop).
  function hold(fn, repeat) {
    return {
      onPointerDown: (e) => {
        e.preventDefault()
        if (statusRef.current !== 'running') return
        stopRepeat()
        fn()
        if (repeat) {
          const t = setTimeout(() => {
            if (!repeatRef.current) return
            repeatRef.current.i = setInterval(() => { if (statusRef.current === 'running') fn(); else stopRepeat() }, 85)
          }, 200)
          repeatRef.current = { t, i: null }
        }
      },
      onPointerUp: stopRepeat, onPointerLeave: stopRepeat, onPointerCancel: stopRepeat,
      onContextMenu: (e) => e.preventDefault(),
    }
  }

  // Best run, from localStorage.
  useEffect(() => {
    try {
      bestRef.current = Number(localStorage.getItem(BEST_KEY)) || 0
      setHud((prev) => ({ ...prev, best: bestRef.current }))
    } catch {}
  }, [])

  // Canvas sizing with devicePixelRatio for crisp cells.
  useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current, cv = canvasRef.current
      if (!wrap || !cv || !wrap.clientWidth) return
      const w = wrap.clientWidth, cell = w / COLS, h = Math.round(cell * ROWS)
      const dpr = window.devicePixelRatio || 1
      cv.style.height = `${h}px`
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w, h, cell }
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Main loop: gravity while running, redraw every frame.
  useEffect(() => {
    const tick = (t) => {
      const g = game.current
      if (g && statusRef.current === 'running' && g.active) {
        if (!g.last) g.last = t
        g.acc += t - g.last
        g.last = t
        const interval = Math.max(80, 700 - 60 * (g.level - 1))
        while (g.acc >= interval && statusRef.current === 'running') {
          g.acc -= interval
          stepDown(false)
        }
      } else if (g) g.last = t
      draw()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (k === 'p' || k === 'P') { togglePause(); return }
      if (statusRef.current !== 'running') return
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(k)) e.preventDefault()
      if (k === 'ArrowLeft') move(-1)
      else if (k === 'ArrowRight') move(1)
      else if (k === 'ArrowDown') stepDown(true)
      else if (k === 'ArrowUp' || k === 'x' || k === 'X') rotate()
      else if (k === ' ') hardDrop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Auto-pause when the tab loses focus.
  useEffect(() => {
    const halt = () => { if (statusRef.current === 'running') { statusRef.current = 'paused'; setStatus('paused') } }
    const onVis = () => { if (document.hidden) halt() }
    window.addEventListener('blur', halt); document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('blur', halt); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  useEffect(() => () => { clearTimeout(smashTimer.current); stopRepeat() }, [])

  const nextRows = hud.next ? PIECES[hud.next].m.filter((r) => r.some(Boolean)) : []

  return (
    <GameFrame inner={560}>
    <div className="mx-auto select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold" style={{ color: MUTED }}>
          {status === 'running' ? 'Stacking…' : status === 'paused' ? 'Paused' : status === 'over' ? 'Receipt closed' : 'Ready when you are'}
        </div>
        {(status === 'running' || status === 'paused') && (
          <button onClick={(e) => { e.currentTarget.blur(); togglePause() }} className="text-xs font-bold px-3 py-1.5 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK, background: '#fff' }}>
            {status === 'paused' ? '▶ Resume' : '⏸ Pause (P)'}
          </button>
        )}
      </div>

      {/* HUD */}
      <div className="rounded-2xl p-3 mb-3 grid grid-cols-4 gap-2 text-center" style={{ border: BORDER, background: '#fff' }}>
        {[[`$${hud.score.toLocaleString()}`, 'Saved', GREEN], [hud.lines, 'Rows balanced', INK], [hud.level, 'Level', INK], [`$${hud.best.toLocaleString()}`, 'Best', INK]].map(([v, l, c]) => (
          <div key={l}>
            <div className="font-display font-extrabold text-lg" style={{ color: c }}>{v}</div>
            <div className="text-[11px]" style={{ color: MUTED }}>{l}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Board */}
        <div ref={wrapRef} className="relative rounded-2xl overflow-hidden" style={{ flex: '1 1 260px', maxWidth: 340, border: BORDER, background: '#fff' }}>
          <canvas ref={canvasRef} onPointerDown={() => rotate()} style={{ display: 'block', width: '100%', touchAction: 'none' }} />
          {smash && (
            <div className="absolute inset-x-0 top-1/3 flex justify-center pointer-events-none">
              <div className="gg-smash font-display font-extrabold text-xl px-5 py-2 rounded-full text-white" style={{ background: GREEN }}>GUAC SMASH! 🥑</div>
            </div>
          )}
          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              <div className="text-4xl mb-2">🥑</div>
              <div className="font-display font-extrabold text-lg mb-2" style={{ color: INK }}>Receipt Stacker</div>
              <p className="text-sm mb-4" style={{ color: BODY }}>
                Expenses fall — stack them tight on the receipt.<br />
                Fill a row across to balance it and bank the savings.<br />
                Four rows at once = GUAC SMASH.
              </p>
              <button onClick={start} className="text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Start stacking</button>
            </div>
          )}
          {status === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.94)' }}>
              <div className="font-display font-extrabold text-lg mb-3" style={{ color: INK }}>Paused ⏸️</div>
              <button onClick={togglePause} className="text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Resume</button>
              <p className="text-xs mt-2" style={{ color: FAINT }}>or press P</p>
            </div>
          )}
          {status === 'over' && (
            <div className="absolute inset-0 flex items-center justify-center px-4" style={{ background: 'rgba(255,255,255,0.9)' }}>
              <div className="rounded-2xl p-5 text-center w-full" style={{ background: GREEN_BG, border: BORDER }}>
                <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Receipt overflowed! 🧾</div>
                <p className="text-sm mt-1" style={{ color: BODY }}>
                  You balanced {hud.lines} row{hud.lines === 1 ? '' : 's'} and saved{' '}
                  <span className="font-display font-extrabold" style={{ color: GREEN }}>${hud.score.toLocaleString()}</span>.
                </p>
                {newBest && <p className="text-sm font-bold mt-1" style={{ color: AMBER }}>New personal best! 🥑</p>}
                <SaveScoreLine res={saveRes} />
                <button onClick={start} className="text-sm font-bold px-6 py-2.5 rounded-full text-white mt-3" style={{ background: GREEN }}>Play again</button>
              </div>
            </div>
          )}
        </div>

        {/* Next piece + category legend */}
        <div className="flex flex-wrap gap-3 content-start" style={{ flex: '1 1 150px' }}>
          <div className="rounded-2xl p-3" style={{ flex: '1 1 120px', border: BORDER, background: '#fff' }}>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Next up</div>
            {hud.next ? (
              <>
                <div className="inline-flex flex-col gap-[2px]">
                  {nextRows.map((row, i) => (
                    <div key={i} className="flex gap-[2px]">
                      {row.map((v, j) => <div key={j} style={{ width: 16, height: 16, borderRadius: 4, background: v ? PIECES[hud.next].color : 'transparent', border: v ? `1px solid ${shade(PIECES[hud.next].color, 0.72)}` : 'none' }} />)}
                    </div>
                  ))}
                </div>
                <div className="text-xs mt-2 font-semibold" style={{ color: BODY }}>{PIECES[hud.next].emoji} {PIECES[hud.next].name}</div>
              </>
            ) : <div className="text-xs" style={{ color: FAINT }}>—</div>}
          </div>
          <div className="rounded-2xl p-3" style={{ flex: '1 1 150px', border: BORDER, background: '#fff' }}>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Categories</div>
            <div className="space-y-1.5">
              {TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: BODY }}>
                  <span className="inline-block w-3 h-3 rounded" style={{ background: PIECES[t].color }} />
                  <span>{PIECES[t].emoji} {PIECES[t].name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Touch controls */}
      <div className="flex gap-2 mt-3">
        {[['◀', () => move(-1), true, 'Move left'], ['▶', () => move(1), true, 'Move right'], ['⟳', rotate, false, 'Rotate'], ['▼', () => stepDown(true), true, 'Soft drop'], ['⤓', hardDrop, false, 'Hard drop']].map(([label, fn, rep, aria]) => (
          <button key={aria} {...hold(fn, rep)} aria-label={aria} className="flex-1 font-bold rounded-full" style={{ height: 52, fontSize: 20, border: 'none', cursor: 'pointer', touchAction: 'none', background: label === '⤓' ? GREEN : KEY_BG, color: label === '⤓' ? '#fff' : INK }}>{label}</button>
        ))}
      </div>

      <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
        ←/→ move · ↑ or X rotate · ↓ soft drop (+$1/cell) · Space hard drop (+$2/cell) · P pause · tap the board to rotate.
      </p>

      <style>{`
        .gg-smash { animation: ggsmash 1.1s ease both; }
        @keyframes ggsmash { 0%{transform:scale(.6);opacity:0} 15%{transform:scale(1.08);opacity:1} 30%{transform:scale(1)} 85%{opacity:1} 100%{opacity:0} }
      `}</style>
    </div>
    </GameFrame>
  )
}
