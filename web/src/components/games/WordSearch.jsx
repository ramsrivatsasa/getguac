'use client'
// Money Word Search — ten money words hide in a 10×10 letter grid, any of the
// eight directions, forwards or backwards. Drag (or click-drag) across letters
// to select a straight line; found words lock in with their own color. Clear
// the list for a time bonus. DOM grid inside the shared GameFrame.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-wordsearch-best-v1'
const SIZE = 10
const WORDS_PER_GAME = 10
const POOL = [
  'BUDGET', 'COUPON', 'REFUND', 'RECEIPT', 'SAVINGS', 'INVEST', 'WALLET', 'CREDIT',
  'INCOME', 'TAXES', 'STASH', 'SMASH', 'GUAC', 'DEALS', 'BONUS', 'PROFIT',
  'MARKET', 'SPEND', 'PRICE', 'REWARD', 'STOCKS', 'CASH',
]
const FOUND_COLORS = ['#bbf7d0', '#bfdbfe', '#fde68a', '#fbcfe8', '#ddd6fe', '#a5f3fc', '#fed7aa', '#d9f99d', '#e9d5ff', '#bae6fd']
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]

function buildPuzzle() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const words = [...POOL].sort(() => Math.random() - 0.5).slice(0, WORDS_PER_GAME)
    const grid = Array.from({ length: SIZE }, () => new Array(SIZE).fill(''))
    let ok = true
    for (const word of words) {
      let placed = false
      for (let tries = 0; tries < 220 && !placed; tries++) {
        const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)]
        const r0 = Math.floor(Math.random() * SIZE)
        const c0 = Math.floor(Math.random() * SIZE)
        const rEnd = r0 + dr * (word.length - 1), cEnd = c0 + dc * (word.length - 1)
        if (rEnd < 0 || rEnd >= SIZE || cEnd < 0 || cEnd >= SIZE) continue
        let fits = true
        for (let i = 0; i < word.length; i++) {
          const ch = grid[r0 + dr * i][c0 + dc * i]
          if (ch && ch !== word[i]) { fits = false; break }
        }
        if (!fits) continue
        for (let i = 0; i < word.length; i++) grid[r0 + dr * i][c0 + dc * i] = word[i]
        placed = true
      }
      if (!placed) { ok = false; break }
    }
    if (!ok) continue
    const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) grid[r][c] = AZ[Math.floor(Math.random() * 26)]
    }
    return { grid, words }
  }
  return null // practically unreachable
}

// straight-line cells from a drag, snapped to the nearest of 8 directions
function lineCells(start, end) {
  const dR = end.r - start.r, dC = end.c - start.c
  if (dR === 0 && dC === 0) return [start]
  const len = Math.max(Math.abs(dR), Math.abs(dC))
  const ang = Math.atan2(dR, dC)
  const oct = Math.round(ang / (Math.PI / 4))
  const dr = [0, 1, 1, 1, 0, -1, -1, -1][((oct % 8) + 8) % 8]
  const dc = [1, 1, 0, -1, -1, -1, 0, 1][((oct % 8) + 8) % 8]
  const cells = []
  for (let i = 0; i <= len; i++) {
    const r = start.r + dr * i, c = start.c + dc * i
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) break
    cells.push({ r, c })
  }
  return cells
}

