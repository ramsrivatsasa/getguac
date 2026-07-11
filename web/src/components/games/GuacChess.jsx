'use client'
// Guac Chess — full chess vs the computer, GetGuac edition. You run the Savers
// (White); the engine runs the Spenders (Black). Every piece wears a price tag,
// captures land in trays with a running $ value, and checkmating the Spenders
// balances the budget. Full rules: castling, en passant, auto-queen promotion,
// stalemate / insufficient-material / 50-quiet-move draws. The AI is minimax
// with alpha-beta and capture-first (MVV-LVA) ordering; Easy/Medium/Hard =
// search depth 1/2/3, with a node cap so Hard stays snappy.
import { useEffect, useMemo, useRef, useState } from 'react'

const GREEN = '#65A30D'
const AMBER = '#D9A514'
const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const BORDER = '1px solid rgba(20,83,45,0.10)'
const LIGHT_SQ = '#F4F7F2'
const DARK_SQ = '#A9C48F'
const LAST_SQ = '#FDF3D0'

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }
const TAG = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const GLYPH = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
}
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DEPTH = { easy: 1, medium: 2, hard: 3 }
const NO_CASTLE = { wk: false, wq: false, bk: false, bq: false }
const NODE_CAP = 90000 // keeps Hard (depth 3) comfortably under ~1s

// ————— Engine —————
// Board = 64-array, index 0 = a8 (top-left), 63 = h1. Piece = { type, color }.

function initialState() {
  const board = new Array(64).fill(null)
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
  for (let c = 0; c < 8; c++) {
    board[c] = { type: back[c], color: 'b' }
    board[8 + c] = { type: 'p', color: 'b' }
    board[48 + c] = { type: 'p', color: 'w' }
    board[56 + c] = { type: back[c], color: 'w' }
  }
  return { board, turn: 'w', castle: { wk: true, wq: true, bk: true, bq: true }, ep: null, half: 0 }
}

function sqName(i) { return 'abcdefgh'[i & 7] + (8 - (i >> 3)) }

function kingSq(board, color) {
  for (let i = 0; i < 64; i++) { const p = board[i]; if (p && p.type === 'k' && p.color === color) return i }
  return -1
}

// Is square `sq` attacked by any piece of color `by`?
function attacked(board, sq, by) {
  if (sq < 0) return false
  const r = sq >> 3, c = sq & 7
  const pr = r + (by === 'w' ? 1 : -1) // white pawns attack upward (row decreases)
  for (const dc of [-1, 1]) {
    const cc = c + dc
    if (pr >= 0 && pr < 8 && cc >= 0 && cc < 8) {
      const p = board[pr * 8 + cc]
      if (p && p.color === by && p.type === 'p') return true
    }
  }
  for (const [set, t] of [[KN, 'n'], [KG, 'k']]) {
    for (const [dr, dc] of set) {
      const rr = r + dr, cc = c + dc
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue
      const p = board[rr * 8 + cc]
      if (p && p.color === by && p.type === t) return true
    }
  }
  for (const [set, t] of [[DIAG, 'b'], [ORTH, 'r']]) {
    for (const [dr, dc] of set) {
      let rr = r + dr, cc = c + dc
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = board[rr * 8 + cc]
        if (p) { if (p.color === by && (p.type === t || p.type === 'q')) return true; break }
        rr += dr; cc += dc
      }
    }
  }
  return false
}

function inCheck(st, color) {
  return attacked(st.board, kingSq(st.board, color), color === 'w' ? 'b' : 'w')
}

