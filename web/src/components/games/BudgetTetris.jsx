'use client'
// Budget Tetris ("Block Drop") — real Tetris with a money skin. The 7 classic
// tetrominoes fall into the well; each piece is one of YOUR expenses (label +
// price + colour). Rotate and slot them to fill full rows, which clear and bank
// the savings. Top out and the month's over. Blocks come from real purchases
// (demo when signed out).
//
// Runs the shared 7-round FINANCIAL JOURNEY (lib/financialJourney): cut expenses
// → savings → car → house → invest → education → freedom. A round =
// bank $target out of cleared rows, split into stages that drop faster as the
// goal bar fills, on top of the auto-learning difficulty engine
// (lib/adaptiveDifficulty) which tunes the drop speed to how you actually play.
//
// Look matches Guac Arcade mockup 1c: flat #052e16 field, translucent play well,
// right rail (NEXT / LINES CLEARED / MONTH BALANCE), SCORE pill + pause.
// SCORE IS GAME-ONLY. First finished round each day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, ArcadeHud, AvocadoPip } from './arcadeKit'
import { usePlayerSpending } from '../../lib/playerSpending'
import { JOURNEY, journeyTargets, roundValueMul, stageFor, withBudgetBump } from '../../lib/financialJourney'
import {
  useJourney, useAdaptive, AdaptiveChip,
  RoundIntro, RoundComplete, JourneyComplete, JourneyBar,
} from './journeyKit'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.12)'
const BODY_FONT = "'Outfit', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Nunito', 'Bricolage Grotesque', ui-sans-serif, sans-serif"
const BEST_KEY = 'gg-budget-best-v1'

const COLS = 8
const ROWS = 16
const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#38bdf8', '#a78bfa', '#f472b6']
const shortLabel = (s) => (s || '').toUpperCase().replace(/\s+/g, ' ').trim()

// The 7 tetrominoes — 4 rotation frames each, as [col,row] cells in a 4-wide box.
const SHAPES = {
  I: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
  O: [[[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]]],
  T: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]],
  S: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]], [[1, 1], [2, 1], [0, 2], [1, 2]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
  Z: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [0, 1], [1, 1], [0, 2]]],
  J: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]],
  L: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]],
}
const SHAPE_KEYS = Object.keys(SHAPES)
const frameOf = (p) => SHAPES[p.key][((p.rot % 4) + 4) % 4]

// How Block Drop interprets each journey round: pieces fall faster and every
// banked row counts for more (valueMul), so the late rounds get tense instead of
// long. `par` is the time we expect a round to take — the auto-learning engine
// grades the player against it.
const TETRIS_ROUNDS = JOURNEY.map((r, i) => ({
  ...r,
  dropMul: [1, 1.3, 1.45, 1.6, 1.75, 1.9, 2.1][i],
  valueMul: roundValueMul(i),
  par: [50, 70, 80, 90, 100, 110, 120][i],
}))
// A cleared row banks a big chunk at once compared with a single slice or a
// downed invader, so the shared target curve is scaled into this game's economy.
const TARGET_MUL = 0.45

const freshSim = () => ({
  grid: null, cell: 28,
  piece: null, next: null,
  dropAcc: 0, dropFast: false,
  saved: 0, roundBanked: 0, cleared: 0, level: 1, stage: 1,
  lastT: null, over: false, colorIdx: 0, floats: [],
  roundT0: 0, roundRows: 0, roundPieces: 0,
})

