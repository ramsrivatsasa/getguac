'use client'
// Guac Crush — match-3 with the money set. Swap two neighbours to line up
// three or more; matches clear, tiles fall, and cascades chain a rising
// multiplier. 25 moves; longer runs and deeper chains pay more. If the board
// runs dry it reshuffles for free. DOM tiles with CSS transitions (the
// MoneyMerge pattern) inside the shared GameFrame.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-crush-best-v1'
const N = 8
const MOVES_PER_GAME = 25
const KINDS = ['🥑', '💵', '🪙', '💎', '🧾', '🐷']
const TILE_BG = ['#ecfccb', '#dcfce7', '#fef9c3', '#e0f2fe', '#fee2e2', '#fce7f3']

let tid = 1
const rnd = () => Math.floor(Math.random() * KINDS.length)

function buildBoard() {
  const g = Array.from({ length: N }, () => new Array(N).fill(null))
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    let v
    do { v = rnd() } while (
      (c >= 2 && g[r][c - 1].v === v && g[r][c - 2].v === v) ||
      (r >= 2 && g[r - 1][c].v === v && g[r - 2][c].v === v)
    )
    g[r][c] = { id: tid++, v }
  }
  return g
}

// all matched cell keys plus a bonus for runs longer than 3
function findMatches(g) {
  const hit = new Set()
  let bonus = 0
  const scan = (cells) => {
    let run = 1
    for (let i = 1; i <= cells.length; i++) {
      const same = i < cells.length && g[cells[i].r][cells[i].c].v === g[cells[i - 1].r][cells[i - 1].c].v
      if (same) run++
      else {
        if (run >= 3) {
          for (let j = i - run; j < i; j++) hit.add(`${cells[j].r},${cells[j].c}`)
          if (run === 4) bonus += 40
          if (run >= 5) bonus += 100
        }
        run = 1
      }
    }
  }
  for (let r = 0; r < N; r++) scan(Array.from({ length: N }, (_, c) => ({ r, c })))
  for (let c = 0; c < N; c++) scan(Array.from({ length: N }, (_, r) => ({ r, c })))
  return { hit, bonus }
}

function hasValidMove(g) {
  const tryswap = (r1, c1, r2, c2) => {
    ;[g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]]
    const ok = findMatches(g).hit.size > 0
    ;[g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]]
    return ok
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c + 1 < N && tryswap(r, c, r, c + 1)) return true
    if (r + 1 < N && tryswap(r, c, r + 1, c)) return true
  }
  return false
}