// Pseudo-legal moves for the piece on `from` (legality filtered later).
function pseudoMoves(st, from) {
  const { board } = st
  const p = board[from]
  const moves = []
  const r = from >> 3, c = from & 7
  const add = (to, extra) => moves.push(extra ? { from, to, ...extra } : { from, to })
  if (p.type === 'p') {
    const dir = p.color === 'w' ? -1 : 1
    const one = from + dir * 8
    if (one >= 0 && one < 64 && !board[one]) {
      add(one)
      if (r === (p.color === 'w' ? 6 : 1) && !board[from + dir * 16]) add(from + dir * 16, { dbl: true })
    }
    for (const dc of [-1, 1]) {
      const cc = c + dc
      if (cc < 0 || cc > 7) continue
      const to = (r + dir) * 8 + cc
      if (to < 0 || to > 63) continue
      const t = board[to]
      if (t && t.color !== p.color) add(to)
      else if (!t && to === st.ep) add(to, { ep: true })
    }
  } else if (p.type === 'n' || p.type === 'k') {
    for (const [dr, dc] of p.type === 'n' ? KN : KG) {
      const rr = r + dr, cc = c + dc
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue
      const t = board[rr * 8 + cc]
      if (!t || t.color !== p.color) add(rr * 8 + cc)
    }
    if (p.type === 'k') {
      const home = p.color === 'w' ? 56 : 0
      const foe = p.color === 'w' ? 'b' : 'w'
      const canK = p.color === 'w' ? st.castle.wk : st.castle.bk
      const canQ = p.color === 'w' ? st.castle.wq : st.castle.bq
      if (from === home + 4 && (canK || canQ) && !attacked(board, from, foe)) {
        if (canK && !board[home + 5] && !board[home + 6] && board[home + 7] && board[home + 7].type === 'r' &&
          board[home + 7].color === p.color && !attacked(board, home + 5, foe) && !attacked(board, home + 6, foe)) add(home + 6, { castle: 'k' })
        if (canQ && !board[home + 1] && !board[home + 2] && !board[home + 3] && board[home] && board[home].type === 'r' &&
          board[home].color === p.color && !attacked(board, home + 3, foe) && !attacked(board, home + 2, foe)) add(home + 2, { castle: 'q' })
      }
    }
  } else {
    for (const [dr, dc] of p.type === 'b' ? DIAG : p.type === 'r' ? ORTH : KG) {
      let rr = r + dr, cc = c + dc
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const t = board[rr * 8 + cc]
        if (!t) add(rr * 8 + cc)
        else { if (t.color !== p.color) add(rr * 8 + cc); break }
        rr += dr; cc += dc
      }
    }
  }
  return moves
}

// Apply a move, returning the next immutable state. Auto-queens promotions.
function applyMove(st, m) {
  const board = st.board.slice()
  const p = board[m.from]
  const castle = { ...st.castle }
  let half = st.half + 1
  if (board[m.to]) half = 0
  board[m.to] = p
  board[m.from] = null
  let ep = null
  if (p.type === 'p') {
    half = 0
    if (m.ep) board[m.to + (p.color === 'w' ? 8 : -8)] = null
    if (m.dbl) ep = (m.from + m.to) / 2
    if ((m.to >> 3) === (p.color === 'w' ? 0 : 7)) board[m.to] = { type: 'q', color: p.color }
  }
  if (m.castle) {
    const home = p.color === 'w' ? 56 : 0
    if (m.castle === 'k') { board[home + 5] = board[home + 7]; board[home + 7] = null }
    else { board[home + 3] = board[home]; board[home] = null }
  }
  if (p.type === 'k') { if (p.color === 'w') { castle.wk = castle.wq = false } else { castle.bk = castle.bq = false } }
  for (const [sq, key] of [[56, 'wq'], [63, 'wk'], [0, 'bq'], [7, 'bk']]) {
    if (m.from === sq || m.to === sq) castle[key] = false
  }
  return { board, turn: st.turn === 'w' ? 'b' : 'w', castle, ep, half }
}

function legalFrom(st, from) {
  return pseudoMoves(st, from).filter((m) => {
    const nx = applyMove(st, m)
    return !attacked(nx.board, kingSq(nx.board, st.turn), nx.turn)
  })
}

function allLegal(st) {
  const out = []
  for (let i = 0; i < 64; i++) if (st.board[i] && st.board[i].color === st.turn) out.push(...legalFrom(st, i))
  return out
}

// Only K vs K, K+N vs K, K+B vs K count as dead positions here.
function insufficient(board) {
  let minors = 0
  for (const p of board) {
    if (!p || p.type === 'k') continue
    if (p.type === 'n' || p.type === 'b') minors++
    else return false
  }
  return minors <= 1
}