export default function BudgetTetris() {
  const canvasRef = useRef(null)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 300, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const dataRef = useRef(null)
  const actionsRef = useRef({})   // move / rotate / hardDrop / soft — wired by the game loop
  const touchRef = useRef(null)
  const clearTimer = useRef(null)
  const targetsRef = useRef(journeyTargets(null, TARGET_MUL))
  const roundRef = useRef({ cfg: TETRIS_ROUNDS[0], target: withBudgetBump(targetsRef.current[0]), idx: 0 })
  const isLastRef = useRef(false)
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ saved: 0, cleared: 0, level: 1, next: null })
  const [roundHud, setRoundHud] = useState({ banked: 0, target: withBudgetBump(targetsRef.current[0]), stage: 1 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('budget')
  const { data, loading } = usePlayerSpending()
  const journey = useJourney('budget', { count: TETRIS_ROUNDS.length })
  const { roundIdx, round, furthest, isLast, startFrom, advance } = journey
  const { diff, diffRef, record, note } = useAdaptive('budget')
  const cfg = TETRIS_ROUNDS[roundIdx]
  const target = withBudgetBump(Math.max(10, Math.round((targetsRef.current[roundIdx] * diff.targetMul) / 10) * 10))
  const nextRound = TETRIS_ROUNDS[roundIdx + 1] || null

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => () => clearTimeout(clearTimer.current), [])
  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  useEffect(() => { targetsRef.current = journeyTargets(data, TARGET_MUL) }, [data])

  useEffect(() => {
    roundRef.current = { cfg: TETRIS_ROUNDS[roundIdx], target, idx: roundIdx }
    isLastRef.current = isLast
    setRoundHud((h) => ({ ...h, target }))
  }, [roundIdx, isLast, target])

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10)
      if (v > 0) { bestRef.current = v; setBest(v) }
    } catch {}
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

  // A new piece = a random tetromino skinned as one of the player's expenses.
  const makePiece = useCallback(() => {
    const st = sim.current
    const pool = dataRef.current?.purchases || []
    const p = pool.length ? pool[Math.floor(Math.random() * pool.length)] : { name: 'Expense', price: 30 }
    st.colorIdx = (st.colorIdx + 1) % COLORS.length
    return {
      key: SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)],
      rot: 0, x: 2, y: -1,
      value: Math.max(1, Math.round(p.price)),
      label: p.name || 'Expense', emoji: p.emoji || '💸', color: COLORS[st.colorIdx],
    }
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({
        saved: st.saved, cleared: st.cleared, level: st.level,
        next: st.next ? { key: st.next.key, color: st.next.color, label: st.next.label } : null,
      })
      setRoundHud({ banked: st.roundBanked, target: roundRef.current.target, stage: st.stage })
    }

    // Feed the round result to the auto-learning engine. Accuracy here = how
    // efficiently the player turns pieces into cleared rows.
    const learn = (cleared) => {
      const st = sim.current
      record({
        cleared,
        seconds: st.roundT0 ? (performance.now() - st.roundT0) / 1000 : 0,
        par: roundRef.current.cfg.par || 80,
        livesLost: 0,
        accuracy: st.roundPieces > 0 ? Math.min(1, (st.roundRows / st.roundPieces) * 2.5) : null,
      })
    }

    const collide = (st, p, ox, oy, rot) => {
      for (const [cx, cy] of SHAPES[p.key][((rot % 4) + 4) % 4]) {
        const x = ox + cx, y = oy + cy
        if (x < 0 || x >= COLS || y >= ROWS) return true
        if (y >= 0 && st.grid[y][x]) return true
      }
      return false
    }

    const tryMove = (st, dx, dy) => {
      const p = st.piece
      if (!p || collide(st, p, p.x + dx, p.y + dy, p.rot)) return false
      p.x += dx; p.y += dy
      return true
    }

    const rotate = () => {
      const st = sim.current
      const p = st.piece
      if (!p || statusRef.current !== 'playing') return
      const nr = p.rot + 1
      for (const kick of [0, -1, 1, -2, 2]) {   // basic wall-kick
        if (!collide(st, p, p.x + kick, p.y, nr)) { p.x += kick; p.rot = (nr % 4 + 4) % 4; return }
      }
    }

    const clearLines = (st) => {
      const rc = roundRef.current
      let n = 0
      let banked = 0
      for (let r = ROWS - 1; r >= 0; r--) {
        let full = true
        for (let c = 0; c < COLS; c++) if (!st.grid[r][c]) { full = false; break }
        if (full) {
          let rowVal = 0
          for (let c = 0; c < COLS; c++) rowVal += st.grid[r][c].value
          // Later rounds bank bigger money per row — that's what keeps the
          // finale tense instead of long.
          banked += Math.max(1, Math.round(rowVal * (rc.cfg.valueMul || 1)))
          n++
          for (let rr = r; rr > 0; rr--) st.grid[rr] = st.grid[rr - 1].slice()
          st.grid[0] = new Array(COLS).fill(null)
          r++
        }
      }
      if (n > 0) {
        // No multi-row bonus. Money is banked for the expenses actually cleared
        // off the board and nothing else, so a row is worth exactly what its
        // expenses are worth however many you clear at once. The TETRIS! banner
        // below stays as flair.
        st.saved += banked
        st.roundBanked += banked
        st.cleared += n
        st.roundRows += n
        st.level = 1 + Math.floor(st.cleared / 10)
        st.floats.push({ text: n >= 4 ? 'TETRIS! 🥑' : n > 1 ? `${n} rows! Budget win` : 'Row cleared!', t0: performance.now(), life: 1000 })
        const stages = rc.cfg.stages || 1
        if (stages > 1) {
          const want = stageFor(rc.idx, st.roundBanked, rc.target)
          if (want > st.stage) {
            st.stage = want
            st.floats.push({ text: `⚡ Stage ${want} — faster!`, t0: performance.now(), life: 1100 })
          }
        }
        if (st.roundBanked >= rc.target) { syncHud(); clearRound(); return }
      }
    }

    const lock = (st) => {
      const p = st.piece
      const frame = frameOf(p)
      const perCell = Math.max(1, Math.round(p.value / 4))
      // anchor = top-left-most cell — carries the label so each block is tagged once
      let anchor = frame[0]
      for (const c of frame) if (c[1] < anchor[1] || (c[1] === anchor[1] && c[0] < anchor[0])) anchor = c
      let topped = false
      for (const [cx, cy] of frame) {
        const x = p.x + cx, y = p.y + cy
        if (y < 0) { topped = true; continue }
        st.grid[y][x] = { color: p.color, value: perCell, icon: (cx === anchor[0] && cy === anchor[1]) ? p.emoji : null }
      }
      st.roundPieces += 1
      clearLines(st)
      if (topped) { endRun(false); return }
      if (statusRef.current !== 'playing') return   // the round just cleared
      st.piece = st.next || makePiece()
      st.next = makePiece()
      st.dropAcc = 0
      syncHud()
      if (collide(st, st.piece, st.piece.x, st.piece.y, st.piece.rot)) endRun(false)
    }

    const hardDrop = () => {
      const st = sim.current
      if (!st.piece || statusRef.current !== 'playing') return
      while (tryMove(st, 0, 1)) { /* fall */ }
      lock(st)
    }

    const endRun = (win) => {
      const st = sim.current
      st.over = true
      if (!win) learn(false)
      save(st.saved, roundRef.current.idx + 1)
      if (st.saved > bestRef.current) {
        bestRef.current = st.saved
        setBest(st.saved)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.saved)) } catch {}
      }
      setStatus(win ? 'journeydone' : 'over')
    }

    const clearRound = () => {
      const st = sim.current
      learn(true)
      st.piece = null
      st.dropFast = false
      setStatus('clearing')
      clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => {
        if (isLastRef.current) endRun(true)
        else setStatus('roundclear')
      }, 900)
    }

    // expose the control verbs to DOM / keyboard handlers
    actionsRef.current = {
      move: (dx) => { if (statusRef.current === 'playing') tryMove(sim.current, dx, 0) },
      rotate,
      hardDrop,
      soft: (on) => { sim.current.dropFast = on },
    }

    const update = (st, dt) => {
      if (!st.piece) return
      st.dropAcc += dt
      // Base Tetris curve, then the journey round's ramp × the stage inside it
      // × what the auto-learning engine reckons this player can handle.
      const rc = roundRef.current
      const heat = Math.max(0.7, Math.min(2.6,
        (rc.cfg.dropMul || 1) * (1 + (st.stage - 1) * 0.1) * diffRef.current.mul))
      const base = Math.max(0.11, 0.8 - (st.level - 1) * 0.07)
      const interval = st.dropFast ? 0.05 : Math.max(0.06, base / heat)
      let guard = 0
      while (st.dropAcc >= interval && guard++ < ROWS + 2) {
        st.dropAcc -= interval
        if (!tryMove(st, 0, 1)) { lock(st); break }
        if (statusRef.current !== 'playing') break
      }
    }

    const geo = (st) => {
      const { w, h } = sizeRef.current
      const cell = Math.max(10, Math.floor(Math.min(w / COLS, h / ROWS)))
      st.cell = cell
      const boardW = cell * COLS, boardH = cell * ROWS
      return { cell, boardW, boardH, ox: (w - boardW) / 2, oy: (h - boardH) / 2 }
    }

    const drawBlock = (ctx2, x, y, cell, color, icon, glow) => {
      ctx2.beginPath()
      if (ctx2.roundRect) ctx2.roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, 5)
      else ctx2.rect(x + 1.5, y + 1.5, cell - 3, cell - 3)
      if (glow) { ctx2.shadowColor = color; ctx2.shadowBlur = 14 }
      ctx2.fillStyle = color; ctx2.fill(); ctx2.shadowBlur = 0
      // bevel
      ctx2.fillStyle = 'rgba(255,255,255,0.28)'; ctx2.fillRect(x + 2.5, y + 2.5, cell - 5, Math.max(2, cell * 0.14))
      ctx2.fillStyle = 'rgba(0,0,0,0.18)'; ctx2.fillRect(x + 2.5, y + cell - Math.max(3, cell * 0.16), cell - 5, Math.max(2, cell * 0.13))
      if (icon) {
        // one category icon per piece (on its anchor cell) — replaces the name text
        ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle'
        ctx2.font = `${Math.round(cell * 0.58)}px ${BODY_FONT}`
        ctx2.fillText(icon, x + cell / 2, y + cell * 0.54)
      }
    }

    const render = (st) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)   // transparent — flat #052e16 field shows through
      if (!st.grid) return
      const { cell, boardW, boardH, ox, oy } = geo(st)

      // white play well on the light field, with a soft guac hairline
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(ox - 9, oy - 9, boardW + 18, boardH + 18, 12)
      else ctx.rect(ox - 9, oy - 9, boardW + 18, boardH + 18)
      ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(20,83,45,0.14)'; ctx.stroke()

      // faint grid
      ctx.strokeStyle = 'rgba(20,83,45,0.06)'; ctx.lineWidth = 1
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(ox + c * cell, oy); ctx.lineTo(ox + c * cell, oy + boardH); ctx.stroke() }
      for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(ox, oy + r * cell); ctx.lineTo(ox + boardW, oy + r * cell); ctx.stroke() }

      // settled blocks
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const d = st.grid[r][c]
        if (d) drawBlock(ctx, ox + c * cell, oy + r * cell, cell, d.color, d.icon, d.color === '#34d399')
      }

      const p = st.piece
      if (p) {
        // ghost — where it lands
        let gy = p.y
        while (!collide(st, p, p.x, gy + 1, p.rot)) gy++
        ctx.strokeStyle = 'rgba(20,83,45,0.28)'; ctx.lineWidth = 1.5
        for (const [cx, cy] of frameOf(p)) {
          const yy = gy + cy; if (yy < 0) continue
          ctx.beginPath()
          if (ctx.roundRect) ctx.roundRect(ox + (p.x + cx) * cell + 2.5, oy + yy * cell + 2.5, cell - 5, cell - 5, 4)
          else ctx.rect(ox + (p.x + cx) * cell + 2.5, oy + yy * cell + 2.5, cell - 5, cell - 5)
          ctx.stroke()
        }
        // active piece
        const frame = frameOf(p)
        let anchor = frame[0]
        for (const c of frame) if (c[1] < anchor[1] || (c[1] === anchor[1] && c[0] < anchor[0])) anchor = c
        for (const [cx, cy] of frame) {
          const yy = p.y + cy; if (yy < 0) continue
          drawBlock(ctx, ox + (p.x + cx) * cell, oy + yy * cell, cell, p.color, (cx === anchor[0] && cy === anchor[1]) ? p.emoji : null, p.color === '#34d399')
        }
        // the expense NAME (+ price) floating just above the falling piece
        let minY = 99, sx = 0, cnt = 0
        for (const [cx, cy] of frame) { minY = Math.min(minY, cy); sx += cx; cnt++ }
        const lx = ox + (p.x + sx / cnt + 0.5) * cell
        const ly = oy + (p.y + minY) * cell - 5
        if (ly > oy + 8) {
          const txt = `${shortLabel(p.label)}  $${p.value}`
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
          ctx.font = `800 12px ${BODY_FONT}`
          const tw = ctx.measureText(txt).width
          const clx = Math.max(tw / 2 + 2, Math.min(w - tw / 2 - 2, lx))
          ctx.shadowColor = 'rgba(255,255,255,0.85)'; ctx.shadowBlur = 4
          ctx.fillStyle = '#15281C'
          ctx.fillText(txt, clx, ly)
          ctx.shadowBlur = 0
        }
      }

      const now = performance.now()
      st.floats = (st.floats || []).filter((f) => now - f.t0 < f.life)
      for (const f of st.floats) {
        ctx.globalAlpha = Math.max(0, 1 - (now - f.t0) / f.life)
        ctx.fillStyle = '#166534'; ctx.font = `900 18px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(f.text, ox + boardW / 2, oy + boardH * 0.42)
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
  }, [setStatus, save, makePiece, record, diffRef])

  // ── controls ────────────────────────────────────────────────────────────────
  const onDown = (e) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    touchRef.current = { x: e.clientX, y: e.clientY, lastX: e.clientX, moved: false, t: performance.now() }
  }
  const onMove = (e) => {
    const tc = touchRef.current
    if (!tc || statusRef.current !== 'playing') return
    const cellPx = sim.current.cell || 28
    let dx = e.clientX - tc.lastX
    while (Math.abs(dx) >= cellPx) {
      const dir = dx > 0 ? 1 : -1
      actionsRef.current.move?.(dir)
      tc.lastX += dir * cellPx; tc.moved = true
      dx = e.clientX - tc.lastX
    }
    actionsRef.current.soft?.(e.clientY - tc.y > cellPx * 1.3)   // drag down = soft drop
  }
  const onUp = () => {
    const tc = touchRef.current
    touchRef.current = null
    actionsRef.current.soft?.(false)
    if (tc && !tc.moved && performance.now() - tc.t < 300) actionsRef.current.rotate?.()   // tap = rotate
  }

  useEffect(() => {
    const kd = (e) => {
      if (statusRef.current !== 'playing') return
      const A = actionsRef.current, k = e.key
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', ' '].includes(k)) e.preventDefault()
      if (k === 'ArrowLeft' || k === 'a') A.move?.(-1)
      else if (k === 'ArrowRight' || k === 'd') A.move?.(1)
      else if (k === 'ArrowUp' || k === 'w') A.rotate?.()
      else if (k === 'ArrowDown' || k === 's') A.soft?.(true)
      else if (k === ' ') A.hardDrop?.()
    }
    const ku = (e) => { if (e.key === 'ArrowDown' || e.key === 's') actionsRef.current.soft?.(false) }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  const pause = useCallback(() => { if (statusRef.current === 'playing') setStatus('paused') }, [setStatus])
  useEffect(() => {
    const onBlur = () => pause()
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', vis) }
  }, [pause])

  // Start a fresh run beginning at round `idx` (0 = from the top).
  const startRun = (idx = 0) => {
    Object.assign(sim.current, freshSim())
    setHud({ saved: 0, cleared: 0, level: 1, next: null })
    setRoundHud({ banked: 0, target: withBudgetBump(targetsRef.current[idx]), stage: 1 })
    setNewBest(false)
    resetSave()
    startFrom(idx)
    setStatus('intro')
  }
  // Player tapped Start on the round's teaching card — reset the well and drop.
  const beginRound = () => {
    const st = sim.current
    roundRef.current = { cfg: TETRIS_ROUNDS[roundIdx], target, idx: roundIdx }
    st.grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null))
    st.piece = makePiece()
    st.next = makePiece()
    st.roundBanked = 0; st.stage = 1; st.cleared = 0; st.level = 1
    st.dropAcc = 0; st.dropFast = false; st.lastT = null; st.over = false; st.floats = []
    st.roundT0 = performance.now(); st.roundRows = 0; st.roundPieces = 0
    setHud({ saved: st.saved, cleared: 0, level: 1, next: { key: st.next.key, color: st.next.color, label: st.next.label } })
    setRoundHud({ banked: 0, target, stage: 1 })
    setStatus('playing')
  }
  const onRoundNext = () => {
    if (isLast) { setStatus('journeydone'); return } // safety; last round routes via endRun
    advance()
    setStatus('intro')
  }
  const resume = () => { sim.current.lastT = null; setStatus('playing') }
  const canContinue = furthest > 0

  const overlayCard = 'rounded-2xl p-5 text-center w-full'
  const pillGreen = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const ctrlBtn = 'flex-1 py-3 rounded-xl font-bold text-white text-lg'

  // Rail card: label on the left, a matching icon pinned to the right side.
  const RailCard = ({ label, icon, children }) => (
    <div style={{ background: '#ffffff', border: CARD_BORDER, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: BODY_FONT, color: MUTED, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>{label}</span>
        <span aria-hidden style={{ fontSize: 15, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      </div>
      {children}
    </div>
  )
  // NEXT tetromino preview (mockup 1c rail)
  const nextCells = hud.next ? SHAPES[hud.next.key][0] : []

  return (
    <div className="mx-auto w-full select-none">
      {/* Light guac backdrop */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(460px, calc(100svh - 250px), 840px)', minHeight: 440, background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)' }}>
        {/* board + right rail, centered on the field (mockup gap = 36px) */}
        {/* top padding leaves room for the HUD pill AND the round goal bar, so
            neither covers the rows where pieces spawn */}
        <div className="absolute inset-0 flex items-stretch justify-center" style={{ padding: '128px 20px 20px', gap: 36 }}>
          <div className="relative h-full" style={{ width: 'min(60vw, 300px)', flex: '0 0 auto' }}>
            <canvas
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="absolute inset-0 w-full h-full"
              style={{ touchAction: 'none', cursor: status === 'playing' ? 'pointer' : 'default' }}
            />
          </div>

          <div className="hidden sm:flex flex-col gap-4 self-center" style={{ width: 220 }}>
            <RailCard label="NEXT" icon="⏭️">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 22px)', gridAutoRows: '22px', gap: 4 }}>
                {Array.from({ length: 16 }).map((_, i) => {
                  const c = i % 4, r = Math.floor(i / 4)
                  const on = nextCells.some(([x, y]) => x === c && y === r)
                  return <div key={i} style={{ width: 22, height: 22, borderRadius: 5, background: on ? (hud.next?.color || '#fb923c') : 'transparent' }} />
                })}
              </div>
              <div style={{ fontFamily: BODY_FONT, color: INK, fontSize: 13, fontWeight: 800, marginTop: 8 }}>{shortLabel(hud.next?.label || 'EXPENSE')}</div>
            </RailCard>
            <RailCard label="LINES CLEARED" icon="🧹">
              <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 28, color: INK, lineHeight: 1 }}>{hud.cleared}</div>
            </RailCard>
            <RailCard label="MONTH BALANCE" icon={<AvocadoPip size={15} />}>
              <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 28, color: '#16a34a', lineHeight: 1 }}>+${hud.saved}</div>
            </RailCard>
          </div>
        </div>

        {/* Unified HUD — SCORE pill + pause (mockup 1c) */}
        {(status === 'playing' || status === 'clearing') && (
          <>
            <ArcadeHud
              dark={false}
              score={hud.saved} scoreLabel="SCORE"
              hint="← → move · ↑ / tap rotate · ↓ soft drop · space hard drop"
              onPause={status === 'playing' ? pause : undefined}
            />
            <JourneyBar round={round} banked={roundHud.banked} target={roundHud.target}
              stage={roundHud.stage} stages={cfg.stages} />
          </>
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.55)' }}>
            <div className={`${overlayCard} max-h-full overflow-y-auto`} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-4xl mb-1">🧱</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Block Drop</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>
                Classic Tetris, money-skinned — every falling piece is one of your expenses. Rotate and slot them to complete rows.
              </p>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Each full row you clear <span className="font-bold" style={{ color: GREEN }}>banks the savings</span> toward that round&apos;s goal — seven rounds, one money journey. Stack to the top and the run is over.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {JOURNEY.map((r) => (
                  <span key={r.id} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.color}18`, color: r.dark || r.color }}>{r.emoji} {r.title}</span>
                ))}
              </div>
              <AdaptiveChip diff={diff} note={note} compact />
              <div className="flex flex-col items-center gap-2 mt-4">
                <button onClick={() => startRun(0)} disabled={loading} className={pillGreen} style={{ background: loading ? '#9ca3af' : GREEN }}>
                  {loading ? 'Loading…' : canContinue ? 'Start from Round 1' : 'Start the journey'}
                </button>
                {canContinue && !loading && (
                  <button onClick={() => startRun(furthest)} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
                    Continue from Round {furthest + 1} · {TETRIS_ROUNDS[furthest].emoji} {TETRIS_ROUNDS[furthest].title}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'intro' && (
          <RoundIntro round={round} target={target} stages={cfg.stages} diff={diff} note={note}
            onStart={beginRound} cta={roundIdx === 0 ? 'Start stacking' : 'Start round'} />
        )}

        {status === 'roundclear' && (
          <RoundComplete round={cfg} next={nextRound} banked={hud.saved} diff={diff} note={note} onNext={onRoundNext} />
        )}

        {status === 'journeydone' && (
          <JourneyComplete banked={hud.saved} diff={diff} onReplay={() => startRun(0)} />
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.6)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg flex items-center justify-center gap-2" style={{ color: INK }}><AvocadoPip size={18} /> Paused</div>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.6)' }}>
            <div className={`${overlayCard} max-h-full overflow-y-auto`} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 400 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Stacked out!</div>
              <div className="text-xs font-semibold mt-1" style={{ color: MUTED }}>
                Stopped in Round {roundIdx + 1} · {round.emoji} {round.title}
              </div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>You banked this run</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.saved.toLocaleString()}</div>
              {newBest && (
                <div className="inline-flex items-center gap-1 mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best! <AvocadoPip size={13} /></div>
              )}
              <div className="mt-2 text-sm" style={{ color: BODY }}>{hud.cleared} rows cleared this round · level {hud.level}</div>
              <SaveScoreLine res={saveRes} />
              <AdaptiveChip diff={diff} note={note} compact />
              <div className="flex flex-col items-center gap-2 mt-4">
                <button onClick={() => startRun(roundIdx)} className={pillGreen} style={{ background: GREEN }}>
                  Retry Round {roundIdx + 1}
                </button>
                <button onClick={() => startRun(0)} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
                  Restart the journey
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex gap-2 mt-3 sm:hidden" style={{ visibility: status === 'playing' ? 'visible' : 'hidden' }}>
        <button className={ctrlBtn} style={{ background: '#334155' }} onPointerDown={() => actionsRef.current.move?.(-1)}>◀</button>
        <button className={ctrlBtn} style={{ background: '#334155' }} onPointerDown={() => actionsRef.current.rotate?.()}>⟳</button>
        <button className={ctrlBtn} style={{ background: '#334155' }} onPointerDown={() => actionsRef.current.move?.(1)}>▶</button>
        <button className={ctrlBtn} style={{ background: GREEN }}
          onPointerDown={() => actionsRef.current.soft?.(true)} onPointerUp={() => actionsRef.current.soft?.(false)} onPointerLeave={() => actionsRef.current.soft?.(false)}>▼</button>
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: MUTED }}>
        Real Tetris — arrows / on-screen buttons to move & rotate, ▼ soft drop, space hard drop. Fill a row to bank it. A game; it never touches your real data.
      </p>
    </div>
  )
}
