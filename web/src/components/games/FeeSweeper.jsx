'use client'
// Fee Sweeper — minesweeper, GetGuac edition. The board hides sneaky fees
// (💸); numbers count the fees touching each square. Flag the traps, clear
// everything else. First click is always safe (mines are laid after it),
// right-click or the 🚩 toggle flags, and clicking a satisfied number chords
// its neighbours open. DOM grid inside the shared GameFrame.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-sweeper-best-v1'
const DIFFS = {
  easy: { label: 'Easy', cols: 9, rows: 9, mines: 10, base: 600 },
  medium: { label: 'Medium', cols: 12, rows: 12, mines: 24, base: 1600 },
  hard: { label: 'Hard', cols: 16, rows: 16, mines: 44, base: 3200 },
}
const NUM_COLORS = ['', '#2563eb', '#16a34a', '#dc2626', '#1e3a8a', '#7c2d12', '#0f766e', '#111827', '#6b7280']

const blankBoard = (d) =>
  Array.from({ length: d.rows * d.cols }, () => ({ mine: false, adj: 0, state: 'hidden' }))

export default function FeeSweeper() {
  const [diffKey, setDiffKey] = useState('easy')
  const [board, setBoard] = useState(null)
  const [status, setStatus] = useState('idle')   // idle | playing | won | lost
  const [mined, setMined] = useState(false)      // mines laid yet?
  const [flagMode, setFlagMode] = useState(false)
  const [flags, setFlags] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const statusRef = useRef('idle')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('sweeper')

  const d = DIFFS[diffKey]
  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'open': tone({ f0: 500, f1: 700, t: 0.05, type: 'triangle', g: 0.07 }); break
      case 'flag': tone({ f0: 300, f1: 420, t: 0.07, type: 'square', g: 0.08 }); break
      case 'boom': [140, 90, 60].forEach((f, i) => tone({ f0: f, f1: f * 0.6, t: 0.25, type: 'sawtooth', g: 0.16, at: i * 0.06 })); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.08 })); break
      default: break
    }
  }

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const neighbors = (i, dd) => {
    const x = i % dd.cols, y = Math.floor(i / dd.cols)
    const out = []
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < dd.cols && ny < dd.rows) out.push(ny * dd.cols + nx)
    }
    return out
  }

  const newGame = (key = diffKey) => {
    const dd = DIFFS[key]
    setDiffKey(key)
    setBoard(blankBoard(dd))
    setMined(false)
    setFlags(0)
    setSeconds(0)
    setFlagMode(false)
    resetSave()
    setPhase('playing')
  }

  // lay mines after the first click, keeping it and its ring safe
  const layMines = (cells, safeIdx, dd) => {
    const safe = new Set([safeIdx, ...neighbors(safeIdx, dd)])
    let placed = 0
    while (placed < dd.mines) {
      const i = Math.floor(Math.random() * cells.length)
      if (safe.has(i) || cells[i].mine) continue
      cells[i].mine = true
      placed++
    }
    for (let i = 0; i < cells.length; i++) {
      cells[i].adj = neighbors(i, dd).filter((n) => cells[n].mine).length
    }
  }

  const floodOpen = (cells, i, dd) => {
    const stack = [i]
    while (stack.length) {
      const c = stack.pop()
      const cell = cells[c]
      if (cell.state === 'open' || cell.state === 'flag' || cell.mine) continue
      cell.state = 'open'
      if (cell.adj === 0) for (const n of neighbors(c, dd)) if (cells[n].state === 'hidden') stack.push(n)
    }
  }

  const finish = (cells, won) => {
    if (won) {
      sfx('win')
      const sc = Math.max(100, d.base - seconds * 2)
      setFinalScore(sc)
      submitBest(sc)
      save(sc, null)
      setPhase('won')
    } else {
      sfx('boom')
      for (const c of cells) if (c.mine && c.state !== 'flag') c.state = 'open'
      setPhase('lost')
    }
  }

  const checkWin = (cells) => cells.every((c) => c.mine || c.state === 'open')

  const openCell = (i) => {
    if (statusRef.current !== 'playing') return
    const cells = board.map((c) => ({ ...c }))
    const cell = cells[i]
    if (cell.state === 'flag') return
    if (!mined) {
      layMines(cells, i, d)
      setMined(true)
    }
    if (cell.state === 'open') {
      // chord: open neighbours when flags match the number
      if (cell.adj > 0) {
        const ns = neighbors(i, d)
        const flagged = ns.filter((n) => cells[n].state === 'flag').length
        if (flagged === cell.adj) {
          let boom = false
          for (const n of ns) {
            if (cells[n].state !== 'hidden') continue
            if (cells[n].mine) { cells[n].state = 'open'; boom = true }
            else floodOpen(cells, n, d)
          }
          setBoard(cells)
          if (boom) return finish(cells, false)
          if (checkWin(cells)) return finish(cells, true)
          sfx('open')
        }
      }
      return
    }
    if (cell.mine) {
      cell.state = 'open'
      cell.hit = true
      setBoard(cells)
      return finish(cells, false)
    }
    floodOpen(cells, i, d)
    setBoard(cells)
    sfx('open')
    if (checkWin(cells)) finish(cells, true)
  }

  const toggleFlag = (i) => {
    if (statusRef.current !== 'playing') return
    const cells = board.map((c) => ({ ...c }))
    const cell = cells[i]
    if (cell.state === 'open') return
    cell.state = cell.state === 'flag' ? 'hidden' : 'flag'
    setBoard(cells)
    setFlags(cells.filter((c) => c.state === 'flag').length)
    sfx('flag')
  }

  const onCellClick = (i) => (flagMode ? toggleFlag(i) : openCell(i))
  const onCellContext = (e, i) => { e.preventDefault(); toggleFlag(i) }

  const cellFont = d.cols <= 9 ? 'text-lg' : d.cols <= 12 ? 'text-base' : 'text-xs sm:text-sm'

  return (
    <GameFrame inner={d.cols <= 9 ? 480 : d.cols <= 12 ? 540 : 600}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {Object.entries(DIFFS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => newGame(k)}
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={k === diffKey ? { background: '#065f46', color: '#fff' } : { background: '#fff', color: BODY, border: '1px solid rgba(20,83,45,0.15)' }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }}>💸 {d.mines - flags}</span>
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }}>⏱ {seconds}s</span>
            <button
              type="button"
              onClick={() => setFlagMode((f) => !f)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-full"
              style={flagMode ? { background: '#b91c1c', color: '#fff' } : { background: '#fff', color: INK, border: '1px solid rgba(20,83,45,0.15)' }}
              aria-label="Toggle flag mode"
            >
              🚩 {flagMode ? 'Flagging' : 'Flag'}
            </button>
            <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="relative">
          <div
            className="grid rounded-2xl overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${d.cols}, 1fr)`, gap: 2, background: '#cfe0d2', padding: 4, border: '1px solid rgba(20,83,45,0.12)' }}
          >
            {(board || blankBoard(d)).map((c, i) => {
              const open = c.state === 'open'
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onCellClick(i)}
                  onContextMenu={(e) => onCellContext(e, i)}
                  className={`aspect-square flex items-center justify-center font-extrabold ${cellFont} rounded-[5px]`}
                  style={{
                    background: open ? (c.hit ? '#fecaca' : '#f4f8f2') : 'linear-gradient(180deg,#9fce6d, #7fb84a)',
                    color: open && c.adj > 0 ? NUM_COLORS[c.adj] : INK,
                    boxShadow: open ? 'none' : 'inset 0 -2px 0 rgba(0,0,0,0.15)',
                    cursor: status === 'playing' ? 'pointer' : 'default',
                    lineHeight: 1,
                  }}
                >
                  {c.state === 'flag' ? '🚩' : open ? (c.mine ? '💸' : c.adj || '') : ''}
                </button>
              )
            })}
          </div>

          {/* overlays */}
          {status !== 'playing' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl text-center px-6" style={{ background: 'rgba(255,255,255,0.93)' }}>
              {status === 'idle' && (
                <>
                  <div className="text-4xl mb-1">💣</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Fee Sweeper</div>
                  <p className="text-sm mt-2 mb-1 max-w-sm" style={{ color: BODY }}>
                    Hidden fees (💸) are buried in the board. Numbers count the fees touching that square —
                    open everything that isn&apos;t a fee.
                  </p>
                  <p className="text-xs mb-4" style={{ color: MUTED }}>Right-click or use the 🚩 toggle to flag. Your first click is always safe.</p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best sweep: {fmt(best)}</div>}
                  <div className="flex gap-2">
                    {Object.entries(DIFFS).map(([k, v]) => (
                      <button key={k} onClick={() => newGame(k)} className="font-bold px-5 py-2.5 rounded-full text-white text-sm" style={{ background: k === 'easy' ? GREEN : k === 'medium' ? '#D9A514' : '#b91c1c' }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {status === 'won' && (
                <>
                  <div className="text-3xl mb-1">🏆</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Board swept!</div>
                  <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(finalScore)}</div>
                  <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{DIFFS[diffKey].label} in {seconds}s · best {fmt(best)}</div>
                  {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best!</div>}
                  <SaveScoreLine res={saveRes} />
                  <div className="mt-4"><PrimaryButton onClick={() => newGame()}>Play again</PrimaryButton></div>
                </>
              )}
              {status === 'lost' && (
                <>
                  <div className="text-3xl mb-1">💥</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Fee&apos;d!</div>
                  <p className="text-sm mt-1 mb-3" style={{ color: BODY }}>You hit a hidden fee after {seconds}s. Classic bank move.</p>
                  <div className="flex gap-2">
                    <PrimaryButton onClick={() => newGame()}>Try again</PrimaryButton>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
          Numbers count adjacent fees · right-click / 🚩 toggle to flag · click a satisfied number to chord · faster sweeps score more.
        </p>
      </div>
    </GameFrame>
  )
}