export default function WordSearch() {
  const [puzzle, setPuzzle] = useState(null)     // {grid, words}
  const [status, setStatus] = useState('idle')   // idle | playing | won
  const [foundMap, setFoundMap] = useState({})   // "r,c" -> color
  const [foundWords, setFoundWords] = useState([])
  const [sel, setSel] = useState(null)           // {start, end}
  const [seconds, setSeconds] = useState(0)
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const gridRef = useRef(null)
  const selRef = useRef(null)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('wordsearch')

  const sfx = (name) => {
    switch (name) {
      case 'pick': tone({ f0: 420, f1: 470, t: 0.03, type: 'triangle', g: 0.04 }); break
      case 'found': [660, 880, 1100].forEach((f, i) => tone({ f0: f, t: 0.08, g: 0.12, at: i * 0.05 })); break
      case 'nope': tone({ f0: 200, f1: 150, t: 0.08, type: 'sawtooth', g: 0.06 }); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.08 })); break
      default: break
    }
  }

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const start = () => {
    setPuzzle(buildPuzzle())
    setFoundMap({})
    setFoundWords([])
    setSel(null)
    setSeconds(0)
    setScore(0)
    resetSave()
    setStatus('playing')
  }

  const cellAt = (clientX, clientY) => {
    const el = gridRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const c = Math.floor(((clientX - rect.left) / rect.width) * SIZE)
    const r = Math.floor(((clientY - rect.top) / rect.height) * SIZE)
    if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return null
    return { r, c }
  }

  const onDown = (e) => {
    if (status !== 'playing') return
    e.preventDefault()
    const cell = cellAt(e.clientX, e.clientY)
    if (!cell) return
    const s = { start: cell, end: cell }
    selRef.current = s
    setSel(s)
    sfx('pick')
    gridRef.current.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!selRef.current) return
    const cell = cellAt(e.clientX, e.clientY)
    if (!cell) return
    const prev = selRef.current
    if (cell.r === prev.end.r && cell.c === prev.end.c) return
    const s = { ...prev, end: cell }
    selRef.current = s
    setSel(s)
  }
  const onUp = () => {
    const s = selRef.current
    selRef.current = null
    if (!s || !puzzle) { setSel(null); return }
    const cells = lineCells(s.start, s.end)
    const str = cells.map(({ r, c }) => puzzle.grid[r][c]).join('')
    const rev = [...str].reverse().join('')
    const hit = puzzle.words.find((w) => !foundWords.includes(w) && (w === str || w === rev))
    if (hit) {
      const color = FOUND_COLORS[foundWords.length % FOUND_COLORS.length]
      const nextMap = { ...foundMap }
      for (const { r, c } of cells) nextMap[`${r},${c}`] = color
      const nextWords = [...foundWords, hit]
      const pts = hit.length * 20
      const newScore = score + pts
      setFoundMap(nextMap)
      setFoundWords(nextWords)
      setScore(newScore)
      sfx('found')
      if (nextWords.length === puzzle.words.length) {
        const bonus = Math.max(0, 600 - seconds * 2)
        const sc = newScore + bonus
        setFinalScore(sc)
        submitBest(sc)
        save(sc, null)
        setStatus('won')
        sfx('win')
      }
    } else if (cells.length > 1) {
      sfx('nope')
    }
    setSel(null)
  }

  const selSet = new Set(sel ? lineCells(sel.start, sel.end).map(({ r, c }) => `${r},${c}`) : [])

  return (
    <GameFrame inner={560}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: INK }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Found </span>
              <span className="font-display font-bold text-sm" style={{ color: INK }}>{foundWords.length}/{puzzle ? puzzle.words.length : WORDS_PER_GAME}</span>
            </div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>⏱ {seconds}s</div>
          </div>
          <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Grid */}
        <div className="relative">
          <div
            ref={gridRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="grid rounded-2xl overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gap: 2, background: '#cfe0d2', padding: 4, border: '1px solid rgba(20,83,45,0.12)', touchAction: 'none' }}
          >
            {(puzzle ? puzzle.grid : Array.from({ length: SIZE }, () => new Array(SIZE).fill(''))).flatMap((row, r) =>
              row.map((ch, c) => {
                const key = `${r},${c}`
                const found = foundMap[key]
                const inSel = selSet.has(key)
                return (
                  <div
                    key={key}
                    className="aspect-square flex items-center justify-center font-display font-extrabold text-sm sm:text-base rounded-[5px]"
                    style={{
                      background: inSel ? '#065f46' : found || '#fff',
                      color: inSel ? '#fff' : INK,
                      transition: 'background .08s',
                    }}
                  >
                    {ch}
                  </div>
                )
              })
            )}
          </div>

          {status !== 'playing' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              {status === 'idle' ? (
                <>
                  <div className="text-4xl mb-1">🔎</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Money Word Search</div>
                  <p className="text-sm mt-2 mb-4 max-w-sm" style={{ color: BODY }}>
                    Ten money words hide in the grid — across, down, diagonal, even backwards.
                    Drag across the letters to select a word.
                  </p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best puzzle: {fmt(best)}</div>}
                  <PrimaryButton onClick={start}>Start searching</PrimaryButton>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">🔎🎉</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>All words found!</div>
                  <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(finalScore)}</div>
                  <div className="text-[11px] font-semibold" style={{ color: MUTED }}>in {seconds}s · best {fmt(best)}</div>
                  {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best! 🥑</div>}
                  <SaveScoreLine res={saveRes} />
                  <div className="mt-4"><PrimaryButton onClick={start}>New puzzle</PrimaryButton></div>
                </>
              )}
            </div>
          )}
        </div>

        {/* word list */}
        {puzzle && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {puzzle.words.map((w) => {
              const done = foundWords.includes(w)
              return (
                <span
                  key={w}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={done
                    ? { background: '#f2fbf3', color: '#9aa89e', textDecoration: 'line-through', border: '1px solid rgba(20,83,45,0.08)' }
                    : { background: '#fff', color: INK, border: '1px solid rgba(20,83,45,0.15)' }}
                >
                  {w}
                </span>
              )
            })}
          </div>
        )}

        <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
          Words run in all 8 directions · each word pays 20 × its length · finish fast for up to +600.
        </p>
      </div>
    </GameFrame>
  )
}
