'use client'
// Guac Says — Simon with an avocado accent. Four pads light up in a sequence
// that grows by one each round; watch, then replay it. Playback gets faster
// as the sequence grows. One wrong pad ends the run. DOM pads inside the
// shared GameFrame; classic Simon tone frequencies.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GameFrame,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-simon-best-v1'
const PADS = [
  { id: 0, base: '#16a34a', lit: '#4ade80', f: 329.6, label: 'green', round: '24px 4px 4px 4px' },
  { id: 1, base: '#b91c1c', lit: '#f87171', f: 277.2, label: 'red', round: '4px 24px 4px 4px' },
  { id: 2, base: '#a16207', lit: '#facc15', f: 220.0, label: 'yellow', round: '4px 4px 4px 24px' },
  { id: 3, base: '#1d4ed8', lit: '#60a5fa', f: 164.8, label: 'blue', round: '4px 4px 24px 4px' },
]

export default function GuacSays() {
  const [status, setStatus] = useState('idle')   // idle | show | input | over
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [active, setActive] = useState(-1)
  const seqRef = useRef([])
  const idxRef = useRef(0)
  const timersRef = useRef([])
  const statusRef = useRef('idle')

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('simon')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }
  const later = (fn, ms) => { timersRef.current.push(setTimeout(fn, ms)) }
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = [] }
  useEffect(() => clearTimers, [])

  const padTone = (i, t = 0.28) => tone({ f0: PADS[i].f, t, type: 'triangle', g: 0.16 })
  const failTone = () => tone({ f0: 110, f1: 70, t: 0.6, type: 'sawtooth', g: 0.16 })

  const stepMs = () => Math.max(320, 750 - seqRef.current.length * 28)

  const playback = () => {
    setPhase('show')
    const ms = stepMs()
    seqRef.current.forEach((pad, i) => {
      later(() => { setActive(pad); padTone(pad) }, 500 + i * ms)
      later(() => setActive(-1), 500 + i * ms + ms * 0.6)
    })
    later(() => { idxRef.current = 0; setPhase('input') }, 500 + seqRef.current.length * ms)
  }

  const nextRound = () => {
    seqRef.current.push(Math.floor(Math.random() * 4))
    setRound(seqRef.current.length)
    playback()
  }

  const start = () => {
    clearTimers()
    seqRef.current = []
    idxRef.current = 0
    setScore(0)
    setRound(0)
    setActive(-1)
    resetSave()
    nextRound()
  }

  const press = (i) => {
    if (statusRef.current !== 'input') return
    setActive(i)
    later(() => setActive(-1), 200)
    if (seqRef.current[idxRef.current] === i) {
      padTone(i, 0.18)
      idxRef.current += 1
      if (idxRef.current >= seqRef.current.length) {
        const newScore = score + seqRef.current.length * 100
        setScore(newScore)
        setPhase('show')
        later(nextRound, 700)
      }
    } else {
      failTone()
      const finalRound = seqRef.current.length
      submitBest(score)
      save(score, finalRound)
      setPhase('over')
    }
  }

  return (
    <GameFrame inner={440}>
      <div className="mx-auto select-none">
        {/* HUD */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: INK }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Round </span>
              <span className="font-display font-bold text-sm" style={{ color: INK }}>{round}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: status === 'input' ? '#065f46' : MUTED }}>
              {status === 'show' ? '👀 Watch…' : status === 'input' ? '🎯 Your turn' : ' '}
            </span>
            <button type="button" onClick={toggleMute} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white" style={{ border: '1px solid rgba(20,83,45,0.15)', color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* Pads */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-3 rounded-3xl p-4" style={{ background: '#15281C' }}>
            {PADS.map((p) => (
              <button
                key={p.id}
                type="button"
                onPointerDown={() => press(p.id)}
                className="aspect-square"
                style={{
                  background: active === p.id ? p.lit : p.base,
                  borderRadius: p.round,
                  boxShadow: active === p.id ? `0 0 34px ${p.lit}` : 'inset 0 -5px 0 rgba(0,0,0,0.3)',
                  transform: active === p.id ? 'scale(0.985)' : 'none',
                  transition: 'background .08s, box-shadow .08s',
                  cursor: status === 'input' ? 'pointer' : 'default',
                }}
                aria-label={`${p.label} pad`}
              />
            ))}
            {/* center hub */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center" style={{ width: 110, height: 110, background: '#15281C', border: '5px solid #0c1a11' }}>
              <span style={{ fontSize: 34 }}>🥑</span>
              <span className="text-[10px] font-extrabold tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>ROUND {round}</span>
            </div>
          </div>

          {(status === 'idle' || status === 'over') && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl text-center px-6" style={{ background: 'rgba(255,255,255,0.94)' }}>
              {status === 'idle' ? (
                <>
                  <div className="text-4xl mb-1">🚦</div>
                  <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>Guac Says</div>
                  <p className="text-sm mt-2 mb-4 max-w-sm" style={{ color: BODY }}>
                    Watch the pads light up, then replay the sequence. Every round adds one more step — and the playback keeps getting faster.
                  </p>
                  {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best score: {fmt(best)}</div>}
                  <PrimaryButton onClick={start}>Start</PrimaryButton>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1">🚦💥</div>
                  <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Wrong pad!</div>
                  <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
                  <div className="text-[11px] font-semibold" style={{ color: MUTED }}>fell on round {round} · best {fmt(best)}</div>
                  {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best! 🥑</div>}
                  <SaveScoreLine res={saveRes} />
                  <div className="mt-4"><PrimaryButton onClick={start}>Play again</PrimaryButton></div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-4 mb-2" style={{ color: FAINT }}>
          Each completed round pays 100 × its length · playback speeds up as the sequence grows.
        </p>
      </div>
    </GameFrame>
  )
}