// White-positive eval: material + small center bonus (pawns/knights) + a tiny
// mobility term (slider/knight pseudo-move counts — cheap, no legality sims).
function evalState(st) {
  let s = 0
  const mob = { board: st.board, castle: NO_CASTLE, ep: null }
  for (let i = 0; i < 64; i++) {
    const p = st.board[i]
    if (!p) continue
    let v = VAL[p.type]
    if (p.type === 'p' || p.type === 'n') {
      const r = i >> 3, c = i & 7
      if (r > 1 && r < 6 && c > 1 && c < 6) v += 6
      if (r > 2 && r < 5 && c > 2 && c < 5) v += 8
    }
    if (p.type !== 'p' && p.type !== 'k') v += pseudoMoves(mob, i).length * 2
    s += p.color === 'w' ? v : -v
  }
  return s
}

// MVV-LVA: biggest victim first, cheapest attacker breaking ties.
function orderMoves(st, moves) {
  for (const m of moves) {
    const v = m.ep ? 100 : st.board[m.to] ? VAL[st.board[m.to].type] : 0
    m.k = v ? 10000 + v * 10 - VAL[st.board[m.from].type] : 0
  }
  moves.sort((a, b) => b.k - a.k)
}

let nodes = 0
function search(st, depth, alpha, beta) {
  if (depth <= 0 || ++nodes > NODE_CAP) {
    const e = evalState(st)
    return st.turn === 'w' ? e : -e
  }
  const moves = allLegal(st)
  if (!moves.length) return inCheck(st, st.turn) ? -(100000 + depth * 100) : 0
  orderMoves(st, moves)
  let best = -Infinity
  for (const m of moves) {
    const sc = -search(applyMove(st, m), depth - 1, -beta, -alpha)
    if (sc > best) { best = sc; if (sc > alpha) alpha = sc; if (alpha >= beta) break }
  }
  return best
}

function bestMove(st, depth) {
  nodes = 0
  const moves = allLegal(st)
  if (!moves.length) return null
  orderMoves(st, moves)
  let best = null, bestSc = -Infinity, alpha = -Infinity
  for (const m of moves) {
    const raw = -search(applyMove(st, m), depth - 1, -Infinity, -alpha)
    const sc = raw + Math.random() * 4 // tiny jitter so games vary
    if (sc > bestSc) { bestSc = sc; best = m }
    if (raw > alpha) alpha = raw
  }
  return best
}

// History entry: state after the move + notation + whatever got captured.
function makeEntry(st, m) {
  const p = st.board[m.from]
  const captured = (m.ep ? st.board[m.to + (p.color === 'w' ? 8 : -8)] : st.board[m.to]) || null
  const promo = p.type === 'p' && ((m.to >> 3) === 0 || (m.to >> 3) === 7)
  const note = m.castle ? (m.castle === 'k' ? 'O–O' : 'O–O–O')
    : sqName(m.from) + (captured ? '×' : '–') + sqName(m.to) + (promo ? '=Q' : '')
  return { state: applyMove(st, m), move: m, note, captured }
}

// ————— Component —————

