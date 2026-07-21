'use client'
// Guac Sudoku — a fresh, guaranteed-unique puzzle every game. The generator
// fills a full grid with randomized backtracking, then digs out cells one by
// one, keeping every removal only if the puzzle still has exactly one
// solution. Tap a cell, tap a number; wrong entries flash red and cost 100.
// DOM grid inside the shared GameFrame.
import { useEffect, useMemo, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-sudoku-best-v1'
const DIFFS = {
  easy: { label: 'Easy', givens: 40, base: 1000 },
  medium: { label: 'Medium', givens: 32, base: 2000 },
  hard: { label: 'Hard', givens: 26, base: 3200 },
}

const rowOf = (i) => Math.floor(i / 9), colOf = (i) => i % 9
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)

function candidatesOk(grid, i, v) {
  const r = rowOf(i), c = colOf(i), b = boxOf(i)
  for (let j = 0; j < 81; j++) {
    if (grid[j] === v && (rowOf(j) === r || colOf(j) === c || boxOf(j) === b)) return false
  }
  return true
}

function fillGrid(grid) {
  const i = grid.indexOf(0)
  if (i === -1) return true
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
  for (const v of vals) {
    if (candidatesOk(grid, i, v)) {
      grid[i] = v
      if (fillGrid(grid)) return true
      grid[i] = 0
    }
  }
  return false
}

function countSolutions(grid, limit = 2) {
  const g = [...grid]
  let count = 0
  const solve = () => {
    if (count >= limit) return
    // most-constrained cell first keeps this fast
    let bi = -1, bestOpts = null
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue
      const opts = []
      for (let v = 1; v <= 9; v++) if (candidatesOk(g, i, v)) opts.push(v)
      if (!bestOpts || opts.length < bestOpts.length) { bi = i; bestOpts = opts }
      if (opts.length <= 1) break
    }
    if (bi === -1) { count++; return }
    for (const v of bestOpts) {
      g[bi] = v
      solve()
      g[bi] = 0
      if (count >= limit) return
    }
  }
  solve()
  return count
}

function generate(givens) {
  const full = new Array(81).fill(0)
  fillGrid(full)
  const puzzle = [...full]
  const order = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5)
  let filled = 81
  for (const i of order) {
    if (filled <= givens) break
    const keep = puzzle[i]
    puzzle[i] = 0
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep
    else filled--
  }
  return { puzzle, solution: full }
}

