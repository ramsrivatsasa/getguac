'use client'
// Money Match — the classic memory pairs game with a money deck. Flip two
// cards; a match stays face up. Clear the board in as few moves (and seconds)
// as you can. 4×4 and 6×6 boards. DOM cards with a CSS 3D flip, inside the
// shared GameFrame.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-pairs-best-v1'
const EMOJI = ['🥑', '💵', '🪙', '💳', '🏦', '🧾', '💰', '🛒', '📈', '💎', '🐷', '⏰', '🎟️', '🛍️', '💸', '🧮', '🏷️', '🎁']
const MODES = {
  easy: { label: '4×4', side: 4, base: 1500, floor: 100 },
  hard: { label: '6×6', side: 6, base: 4000, floor: 200 },
}

const dealCards = (side) => {
  const pairs = (side * side) / 2
  const pool = [...EMOJI].sort(() => Math.random() - 0.5).slice(0, pairs)
  return [...pool, ...pool]
    .sort(() => Math.random() - 0.5)
    .map((e, i) => ({ id: i, emoji: e, state: 'down' }))   // down | up | matched
}

export default function MoneyMatch() {
  const [modeKey, setModeKey] = useState('easy')
  const [cards, setCards] = useState(null)
  const [status, setStatus] = useState('idle')   // idle | playing | won
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const lockRef = useRef(false)
  const upRef = useRef([])

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('pairs')

  const mode = MODES[modeKey]

  const sfx = (name) => {
    switch (name) {
      case 'flip': tone({ f0: 440, f1: 560, t: 0.06, type: 'triangle', g: 0.07 }); break
      case 'match': [660, 880].forEach((f, i) => tone({ f0: f, t: 0.1, g: 0.12, at: i * 0.06 })); break
      case 'nomatch': tone({ f0: 240, f1: 170, t: 0.14, type: 'sawtooth', g: 0.07 }); break
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.08 })); break
      default: break
    }
  }

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const start = (key = modeKey) => {
    setModeKey(key)
    setCards(dealCards(MODES[key].side))
    setMoves(0)
    setSeconds(0)
    upRef.current = []
    lockRef.current = false
    resetSave()
    setStatus('playing')
  }

  const flip = (idx) => {
    if (status !== 'playing' || lockRef.current) return
    const c = cards[idx]
    if (c.state !== 'down') return
    sfx('flip')
    const next = cards.map((x, i) => (i === idx ? { ...x, state: 'up' } : x))
    upRef.current = [...upRef.current, idx]
    setCards(next)
    if (upRef.current.length === 2) {
      lockRef.current = true
      const [a, b] = upRef.current
      const isMatch = next[a].emoji === next[b].emoji
      const newMoves = moves + 1
      setMoves(newMoves)
      setTimeout(() => {
        setCards((cur) => {
          const after = cur.map((x, i) =>
            i === a || i === b ? { ...x, state: isMatch ? 'matched' : 'down' } : x
          )
          if (isMatch && after.every((x) => x.state === 'matched')) {
            const sc = Math.max(mode.floor, mode.base - newMoves * (modeKey === 'easy' ? 25 : 30) - seconds * 5)
            setFinalScore(sc)
            submitBest(sc)
            save(sc, null)
            setStatus('won')
            sfx('win')
          } else {
            sfx(isMatch ? 'match' : 'nomatch')
          }
          return after
        })
        upRef.current = []
        lockRef.current = false
      }, isMatch ? 350 : 750)
    }
  }

  const side = mode.side
  return (
    <GameFrame inner={side === 4 ? 460 : 560}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {Object.entries(MODES).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => start(k)}
                className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={k === modeKey ? { background: '#065f46', color: '#fff' } : { background: '#fff', color: BODY, border: '1px solid rgba(20,83,45,0.15)' }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }}>🎯 {moves} moves</span>
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }}>⏱ {seconds}s</span>
            <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="relative">
          {/* deterministic placeholder before the first deal — dealCards is
              random and would mismatch the server-rendered HTML on hydration */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${side}, 1fr)`, gap: side === 4 ? 10 : 7 }}>
            {(cards || Array.from({ length: side * side }, (_, i) => ({ id: i, emoji: '🥑', state: 'down' }))).map((c, i) => {
              const faceUp = c.state !== 'down'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => flip(i)}
                  className="relative aspect-square rounded-xl"
                  style={{ perspective: 600, background: 'transparent', cursor: status === 'playing' && c.state === 'down' ? 'pointer' : 'default' }}
                >
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: 'transform .3s ease',
                      transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* back */}
                    <span
                      className="absolute inset-0 rounded-xl flex items-center justify-center text-lg"
                      style={{
                        backfaceVisibility: 'hidden',
                        background: 'linear-gradient(145deg, #16a34a, #065f46)',
                        border: '1px solid rgba(6,60,40,0.5)',
                        color: 'rgba(255,255,255,0.5)',
                        boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)',
                      }}
                    >
                      🥑
                    </span>
                    {/* face */}
                    <span
                      className="absolute inset-0 rounded-xl flex items-center justify-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: c.state === 'matched' ? '#f2fbf3' : '#fff',
                        border: c.state === 'matched' ? '1.5px solid rgba(101,163,13,0.6)' : '1px solid rgba(20,83,45,0.2)',
                        fontSize: side === 4 ? 38 : 26,
                        opacity: c.state === 'matched' ? 0.85 : 1,
                      }}
                    >
                      {c.emoji}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {status !== 'playing' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              {status === 'idle' && (
                <>
                  <div className="text-4xl mb-1">🎴</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Money Match</div>
                  <p className="text-sm mt-2 mb-4 max-w-sm" style={{ color: BODY }}>
                    Flip two cards — a match stays up. Clear the whole board in as few moves and seconds as you can.
                  </p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best game: {fmt(best)}</div>}
                  <div className="flex gap-2">
                    <PrimaryButton onClick={() => start('easy')}>4×4</PrimaryButton>
                    <button onClick={() => start('hard')} className="font-bold px-6 py-2.5 rounded-full text-white text-sm" style={{ background: '#D9A514' }}>6×6</button>
                  </div>
                </>
              )}
              {status === 'won' && (
                <>
                  <div className="text-3xl mb-1">🧠✨</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>All matched!</div>
                  <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(finalScore)}</div>
                  <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{moves} moves in {seconds}s · best {fmt(best)}</div>
                  {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best! 🥑</div>}
                  <SaveScoreLine res={saveRes} />
                  <div className="mt-4"><PrimaryButton onClick={() => start()}>Play again</PrimaryButton></div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
          Fewer moves and faster clears score higher · 6×6 is worth much more than 4×4.
        </p>
      </div>
    </GameFrame>
  )
}
