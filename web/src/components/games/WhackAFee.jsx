'use client'
// Whack-a-Fee — whack-a-mole with a money filter. Fees (💸 +25) and golden
// fees (🤑 +100, quick!) pop out of nine holes; hammer them flat. The piggy
// bank (🐷) is your savings — bonk it and you LOSE 100. 45 seconds, spawns
// speed up as the clock runs down. DOM holes inside the shared GameFrame.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-whack-best-v1'
const GAME_SECONDS = 45
const TYPES = {
  fee: { emoji: '💸', pts: 25 },
  gold: { emoji: '🤑', pts: 100 },
  piggy: { emoji: '🐷', pts: -100 },
}

export default function WhackAFee() {
  const [status, setStatus] = useState('idle')   // idle | playing | over
  const [holes, setHoles] = useState(Array(9).fill(null)) // {type, id, whacked}
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [popup, setPopup] = useState(null)       // {hole, txt, good}
  const statusRef = useRef('idle')
  const timersRef = useRef([])
  const startRef = useRef(0)
  const scoreRef = useRef(0)
  const idRef = useRef(1)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('whack')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const later = (fn, ms) => timersRef.current.push(setTimeout(fn, ms))
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }
  useEffect(() => clearTimers, [])

  const sfx = (name) => {
    switch (name) {
      case 'pop': tone({ f0: 320, f1: 430, t: 0.06, type: 'triangle', g: 0.06 }); break
      case 'bonk': tone({ f0: 200, f1: 90, t: 0.09, type: 'square', g: 0.15 }); break
      case 'gold': [780, 1040, 1300].forEach((f, i) => tone({ f0: f, t: 0.08, g: 0.12, at: i * 0.04 })); break
      case 'oops': [280, 180, 110].forEach((f, i) => tone({ f0: f, t: 0.16, type: 'sawtooth', g: 0.13, at: i * 0.08 })); break
      case 'end': [392, 494, 587, 784].forEach((f, i) => tone({ f0: f, t: 0.13, g: 0.14, at: i * 0.08 })); break
      default: break
    }
  }

  const elapsed = () => (performance.now() - startRef.current) / 1000

  const spawn = () => {
    if (statusRef.current !== 'playing') return
    const t = elapsed()
    if (t >= GAME_SECONDS) return
    setHoles((cur) => {
      const free = cur.map((h, i) => (h ? null : i)).filter((i) => i !== null)
      if (!free.length) return cur
      const hole = free[Math.floor(Math.random() * free.length)]
      const r = Math.random()
      const type = r < 0.68 ? 'fee' : r < 0.8 ? 'gold' : 'piggy'
      const id = idRef.current++
      const up = type === 'gold' ? 650 : Math.max(560, 950 - t * 9)
      later(() => {
        setHoles((c) => c.map((h, i) => (i === hole && h && h.id === id ? null : h)))
      }, up)
      const next = [...cur]
      next[hole] = { type, id, whacked: false }
      sfx('pop')
      return next
    })
    later(spawn, Math.max(380, 780 - elapsed() * 8))
  }

  const tick = () => {
    if (statusRef.current !== 'playing') return
    const left = Math.max(0, GAME_SECONDS - elapsed())
    setTimeLeft(Math.ceil(left))
    if (left <= 0) {
      clearTimers()
      setHoles(Array(9).fill(null))
      sfx('end')
      const sc = scoreRef.current
      submitBest(sc)
      save(sc, null)
      setPhase('over')
      return
    }
    later(tick, 250)
  }

  const start = () => {
    clearTimers()
    setHoles(Array(9).fill(null))
    scoreRef.current = 0
    setScore(0)
    setTimeLeft(GAME_SECONDS)
    setPopup(null)
    resetSave()
    startRef.current = performance.now()
    setPhase('playing')
    later(spawn, 500)
    later(tick, 250)
  }

  const whack = (i) => {
    if (statusRef.current !== 'playing') return
    const h = holes[i]
    if (!h || h.whacked) return
    const t = TYPES[h.type]
    scoreRef.current = Math.max(0, scoreRef.current + t.pts)
    setScore(scoreRef.current)
    setPopup({ hole: i, txt: t.pts > 0 ? `+${t.pts}` : `${t.pts}`, good: t.pts > 0 })
    later(() => setPopup((p) => (p && p.hole === i ? null : p)), 550)
    sfx(h.type === 'gold' ? 'gold' : h.type === 'piggy' ? 'oops' : 'bonk')
    setHoles((cur) => cur.map((x, j) => (j === i && x ? { ...x, whacked: true } : x)))
    later(() => setHoles((cur) => cur.map((x, j) => (j === i && x && x.whacked ? null : x))), 240)
  }

  return (
    <GameFrame inner={500}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: INK }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Time </span>
              <span className="font-display font-bold text-sm" style={{ color: timeLeft <= 10 ? '#dc2626' : INK }}>{timeLeft}s</span>
            </div>
          </div>
          <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Lawn */}
        <div className="relative">
          <div className="grid grid-cols-3 gap-4 rounded-3xl p-5" style={{ background: 'linear-gradient(180deg, #86c94f, #65A30D)' }}>
            {holes.map((h, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={() => whack(i)}
                className="relative aspect-square overflow-hidden"
                style={{ cursor: status === 'playing' ? 'pointer' : 'default', background: 'transparent' }}
                aria-label={`Hole ${i + 1}`}
              >
                {/* hole */}
                <span className="absolute left-1/2 bottom-2 -translate-x-1/2 rounded-[50%]" style={{ width: '84%', height: '34%', background: '#3b2a17', boxShadow: 'inset 0 6px 10px rgba(0,0,0,0.5)' }} />
                {/* mole */}
                {h && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 leading-none"
                    style={{
                      fontSize: 52,
                      bottom: h.whacked ? '-6%' : '22%',
                      transition: 'bottom .12s ease',
                      transform: h.whacked ? 'translateX(-50%) scaleY(0.5)' : 'translateX(-50%)',
                      filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.35))',
                    }}
                  >
                    {TYPES[h.type].emoji}
                  </span>
                )}
                {popup && popup.hole === i && (
                  <span className="absolute left-1/2 top-1 -translate-x-1/2 font-display font-extrabold text-lg" style={{ color: popup.good ? '#f0fdf4' : '#fecaca', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {popup.txt}
                  </span>
                )}
              </button>
            ))}
          </div>

          {status !== 'playing' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              {status === 'idle' ? (
                <>
                  <div className="text-4xl mb-1">🔨</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Whack-a-Fee</div>
                  <p className="text-sm mt-2 mb-1 max-w-sm" style={{ color: BODY }}>
                    Fees pop out of the lawn — hammer them! 💸 is +25, the golden 🤑 is +100 but ducks fast.
                  </p>
                  <p className="text-xs mb-4" style={{ color: MUTED }}>Never bonk the piggy bank 🐷 — that&apos;s your savings (−100).</p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best round: {fmt(best)}</div>}
                  <PrimaryButton onClick={start}>Grab the hammer</PrimaryButton>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">🔨🏁</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Time&apos;s up!</div>
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
          💸 +25 · 🤑 +100 (quick!) · 🐷 −100, leave the piggy alone · 45 seconds, spawns speed up.
        </p>
      </div>
    </GameFrame>
  )
}