export default function GuacSudoku() {
  const [diffKey, setDiffKey] = useState('easy')
  const [game, setGame] = useState(null)         // {puzzle, solution}
  const [entries, setEntries] = useState(null)   // 81 array of player values (0 empty)
  const [selected, setSelected] = useState(-1)
  const [mistakes, setMistakes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [status, setStatus] = useState('idle')   // idle | playing | won
  const [finalScore, setFinalScore] = useState(0)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('sudoku')

  const sfx = (name) => {
    switch (name) {
      case 'set': tone({ f0: 520, f1: 620, t: 0.05, type: 'triangle', g: 0.07 }); break
      case 'wrong': tone({ f0: 200, f1: 130, t: 0.16, type: 'sawtooth', g: 0.1 }); break
      case 'erase': tone({ f0: 300, f1: 240, t: 0.05, type: 'triangle', g: 0.05 }); break
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f0: f, t: 0.14, g: 0.14, at: i * 0.09 })); break
      default: break
    }
  }

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const start = (key = diffKey) => {
    setDiffKey(key)
    const g = generate(DIFFS[key].givens)
    setGame(g)
    setEntries([...g.puzzle])
    setSelected(-1)
    setMistakes(0)
    setSeconds(0)
    resetSave()
    setStatus('playing')
  }

  const value = (i) => (entries ? entries[i] : 0)
  const isGiven = (i) => game && game.puzzle[i] !== 0
  const isWrong = (i) => game && entries && entries[i] !== 0 && !isGiven(i) && entries[i] !== game.solution[i]

  const enter = (v) => {
    if (status !== 'playing' || selected < 0 || !game || isGiven(selected)) return
    const next = [...entries]
    if (v === 0) {
      if (next[selected] === 0) return
      next[selected] = 0
      setEntries(next)
      sfx('erase')
      return
    }
    if (next[selected] === v) return
    next[selected] = v
    setEntries(next)
    if (v !== game.solution[selected]) {
      setMistakes((m) => m + 1)
      sfx('wrong')
      return
    }
    sfx('set')
    if (next.every((x, i) => x === game.solution[i])) {
      const sc = Math.max(100, DIFFS[diffKey].base - seconds * 2 - mistakes * 100)
      setFinalScore(sc)
      submitBest(sc)
      save(sc, null)
      setStatus('won')
      sfx('win')
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (status !== 'playing') return
      if (/^[1-9]$/.test(e.key)) enter(Number(e.key))
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') enter(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-bound every render on purpose: enter() closes over current state

  const counts = useMemo(() => {
    const n = new Array(10).fill(0)
    if (entries && game) for (let i = 0; i < 81; i++) if (entries[i] !== 0 && entries[i] === game.solution[i]) n[entries[i]]++
    return n
  }, [entries, game])

  const selVal = selected >= 0 && entries ? entries[selected] : 0

  return (
    <GameFrame inner={520}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {Object.entries(DIFFS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => start(k)}
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={k === diffKey ? { background: '#065f46', color: '#fff' } : { background: '#fff', color: BODY, border: '1px solid rgba(20,83,45,0.15)' }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: mistakes ? '#dc2626' : INK }}>✗ {mistakes}</span>
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }}>⏱ {seconds}s</span>
            <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="relative">
          <div className="grid grid-cols-9 rounded-xl overflow-hidden" style={{ border: '2.5px solid #15281C', background: '#15281C', gap: 0 }}>
            {Array.from({ length: 81 }, (_, i) => {
              const r = rowOf(i), c = colOf(i)
              const v = value(i)
              const wrong = isWrong(i)
              const sameNum = selVal !== 0 && v === selVal
              const sameUnit = selected >= 0 && (rowOf(selected) === r || colOf(selected) === c || boxOf(selected) === boxOf(i))
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  className="aspect-square flex items-center justify-center font-display font-extrabold text-base sm:text-xl"
                  style={{
                    background: selected === i ? '#bbf7d0' : sameNum && v ? '#dcfce7' : sameUnit ? '#f4f9f4' : '#fff',
                    color: wrong ? '#dc2626' : isGiven(i) ? INK : '#0d7a51',
                    borderRight: c === 8 ? 'none' : c % 3 === 2 ? '2px solid #15281C' : '1px solid #d7e2d9',
                    borderBottom: r === 8 ? 'none' : r % 3 === 2 ? '2px solid #15281C' : '1px solid #d7e2d9',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  {v || ''}
                </button>
              )
            })}
          </div>

          {status !== 'playing' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              {status === 'idle' ? (
                <>
                  <div className="text-4xl mb-1">🔢</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Guac Sudoku</div>
                  <p className="text-sm mt-2 mb-1 max-w-sm" style={{ color: BODY }}>
                    Every row, column and 3×3 box needs the digits 1–9 exactly once.
                    Each puzzle is generated fresh with a single unique solution.
                  </p>
                  <p className="text-xs mb-4" style={{ color: MUTED }}>Tap a cell, then a number (keyboard works too). Wrong entries cost 100.</p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best solve: {fmt(best)}</div>}
                  <div className="flex gap-2">
                    {Object.entries(DIFFS).map(([k, v]) => (
                      <button key={k} onClick={() => start(k)} className="font-bold px-5 py-2.5 rounded-full text-white text-sm" style={{ background: k === 'easy' ? GREEN : k === 'medium' ? '#D9A514' : '#b91c1c' }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">🔢🎉</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Solved!</div>
                  <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(finalScore)}</div>
                  <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{DIFFS[diffKey].label} in {seconds}s, {mistakes} mistakes · best {fmt(best)}</div>
                  {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best!</div>}
                  <SaveScoreLine res={saveRes} />
                  <div className="mt-4"><PrimaryButton onClick={() => start()}>New puzzle</PrimaryButton></div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-10 gap-1.5 mt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const done = counts[n] >= 9
            return (
              <button
                key={n}
                type="button"
                onClick={() => enter(n)}
                disabled={done}
                className="aspect-square rounded-lg font-display font-extrabold text-lg"
                style={{
                  background: done ? '#eef2ee' : '#fff',
                  color: done ? '#c2ccc4' : INK,
                  border: '1px solid rgba(20,83,45,0.15)',
                  cursor: done ? 'default' : 'pointer',
                }}
              >
                {n}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => enter(0)}
            className="aspect-square rounded-lg font-bold text-base"
            style={{ background: '#fff', color: INK, border: '1px solid rgba(20,83,45,0.15)' }}
            aria-label="Erase"
          >
            ⌫
          </button>
        </div>

        <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
          Tap a cell, then a number · wrong entries flash red and cost 100 · faster solves score more.
        </p>
      </div>
    </GameFrame>
  )
}
