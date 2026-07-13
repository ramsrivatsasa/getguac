'use client'
// Budget Tetris — your expenses fall as blocks whose height = how much they
// cost. Slide them into columns and fill a full row to "clear" it and bank the
// savings. Let a column pile past the budget line at the top and the month's
// over. Blocks are drawn from YOUR real purchases (demo when signed out).
//
// SCORE IS GAME-ONLY. First finished round each day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine } from './arcadeKit'
import { usePlayerSpending } from '../../lib/playerSpending'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const BG = '#0e1a12'
const CARD_BORDER = '1px solid rgba(20,83,45,0.12)'
const BODY_FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Bricolage Grotesque', 'Plus Jakarta Sans', ui-sans-serif, sans-serif"
const BEST_KEY = 'gg-budget-best-v1'

const COLS = 6
const DANGER_ROWS = 2 // top rows above the budget line = danger zone
const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#c084fc', '#f472b6']

function heightCellsFor(amount) {
  return 1 + Math.min(3, Math.floor(amount / 25)) // $0-24=1 … $75+=4
}

const freshSim = () => ({
  grid: null, rows: 0, cell: 40,
  block: null, next: null, fallY: 0, dropFast: false,
  saved: 0, cleared: 0, level: 1, lastT: null, over: false, colorIdx: 0,
})