export default function GuacCrush() {
  const gridRef = useRef(null)          // 2D array of {id, v}
  const lockRef = useRef(false)
  const selRef = useRef(null)           // {r, c} selected tile
  const downRef = useRef(null)          // pointer-down info for drag swipes
  const boardElRef = useRef(null)

  const [, force] = useState(0)         // grid lives in a ref; bump to render
  const [dying, setDying] = useState(new Set())
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(MOVES_PER_GAME)
  const [chainTxt, setChainTxt] = useState('')
  const [status, setStatus] = useState('idle')   // idle | playing | over
  const statusRef = useRef('idle')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('crush')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const rerender = () => force((x) => x + 1)

  const sfx = (name) => {
    switch (name) {
      case 'swap': tone({ f0: 380, f1: 460, t: 0.06, type: 'triangle', g: 0.07 }); break
      case 'nope': tone({ f0: 220, f1: 160, t: 0.1, type: 'sawtooth', g: 0.07 }); break
      case 'clear': tone({ f0: 620, f1: 880, t: 0.09, type: 'square', g: 0.1 }); break
      case 'chain': [740, 990, 1240].forEach((f, i) => tone({ f0: f, t: 0.08, g: 0.11, at: i * 0.04 })); break
      case 'shuffle': tone({ f0: 300, f1: 500, t: 0.2, type: 'triangle', g: 0.08 }); break
      case 'end': [392, 494, 587, 784].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.08 })); break
      default: break
    }
  }

  const start = () => {
    gridRef.current = buildBoard()
    lockRef.current = false
    selRef.current = null
    setSelected(null)
    setDying(new Set())
    setScore(0)
    setMoves(MOVES_PER_GAME)
    setChainTxt('')
    resetSave()
    setPhase('playing')
    rerender()
  }

  const finishIfDone = (movesLeft, curScore) => {
    if (movesLeft > 0) return
    sfx('end')
    submitBest(curScore)
    save(curScore, null)
    setPhase('over')
  }

  // clear matches → gravity → refill → cascade
  const resolve = (chain, movesLeft, curScore) => {
    const g = gridRef.current
    const { hit, bonus } = findMatches(g)
    if (hit.size === 0) {
      lockRef.current = false
      setChainTxt('')
      if (!hasValidMove(g)) {
        sfx('shuffle')
        setChainTxt('No moves — reshuffling ✨')
        setTimeout(() => {
          gridRef.current = buildBoard()
          setChainTxt('')
          rerender()
        }, 600)
      }
      finishIfDone(movesLeft, curScore)
      return
    }
    const gained = hit.size * 20 * chain + bonus
    const newScore = curScore + gained
    setScore(newScore)
    if (chain > 1) setChainTxt(`Chain ×${chain}!`)
    sfx(chain > 1 ? 'chain' : 'clear')
    setDying(new Set(hit))
    setTimeout(() => {
      // gravity + refill
      for (let c = 0; c < N; c++) {
        const keep = []
        for (let r = N - 1; r >= 0; r--) if (!hit.has(`${r},${c}`)) keep.push(g[r][c])
        for (let r = N - 1; r >= 0; r--) {
          g[r][c] = keep[N - 1 - r] || { id: tid++, v: rnd(), fresh: true }
        }
      }
      setDying(new Set())
      rerender()
      setTimeout(() => resolve(chain + 1, movesLeft, newScore), 200)
    }, 220)
  }

  const trySwap = (a, b) => {
    const g = gridRef.current
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return
    lockRef.current = true
    selRef.current = null
    setSelected(null)
    ;[g[a.r][a.c], g[b.r][b.c]] = [g[b.r][b.c], g[a.r][a.c]]
    sfx('swap')
    rerender()
    setTimeout(() => {
      if (findMatches(g).hit.size === 0) {
        ;[g[a.r][a.c], g[b.r][b.c]] = [g[b.r][b.c], g[a.r][a.c]]
        sfx('nope')
        rerender()
        lockRef.current = false
        return
      }
      const movesLeft = moves - 1
      setMoves(movesLeft)
      resolve(1, movesLeft, score)
    }, 190)
  }

  const cellFromEvent = (e) => {
    const el = boardElRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * N)
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * N)
    if (r < 0 || c < 0 || r >= N || c >= N) return null
    return { r, c }
  }

  const onDown = (e) => {
    if (statusRef.current !== 'playing' || lockRef.current) return
    e.preventDefault()
    const cell = cellFromEvent(e)
    if (!cell) return
    downRef.current = { ...cell, x: e.clientX, y: e.clientY }
    if (selRef.current) {
      const s = selRef.current
      if (s.r === cell.r && s.c === cell.c) { selRef.current = null; setSelected(null); return }
      if (Math.abs(s.r - cell.r) + Math.abs(s.c - cell.c) === 1) { trySwap(s, cell); return }
    }
    selRef.current = cell
    setSelected(cell)
  }

  const onUp = (e) => {
    const d = downRef.current
    downRef.current = null
    if (!d || statusRef.current !== 'playing' || lockRef.current) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return // tap — selection already handled
    const dir = Math.abs(dx) > Math.abs(dy) ? { r: 0, c: Math.sign(dx) } : { r: Math.sign(dy), c: 0 }
    const to = { r: d.r + dir.r, c: d.c + dir.c }
    if (to.r < 0 || to.c < 0 || to.r >= N || to.c >= N) return
    trySwap({ r: d.r, c: d.c }, to)
  }

  useEffect(() => { gridRef.current = gridRef.current || buildBoard() }, [])

  const g = gridRef.current
  const pct = 100 / N

  return (
    <GameFrame inner={520}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: INK }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Moves </span>
              <span className="font-display font-bold text-sm" style={{ color: moves <= 5 ? '#dc2626' : INK }}>{moves}</span>
            </div>
            {chainTxt && <div className="text-xs font-bold" style={{ color: '#b45309' }}>{chainTxt}</div>}
          </div>
          <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Board */}
        <div className="relative">
          <div
            ref={boardElRef}
            onPointerDown={onDown}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="relative rounded-2xl"
            style={{ aspectRatio: '1', background: '#E7ECE8', touchAction: 'none' }}
          >
            {g && g.flatMap((row, r) =>
              row.map((t, c) => {
                const isDying = dying.has(`${r},${c}`)
                const isSel = selected && selected.r === r && selected.c === c
                return (
                  <div
                    key={t.id}
                    className="absolute flex items-center justify-center rounded-xl"
                    style={{
                      width: `calc(${pct}% - 5px)`,
                      height: `calc(${pct}% - 5px)`,
                      left: `calc(${c} * ${pct}% + 2.5px)`,
                      top: `calc(${r} * ${pct}% + 2.5px)`,
                      background: TILE_BG[t.v],
                      border: isSel ? '2.5px solid #065f46' : '1px solid rgba(20,83,45,0.1)',
                      fontSize: 'clamp(17px, 4.2vw, 30px)',
                      transition: 'left .18s ease, top .18s ease, transform .2s ease, opacity .2s ease',
                      transform: isDying ? 'scale(0.1)' : isSel ? 'scale(1.07)' : 'scale(1)',
                      opacity: isDying ? 0 : 1,
                      animation: t.fresh ? 'ggpop .18s ease' : 'none',
                      zIndex: isSel ? 2 : 1,
                    }}
                  >
                    {KINDS[t.v]}
                  </div>
                )
              })
            )}
          </div>

          {status !== 'playing' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              {status === 'idle' ? (
                <>
                  <div className="text-4xl mb-1">💎</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Guac Crush</div>
                  <p className="text-sm mt-2 mb-4 max-w-sm" style={{ color: BODY }}>
                    Swap two neighbours to line up three or more of a kind. Matches clear, tiles fall,
                    and every cascade multiplies the payout.
                  </p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best crush: {fmt(best)}</div>}
                  <PrimaryButton onClick={start}>Crush it</PrimaryButton>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">💎🏁</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Out of moves!</div>
                  <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
                  <div className="text-[11px] font-semibold" style={{ color: MUTED }}>best {fmt(best)}</div>
                  {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best! 🥑</div>}
                  <SaveScoreLine res={saveRes} />
                  <div className="mt-4"><PrimaryButton onClick={start}>Play again</PrimaryButton></div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
          Tap two neighbours (or swipe a tile) to swap · runs of 4–5 pay bonus · cascades multiply · 25 moves.
        </p>
        <style>{`@keyframes ggpop { 0%{transform:scale(.3)} 80%{transform:scale(1.06)} 100%{transform:scale(1)} }`}</style>
      </div>
    </GameFrame>
  )
}