export default function GuacChess() {
  const [hist, setHist] = useState(() => [{ state: initialState(), move: null, note: null, captured: null }])
  const [sel, setSel] = useState(null)
  const [diff, setDiff] = useState('medium')
  const [twoP, setTwoP] = useState(false)
  const listRef = useRef(null)

  const cur = hist[hist.length - 1].state
  const lastMove = hist[hist.length - 1].move

  const legal = useMemo(() => allLegal(cur), [cur])
  const checkNow = useMemo(() => inCheck(cur, cur.turn), [cur])
  const status = useMemo(() => {
    if (!legal.length) return checkNow ? 'mate' : 'stalemate'
    if (cur.half >= 100) return 'fifty'
    if (insufficient(cur.board)) return 'material'
    return 'play'
  }, [cur, legal, checkNow])
  const over = status !== 'play'
  const thinking = !twoP && !over && cur.turn === 'b'
  const checkSq = checkNow ? kingSq(cur.board, cur.turn) : -1
  const targets = useMemo(() => (sel === null ? [] : legal.filter((m) => m.from === sel)), [sel, legal])

  const trays = useMemo(() => {
    const w = [], b = []
    for (const h of hist) if (h.captured) (h.captured.color === 'b' ? w : b).push(h.captured)
    return { w, b }
  }, [hist])
  const wVal = trays.w.reduce((s, p) => s + TAG[p.type], 0)
  const bVal = trays.b.reduce((s, p) => s + TAG[p.type], 0)
  const net = wVal - bVal

  const rows = useMemo(() => {
    const out = []
    for (let i = 1; i < hist.length; i += 2) out.push({ n: (i + 1) / 2, w: hist[i].note, b: hist[i + 1] ? hist[i + 1].note : '' })
    return out
  }, [hist])

  // The Spenders move: give React 50ms to paint "thinking…", then search.
  useEffect(() => {
    if (twoP || over || cur.turn !== 'b') return
    const t = setTimeout(() => {
      const moves = allLegal(cur)
      if (!moves.length) return
      const mv = diff === 'easy' && Math.random() < 0.3
        ? moves[Math.floor(Math.random() * moves.length)]
        : bestMove(cur, DEPTH[diff]) || moves[0]
      setHist((h) => (h[h.length - 1].state === cur ? [...h, makeEntry(cur, mv)] : h))
    }, 50)
    return () => clearTimeout(t)
  }, [cur, twoP, diff, over])

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [hist])

  const onSquare = (i) => {
    if (over || thinking) return
    const p = cur.board[i]
    if (sel !== null) {
      const m = targets.find((t) => t.to === i)
      if (m) { setSel(null); setHist((h) => [...h, makeEntry(cur, m)]); return }
    }
    if (p && p.color === cur.turn) setSel(sel === i ? null : i)
    else setSel(null)
  }

  const undo = () => {
    if (thinking || hist.length < 2) return
    setSel(null)
    setHist((h) => {
      if (h.length < 2) return h
      if (twoP) return h.slice(0, -1)
      let n = h.length - 1 // vs AI: rewind their reply and your move together
      do { n-- } while (n > 0 && h[n].state.turn !== 'w')
      return h.slice(0, n + 1)
    })
  }

  const newGame = () => { setHist([{ state: initialState(), move: null, note: null, captured: null }]); setSel(null) }

  let statusText
  if (over) statusText = 'Game over'
  else if (thinking) statusText = 'Spenders are thinking…'
  else if (hist.length === 1 && !twoP) statusText = '🥑 Welcome, Saver — you play White'
  else {
    statusText = twoP ? (cur.turn === 'w' ? 'Savers (White) to move' : 'Spenders (Black) to move') : 'Your move'
    if (checkNow) statusText += ' — check!'
  }

  const banner = !over ? null
    : status === 'mate'
      ? (cur.turn === 'b'
        ? { bg: '#f2fbf3', title: 'Budget balanced — the Spenders are broke! 🥑', sub: 'Checkmate. The Savers win.' }
        : { bg: '#fef3f2', title: 'Overspent — the Spenders got you.', sub: 'Checkmate. Better luck next budget.' })
      : status === 'stalemate' ? { bg: LIGHT_SQ, title: 'Draw — stalemate.', sub: 'No legal moves, nobody in check.' }
        : status === 'material' ? { bg: LIGHT_SQ, title: 'Draw — insufficient material.', sub: 'Neither side has enough left to checkmate.' }
          : { bg: LIGHT_SQ, title: 'Draw — 50 quiet moves.', sub: 'Fifty moves with no capture or pawn move ends it.' }

  const pill = { border: '1px solid rgba(20,83,45,0.18)', color: INK }

  return (
    <div className="mx-auto max-w-lg px-4 select-none">
      {/* Status + two-player toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold" style={{ color: MUTED }}>{statusText}</div>
        <button onClick={() => { setTwoP((v) => !v); setSel(null) }} className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
          style={twoP ? { background: INK, color: '#fff' } : pill}>
          👥 Two players {twoP ? 'on' : 'off'}
        </button>
      </div>

      {/* Result banner */}
      {banner && (
        <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: banner.bg, border: BORDER }}>
          <div className="font-display font-extrabold text-lg" style={{ color: INK }}>{banner.title}</div>
          <p className="text-sm mt-1" style={{ color: BODY }}>
            {banner.sub} Final ledger: Savers ${wVal} — Spenders ${bVal} in captured material.
          </p>
          <button onClick={newGame} className="text-sm font-bold px-4 py-2 rounded-full text-white mt-3" style={{ background: GREEN }}>
            New game
          </button>
        </div>
      )}

      {/* Board */}
      <div style={{ maxWidth: 480, minWidth: 320, margin: '0 auto', touchAction: 'manipulation' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(20,83,45,0.15)' }}>
          {cur.board.map((p, i) => {
            const t = targets.find((m) => m.to === i)
            const rings = []
            if (sel === i) rings.push(`inset 0 0 0 3px ${GREEN}`)
            if (checkSq === i) rings.push('inset 0 0 0 3px #DC2626')
            if (t && (p || t.ep)) rings.push('inset 0 0 0 3px rgba(101,163,13,0.85)')
            return (
              <div key={i} onClick={() => onSquare(i)} style={{
                aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minWidth: 0,
                background: lastMove && (lastMove.from === i || lastMove.to === i) ? LAST_SQ : ((i >> 3) + (i & 7)) % 2 ? DARK_SQ : LIGHT_SQ,
                boxShadow: rings.join(', ') || 'none',
              }}>
                {p
                  ? <span style={{ fontSize: 'clamp(26px, 9vw, 42px)', lineHeight: 1, color: INK }}>{GLYPH[p.color][p.type]}</span>
                  : t && !t.ep && <span style={{ width: '26%', height: '26%', borderRadius: '50%', background: 'rgba(101,163,13,0.5)' }} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Capture trays + net swing */}
      <div className="rounded-2xl p-3 mt-3 mb-3" style={{ border: BORDER }}>
        {[['Savers captured', trays.w, wVal], ['Spenders captured', trays.b, bVal]].map(([label, arr, v]) => (
          <div key={label} className="flex items-center justify-between gap-2 py-0.5">
            <div className="flex items-center flex-wrap">
              <span className="text-[11px] font-bold mr-1" style={{ color: MUTED, width: 118 }}>{label}</span>
              {arr.length
                ? arr.map((cp, i) => <span key={i} style={{ fontSize: 17, lineHeight: 1.2, color: INK }}>{GLYPH[cp.color][cp.type]}</span>)
                : <span className="text-[11px]" style={{ color: FAINT }}>nothing yet</span>}
            </div>
            <span className="font-display font-extrabold text-sm shrink-0" style={{ color: INK }}>${v} value</span>
          </div>
        ))}
        <div className="text-center font-display font-extrabold text-sm mt-1.5" style={{ color: net > 0 ? '#065f46' : net < 0 ? AMBER : MUTED }}>
          {net > 0 ? `Savers up $${net}` : net < 0 ? `Spenders up $${-net}` : 'Dead even — $0 apart'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={newGame} className="text-xs font-bold px-4 py-2 rounded-full text-white" style={{ background: GREEN }}>New game</button>
        <button onClick={undo} disabled={thinking || hist.length < 2} className="text-xs font-bold px-4 py-2 rounded-full"
          style={{ ...pill, opacity: thinking || hist.length < 2 ? 0.4 : 1 }}>Undo</button>
        <div className="flex gap-1 ml-auto">
          {['easy', 'medium', 'hard'].map((d) => (
            <button key={d} onClick={() => setDiff(d)} className="text-xs font-bold px-3 py-2 rounded-full capitalize"
              style={diff === d ? { background: GREEN, color: '#fff' } : pill}>{d}</button>
          ))}
        </div>
      </div>

      {/* Move sheet */}
      <div className="rounded-2xl p-4" style={{ border: BORDER }}>
        <div className="font-display font-extrabold text-sm mb-2" style={{ color: INK }}>Move sheet</div>
        <div ref={listRef} style={{ maxHeight: 160, overflowY: 'auto' }}>
          {rows.length === 0
            ? <div className="text-xs" style={{ color: FAINT }}>No moves yet — tap a white piece to begin.</div>
            : rows.map((r) => (
              <div key={r.n} className="flex gap-2 text-xs py-0.5" style={{ color: BODY }}>
                <span className="font-bold" style={{ color: FAINT, width: 22 }}>{r.n}.</span>
                <span style={{ width: 72 }}>{r.w}</span>
                <span>{r.b}</span>
              </div>
            ))}
        </div>
      </div>

      <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
        🥑 Savers (White) vs Spenders (Black) — full chess rules, pawns promote straight to queens.
        Price tags: pawn $1 · knight $3 · bishop $3 · rook $5 · queen $9. Grab their material, guard your own.
      </p>
    </div>
  )
}