export default function BudgetTetris() {
  const canvasRef = useRef(null)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 640, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const dataRef = useRef(null)
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ saved: 0, cleared: 0, level: 1 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('budget')
  const { data, loading } = usePlayerSpending()

  useEffect(() => { dataRef.current = data }, [data])
  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10)
      if (v > 0) { bestRef.current = v; setBest(v) }
    } catch {}
  }, [])

  const layout = useCallback(() => {
    const { w, h } = sizeRef.current
    const cell = Math.floor(Math.min((w * 0.92) / COLS, 46))
    const rows = Math.max(8, Math.floor((h - 24) / cell))
    return { cell, rows, boardW: cell * COLS, boardH: cell * Math.max(8, Math.floor((h - 24) / cell)) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const box = canvas.parentElement.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: box.width, h: box.height }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  const makeBlock = useCallback(() => {
    const st = sim.current
    const pool = dataRef.current?.purchases || []
    const p = pool.length ? pool[Math.floor(Math.random() * pool.length)] : { name: 'Expense', price: 30, emoji: '💸' }
    const amount = Math.max(1, Math.round(p.price))
    st.colorIdx = (st.colorIdx + 1) % COLORS.length
    return {
      col: Math.floor(COLS / 2),
      h: heightCellsFor(amount),
      value: amount, emoji: p.emoji || '💸',
      label: p.name || 'Expense', color: COLORS[st.colorIdx],
    }
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({ saved: st.saved, cleared: st.cleared, level: st.level })
    }

    const endGame = () => {
      setStatus('over')
      const st = sim.current
      st.over = true
      save(st.saved, st.level)
      if (st.saved > bestRef.current) {
        bestRef.current = st.saved
        setBest(st.saved)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.saved)) } catch {}
      }
    }

    // Column-drop: bottom row where the block would rest in its column.
    const restBottomRow = (st, col, h) => {
      const g = st.grid
      // find highest filled cell in column
      let firstFilled = st.rows
      for (let r = 0; r < st.rows; r++) { if (g[r][col]) { firstFilled = r; break } }
      return firstFilled - 1 // block bottom sits just above it (or on floor)
    }

    const lockBlock = (st) => {
      const b = st.block
      const bottom = restBottomRow(st, b.col, b.h)
      const top = bottom - b.h + 1
      if (top < 0) { endGame(); return } // piled past the top → over
      for (let r = top; r <= bottom; r++) {
        st.grid[r][b.col] = { value: Math.round(b.value / b.h), emoji: b.emoji, color: b.color, top: r === top }
      }
      // If any filled cell sits in the danger zone rows → over after this lock
      // only if it actually reaches the very top rows.
      // Clear full rows.
      let clearedNow = 0
      for (let r = st.rows - 1; r >= 0; r--) {
        let full = true
        for (let c = 0; c < COLS; c++) { if (!st.grid[r][c]) { full = false; break } }
        if (full) {
          let rowVal = 0
          for (let c = 0; c < COLS; c++) rowVal += st.grid[r][c].value
          st.saved += rowVal
          clearedNow++
          for (let rr = r; rr > 0; rr--) st.grid[rr] = st.grid[rr - 1].slice()
          st.grid[0] = new Array(COLS).fill(null)
          r++ // recheck same row index after shift
        }
      }
      if (clearedNow > 0) {
        st.cleared += clearedNow
        st.level = 1 + Math.floor(st.cleared / 6)
        st.floats = st.floats || []
        st.floats.push({ text: clearedNow > 1 ? `${clearedNow} rows! Budget win 🥑` : 'Row cleared!', t0: performance.now(), life: 1000 })
      }
      // Over check: something already occupying a top danger row after settling.
      for (let c = 0; c < COLS; c++) if (st.grid[0][c]) { endGame(); return }
      syncHud()
      st.block = st.next || makeBlock()
      st.next = makeBlock()
      st.fallY = 0
      // Immediate collision at spawn = board full.
      if (restBottomRow(st, st.block.col, st.block.h) - st.block.h + 1 < 0) endGame()
    }

    const update = (st, dt) => {
      const speed = (1.3 + st.level * 0.42) * (st.dropFast ? 6 : 1) // cells/sec — gentler fall (was 2 + level*0.6)
      st.fallY += speed * dt
      const bottomRest = restBottomRow(st, st.block.col, st.block.h)
      if (st.fallY >= bottomRest) {
        st.fallY = bottomRest
        lockBlock(st)
      }
    }

    const render = (st) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h)
      if (!st.grid) return
      const cell = st.cell
      const boardW = cell * COLS
      const ox = (w - boardW) / 2
      const oy = 8
      // board bg
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      ctx.fillRect(ox, oy, boardW, cell * st.rows)
      // grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
      for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(ox + c * cell, oy); ctx.lineTo(ox + c * cell, oy + cell * st.rows); ctx.stroke() }
      // budget line
      const by = oy + DANGER_ROWS * cell
      ctx.strokeStyle = ROSE; ctx.setLineDash([6, 5]); ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(ox, by); ctx.lineTo(ox + boardW, by); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = ROSE; ctx.font = `700 10px ${BODY_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText('BUDGET LINE', ox + 4, by - 2)

      const drawCell = (r, c, data) => {
        const x = ox + c * cell, y = oy + r * cell
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, 5)
        else ctx.rect(x + 1.5, y + 1.5, cell - 3, cell - 3)
        ctx.fillStyle = data.color; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1
        if (data.top) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.font = `${Math.round(cell * 0.4)}px ${BODY_FONT}`
          ctx.fillText(data.emoji, x + cell / 2, y + cell * 0.42)
        }
      }
      // settled cells
      for (let r = 0; r < st.rows; r++) for (let c = 0; c < COLS; c++) if (st.grid[r][c]) drawCell(r, c, st.grid[r][c])
      // falling block
      const b = st.block
      if (b) {
        const bottom = Math.min(st.rows - 1, Math.round(st.fallY))
        const top = bottom - b.h + 1
        for (let r = top; r <= bottom; r++) {
          if (r < 0) continue
          drawCell(r, b.col, { color: b.color, emoji: b.emoji, top: r === top })
        }
        // value label on the block
        const lx = ox + b.col * cell + cell / 2
        const ly = oy + (top) * cell - 4
        ctx.fillStyle = '#fff'; ctx.font = `800 12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        if (ly > oy + 10) ctx.fillText(`$${b.value}`, lx, ly)
      }
      // floats
      const now = performance.now()
      st.floats = (st.floats || []).filter((f) => now - f.t0 < f.life)
      for (const f of st.floats) {
        ctx.globalAlpha = Math.max(0, 1 - (now - f.t0) / f.life)
        ctx.fillStyle = '#a3e635'; ctx.font = `800 18px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(f.text, w / 2, h * 0.4)
        ctx.globalAlpha = 1
      }
    }

    const loop = (t) => {
      const st = sim.current
      const realMs = Math.min(50, st.lastT == null ? 16 : t - st.lastT)
      st.lastT = t
      const dt = realMs / 1000
      if (statusRef.current === 'playing' && !st.over) update(st, dt)
      render(st)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [setStatus, save, makeBlock])

  // Controls: pointer sets target column; keyboard arrows; down = fast drop.
  const moveTo = (clientX) => {
    const st = sim.current
    if (!st.block || statusRef.current !== 'playing') return
    const rect = canvasRef.current.getBoundingClientRect()
    const { w } = sizeRef.current
    const boardW = st.cell * COLS
    const ox = (w - boardW) / 2
    const col = Math.floor((clientX - rect.left - ox) / st.cell)
    st.block.col = Math.max(0, Math.min(COLS - 1, col))
  }
  const onDown = (e) => { moveTo(e.clientX) }
  const onMove = (e) => { if (e.buttons) moveTo(e.clientX) }

  useEffect(() => {
    const kd = (e) => {
      const st = sim.current
      if (statusRef.current !== 'playing' || !st.block) return
      const k = e.key
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'a', 'd', 's', 'w', ' '].includes(k)) e.preventDefault()
      if (k === 'ArrowLeft' || k === 'a') st.block.col = Math.max(0, st.block.col - 1)
      if (k === 'ArrowRight' || k === 'd') st.block.col = Math.min(COLS - 1, st.block.col + 1)
      if (k === 'ArrowDown' || k === 's') st.dropFast = true
    }
    const ku = (e) => { if (e.key === 'ArrowDown' || e.key === 's') sim.current.dropFast = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  useEffect(() => {
    const pause = () => { if (statusRef.current === 'playing') setStatus('paused') }
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', vis) }
  }, [setStatus])

  const start = () => {
    const { cell, rows } = layout()
    const grid = Array.from({ length: rows }, () => new Array(COLS).fill(null))
    Object.assign(sim.current, freshSim())
    sim.current.grid = grid
    sim.current.rows = rows
    sim.current.cell = cell
    sim.current.block = makeBlock()
    sim.current.next = makeBlock()
    sim.current.fallY = 0
    setHud({ saved: 0, cleared: 0, level: 1 })
    setNewBest(false)
    resetSave()
    setStatus('playing')
  }
  const resume = () => { sim.current.lastT = null; setStatus('playing') }

  const overlayCard = 'rounded-2xl p-5 text-center w-full'
  const pillGreen = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const real = data?.hasData
  const dropBtn = 'flex-1 py-3 rounded-xl font-bold text-white text-sm'

  return (
    <div className="mx-auto w-full select-none">
      <div className="mb-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"
        style={{ background: real ? '#ecfdf3' : '#fff7ed', color: real ? '#065f46' : '#9a3412', border: CARD_BORDER }}>
        <span aria-hidden>{real ? '🟢' : '👀'}</span>
        {loading ? 'Loading your spending…'
          : real ? 'Blocks are your real expenses — taller = pricier. Fill a row to bank the savings.'
            : <span><a href="/register" className="underline font-bold">Sign in</a> to stack your real expenses. Showing a demo for now.</span>}
      </div>

      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Saved</div>
          <div className="font-display font-extrabold text-2xl leading-none" style={{ color: GREEN }}>${hud.saved}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Rows</div>
          <div className="font-display font-extrabold text-lg leading-none" style={{ color: AMBER }}>{hud.cleared}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Level</div>
          <div className="font-display font-extrabold text-lg leading-none" style={{ color: INK }}>{hud.level}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Best</div>
          <div className="font-display font-extrabold text-lg leading-none" style={{ color: INK }}>${best}</div>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden" style={{ border: CARD_BORDER, height: 'clamp(440px, calc(100svh - 270px), 820px)', minHeight: 430, background: BG }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: status === 'playing' ? 'pointer' : 'default' }}
        />

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(14,26,18,0.55)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="text-4xl mb-1">🧱</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Budget Tetris</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>
                Your expenses fall as blocks — the pricier the buy, the taller the block. Tap or drag to pick a column.
              </p>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Fill a full row to clear it and bank the savings. Pile past the <span className="font-bold" style={{ color: ROSE }}>budget line</span> and the month is over.
              </p>
              <button onClick={start} disabled={loading} className={`mt-4 ${pillGreen}`} style={{ background: loading ? '#9ca3af' : GREEN }}>
                {loading ? 'Loading…' : 'Start stacking'}
              </button>
            </div>
          </div>
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(14,26,18,0.6)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused 🥑</div>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(14,26,18,0.6)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Over budget!</div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>You banked</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.saved}</div>
              {newBest && (
                <div className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best! 🥑</div>
              )}
              <div className="mt-2 text-sm" style={{ color: BODY }}>{hud.cleared} rows cleared · level {hud.level}</div>
              <SaveScoreLine res={saveRes} />
              <button onClick={start} className={`mt-4 ${pillGreen}`} style={{ background: GREEN }}>Play again</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex gap-2 mt-3" style={{ visibility: status === 'playing' ? 'visible' : 'hidden' }}>
        <button className={dropBtn} style={{ background: '#334155' }}
          onPointerDown={() => { const b = sim.current.block; if (b) b.col = Math.max(0, b.col - 1) }}>◀</button>
        <button className={dropBtn} style={{ background: GREEN }}
          onPointerDown={() => { sim.current.dropFast = true }} onPointerUp={() => { sim.current.dropFast = false }} onPointerLeave={() => { sim.current.dropFast = false }}>▼ Drop</button>
        <button className={dropBtn} style={{ background: '#334155' }}
          onPointerDown={() => { const b = sim.current.block; if (b) b.col = Math.min(COLS - 1, b.col + 1) }}>▶</button>
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Tap/drag a column, ◀ ▶ or arrows to move, ▼ to drop faster. Fill a row to bank it. A game — it never changes your real data.
      </p>
    </div>
  )
}
