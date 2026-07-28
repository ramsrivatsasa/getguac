'use client'
// Reusable "financial journey" rounds layer for the Guac Arcade. Sits on top of
// arcadeKit: any relevant game plugs in a progression of educative money rounds
// (see lib/financialJourney.js) and interprets each round in its own mechanics.
//
//   useJourney(gameId, {count})  — tracks the current round + furthest reached,
//                                  persisted per game in localStorage.
//   useAdaptive(gameId)          — the auto-learning difficulty profile: reads
//                                  how the player actually performs and hands
//                                  the game back a difficulty multiplier.
//   <RoundIntro/>                — pre-round teaching card (lesson + goal + tip
//                                  + this round's twist + the adaptive read).
//   <RoundComplete/>             — celebrate a cleared round + tease the next.
//   <JourneyComplete/>           — finished the whole journey.
//   <JourneyBar/>                — slim goal-progress bar + stage pips.
//   <AdaptiveChip/>              — always-visible "the game is tuning itself".
//
// Round transition cards use a plain veil (NOT arcadeKit's Overlay) so we don't
// fire an ad break on every single round change — the game's own start / game-
// over overlays keep the ads.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { INK, BODY, MUTED, GREEN, CARD_BORDER, BODY_FONT } from './arcadeKit'
import { JOURNEY, JOURNEY_COUNT, roundAt } from '../../lib/financialJourney'
import {
  loadProfile, recordRound, recordRunStart, resetProfile, difficultyFor, explain, FRESH_PROFILE,
} from '../../lib/adaptiveDifficulty'

// ─── progression state ───────────────────────────────────────────────────────
// Tracks which round the player is on and the furthest round they've reached
// (persisted, so a game can offer "Continue from Round N" after a game over).
export function useJourney(gameId, { count = JOURNEY_COUNT } = {}) {
  // v2: the journey dropped the debt round, so every saved round index now
  // points at a different lesson. Bumping the key resets progress once rather
  // than resuming people mid-journey on the wrong round.
  const key = `gg-${gameId}-journey-v2`
  const [roundIdx, setRoundIdx] = useState(0)
  const [furthest, setFurthest] = useState(0)

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}')
      const f = Math.max(0, Math.min(count - 1, parseInt(raw.furthest, 10) || 0))
      if (f > 0) setFurthest(f)
    } catch {}
  }, [key, count])

  const bumpFurthest = useCallback((idx) => {
    setFurthest((f) => {
      const nf = Math.max(f, Math.min(count - 1, idx))
      if (nf !== f) { try { localStorage.setItem(key, JSON.stringify({ furthest: nf })) } catch {} }
      return nf
    })
  }, [key, count])

  // Any time the player moves to a higher round, remember it.
  useEffect(() => { bumpFurthest(roundIdx) }, [roundIdx, bumpFurthest])

  const startFrom = useCallback((idx) => setRoundIdx(Math.max(0, Math.min(count - 1, idx))), [count])
  const advance = useCallback(() => setRoundIdx((i) => Math.min(count - 1, i + 1)), [count])

  return {
    roundIdx, round: roundAt(roundIdx),
    furthest, count,
    isLast: roundIdx >= count - 1,
    setRoundIdx, startFrom, advance,
  }
}

// ─── auto-learning difficulty ────────────────────────────────────────────────
// Games call `record({cleared, seconds, par, livesLost, accuracy})` when a round
// ends; `diff` then carries the new multipliers for the NEXT round. `diffRef`
// is for canvas loops that can't read React state each frame.
export function useAdaptive(gameId) {
  const [profile, setProfile] = useState(FRESH_PROFILE)
  const diffRef = useRef(difficultyFor(FRESH_PROFILE))

  useEffect(() => {
    const p = loadProfile(gameId)
    setProfile(p)
    diffRef.current = difficultyFor(p)
  }, [gameId])

  const diff = useMemo(() => difficultyFor(profile), [profile])
  useEffect(() => { diffRef.current = diff }, [diff])

  const record = useCallback((result) => {
    const p = recordRound(gameId, result)
    setProfile(p)
    diffRef.current = difficultyFor(p)
    return p
  }, [gameId])

  const noteRun = useCallback(() => { setProfile(recordRunStart(gameId)) }, [gameId])
  const reset = useCallback(() => {
    const p = resetProfile(gameId)
    setProfile(p)
    diffRef.current = difficultyFor(p)
  }, [gameId])

  return { profile, diff, diffRef, record, noteRun, reset, note: explain(profile) }
}

// ─── shared card veil (no ad break) ──────────────────────────────────────────
function Veil({ children, maxWidth = 430 }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.66)', zIndex: 20 }}>
      <div className="rounded-2xl bg-white p-5 text-center w-full max-h-full overflow-y-auto" style={{ border: CARD_BORDER, maxWidth }}>
        {children}
      </div>
    </div>
  )
}

function RoundChip({ round, count = JOURNEY_COUNT, sub }) {
  // A standalone chapter (Debt Breaker's, which no longer sits in the numbered
  // journey) has no `n` — it gets its own title instead of "ROUND x OF y".
  const label = round.n ? `ROUND ${round.n} OF ${count}` : `${round.emoji} ${round.title.toUpperCase()}`
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-2"
      style={{ background: `${round.color}1a`, color: round.dark || round.color, fontFamily: BODY_FONT, letterSpacing: '0.04em' }}>
      {label}{sub ? ` · ${sub}` : ''}
    </div>
  )
}

// `goalText` lets a game whose goal isn't measured in dollars (floors stacked,
// semesters survived) phrase it in its own units instead of the money default.
function GoalBox({ round, target, goalText }) {
  return (
    <div className="rounded-xl px-4 py-3 mt-3 text-left flex items-start gap-2.5"
      style={{ background: `${round.color}12`, border: `1px solid ${round.color}33` }}>
      <span className="text-xl leading-none" aria-hidden>🎯</span>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: round.dark || round.color, fontFamily: BODY_FONT }}>Your goal</div>
        <div className="text-sm font-semibold" style={{ color: INK }}>{goalText || round.goal(target)}</div>
      </div>
    </div>
  )
}

function LessonTip({ round }) {
  return (
    <>
      <p className="text-sm mt-3" style={{ color: BODY }}>{round.lesson}</p>
      <div className="rounded-xl px-3.5 py-2.5 mt-3 text-left flex items-start gap-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <span aria-hidden>💡</span>
        <p className="text-[13px]" style={{ color: '#92400e' }}><b>Tip:</b> {round.tip}</p>
      </div>
    </>
  )
}

// What gets harder this round — the game-side escalation, stated plainly.
function TwistBox({ round, stages }) {
  if (!round.twist) return null
  return (
    <div className="rounded-xl px-3.5 py-2.5 mt-2 text-left flex items-start gap-2" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
      <span aria-hidden>🎮</span>
      <p className="text-[13px]" style={{ color: '#334155' }}>
        <b>New this round:</b> {round.twist}
        {stages > 1 && <span className="opacity-70"> · {stages} stages, each one tighter than the last.</span>}
      </p>
    </div>
  )
}

// ─── the auto-learning read-out ──────────────────────────────────────────────
// Small, honest, always visible when the game is adapting. `note` is the
// human sentence from lib/adaptiveDifficulty.
export function AdaptiveChip({ diff, note, compact = false }) {
  if (!diff) return null
  return (
    <div className={`rounded-xl text-left ${compact ? 'px-3 py-2 mt-2' : 'px-3.5 py-2.5 mt-2'}`}
      style={{ background: '#ecfeff', border: '1px solid #a5f3fc' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1" style={{ color: '#0e7490', fontFamily: BODY_FONT }}>
          <span aria-hidden>🧠</span> Auto-difficulty
        </span>
        <span className="text-[11px] font-bold" style={{ color: '#155e75' }}>{diff.emoji} {diff.tier}</span>
      </div>
      <div className="rounded-full overflow-hidden mt-1.5" style={{ height: 6, background: '#cffafe' }}>
        <div style={{ width: `${diff.pct}%`, height: '100%', background: 'linear-gradient(90deg,#22d3ee,#0891b2)', borderRadius: 999, transition: 'width .3s ease-out' }} />
      </div>
      {note && <p className="text-[12px] mt-1.5" style={{ color: '#155e75' }}>{note}</p>}
    </div>
  )
}

// Round-color primary button (matches the round's theme instead of always-green).
function RoundButton({ round, onClick, children }) {
  return (
    <button onClick={onClick} className="mt-4 text-sm font-bold px-6 py-2.5 rounded-full text-white"
      style={{ background: round.color }}>{children}</button>
  )
}

// ─── pre-round teaching card ─────────────────────────────────────────────────
export function RoundIntro({
  round, target, stage = 1, stages = round?.stages || 1,
  count = JOURNEY_COUNT, diff = null, note = '', goalText = '', onStart, cta = 'Start round',
}) {
  return (
    <Veil>
      <RoundChip round={round} count={count} sub={stages > 1 ? `${stages} stages` : ''} />
      <div className="text-5xl mb-1" aria-hidden>{round.emoji}</div>
      <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>{round.title}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: round.dark || round.color }}>{round.subtitle}</div>
      <LessonTip round={round} />
      <GoalBox round={round} target={target} goalText={goalText} />
      <TwistBox round={round} stages={stages} />
      <AdaptiveChip diff={diff} note={note} compact />
      <RoundButton round={round} onClick={onStart}>{cta} →</RoundButton>
    </Veil>
  )
}

// ─── cleared-round card ──────────────────────────────────────────────────────
export function RoundComplete({ round, next, banked, diff = null, note = '', onNext }) {
  return (
    <Veil>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-2"
        style={{ background: '#dcfce7', color: '#166534', fontFamily: BODY_FONT }}>✓ ROUND {round.n} CLEARED</div>
      <div className="text-5xl mb-1" aria-hidden>{round.emoji}</div>
      <div className="font-display font-extrabold text-xl" style={{ color: INK }}>{round.banner}</div>
      <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>${Number(banked).toLocaleString()}</div>
      <div className="text-[11px] font-semibold" style={{ color: MUTED }}>banked this run</div>
      <p className="text-[13px] mt-3" style={{ color: BODY }}>{round.lesson}</p>
      <AdaptiveChip diff={diff} note={note} compact />
      {next && (
        <div className="rounded-xl px-3.5 py-2.5 mt-3 flex items-center gap-2.5" style={{ background: `${next.color}12`, border: `1px solid ${next.color}33` }}>
          <span className="text-2xl leading-none" aria-hidden>{next.emoji}</span>
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: next.dark || next.color, fontFamily: BODY_FONT }}>Next up</div>
            <div className="text-sm font-bold" style={{ color: INK }}>{next.title}</div>
          </div>
        </div>
      )}
      <RoundButton round={next || round} onClick={onNext}>{next ? 'Next round →' : 'Finish →'}</RoundButton>
    </Veil>
  )
}

// ─── whole-journey done ──────────────────────────────────────────────────────
export function JourneyComplete({ banked, diff = null, onReplay }) {
  return (
    <Veil>
      <div className="text-5xl mb-1" aria-hidden>🏆</div>
      <div className="font-display font-extrabold text-2xl" style={{ color: INK }}>You walked the whole journey!</div>
      <p className="text-sm mt-2" style={{ color: BODY }}>
        Cut expenses, built savings, bought the car and the house, invested for retirement, funded an
        education, then bought back your time — the real order that gets people ahead with money.
      </p>
      <div className="font-display font-extrabold text-4xl mt-3" style={{ color: GREEN }}>${Number(banked).toLocaleString()}</div>
      <div className="text-[11px] font-semibold" style={{ color: MUTED }}>banked across all {JOURNEY_COUNT} rounds</div>
      {diff && (
        <div className="text-[12px] font-semibold mt-2" style={{ color: '#155e75' }}>
          {diff.emoji} You finished at <b>{diff.tier}</b> difficulty
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
        {JOURNEY.map((r) => (
          <span key={r.id} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${r.color}18`, color: r.dark || r.color }}>{r.emoji} {r.title}</span>
        ))}
      </div>
      <button onClick={onReplay} className="mt-4 text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Play the journey again</button>
    </Veil>
  )
}

// ─── single-chapter goal games ───────────────────────────────────────────────
// Debt Breaker, Nest Egg Climb, Dream House Stack and Tuition Invaders each own
// ONE chapter of the journey rather than the whole thing. They teach the same
// lesson in that slot, then point the player at what genuinely comes next.
const ROUND_GAME = {
  cut: { href: '/games/splurge', name: 'Splurge Slicer' },
  save: { href: '/games/budget', name: 'Block Drop' },
  car: { href: '/games/splurge', name: 'Splurge Slicer' },
  house: { href: '/games/house', name: 'Dream House Stack' },
  invest: { href: '/games/nestegg', name: 'Nest Egg Climb' },
  edu: { href: '/games/tuition', name: 'Tuition Invaders' },
  freedom: { href: '/games/splurge', name: 'Splurge Slicer' },
}

// Chapter cleared — celebrate, restate the lesson, then hand the player to the
// next step of the real journey (and the game that teaches it).
export function ChapterComplete({ round, banked, unit = '$', caption = 'banked this run', diff = null, note = '', onReplay, replayLabel = 'Play again' }) {
  // round.n is 1-based → JOURNEY[round.n] is the next one. A standalone chapter
  // (no `n`) isn't in the journey, so there's nothing to hand off to.
  const next = round.n ? JOURNEY[round.n] || null : null
  const game = next ? ROUND_GAME[next.id] : null
  return (
    <Veil>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-2"
        style={{ background: '#dcfce7', color: '#166534', fontFamily: BODY_FONT }}>
        {round.n ? `✓ CHAPTER ${round.n} OF ${JOURNEY_COUNT} CLEARED` : '✓ CHAPTER CLEARED'}</div>
      <div className="text-5xl mb-1" aria-hidden>{round.emoji}</div>
      <div className="font-display font-extrabold text-xl" style={{ color: INK }}>{round.banner}</div>
      <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>
        {unit === '$' ? `$${Number(banked).toLocaleString()}` : `${Number(banked).toLocaleString()}${unit}`}
      </div>
      <div className="text-[11px] font-semibold" style={{ color: MUTED }}>{caption}</div>
      <p className="text-[13px] mt-3" style={{ color: BODY }}>{round.lesson}</p>
      <AdaptiveChip diff={diff} note={note} compact />
      {next && (
        <div className="rounded-xl px-3.5 py-2.5 mt-3 flex items-center gap-2.5 text-left" style={{ background: `${next.color}12`, border: `1px solid ${next.color}33` }}>
          <span className="text-2xl leading-none" aria-hidden>{next.emoji}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: next.dark || next.color, fontFamily: BODY_FONT }}>Next in the journey</div>
            <div className="text-sm font-bold" style={{ color: INK }}>{next.title}</div>
            {game && <a href={game.href} className="text-[12px] font-bold underline" style={{ color: next.dark || next.color }}>Play {game.name} →</a>}
          </div>
        </div>
      )}
      <button onClick={onReplay} className="mt-4 text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: round.color }}>{replayLabel}</button>
    </Veil>
  )
}

// ─── in-play goal progress bar ───────────────────────────────────────────────
// Self-contained, absolutely positioned near the top of the play field (below
// the HUD score pill). pointer-events:none so canvas input still lands. Drop it
// into any game's arena alongside its <ArcadeHud/>. Stage pips show the
// sub-levels inside the round filling up as the goal bar climbs.
export function JourneyBar({ round, banked, target, stage = 1, stages = round?.stages || 1, top = 78, unit = '$' }) {
  const pct = target > 0 ? Math.max(0, Math.min(1, banked / target)) : 0
  const show = (v) => (unit === '$' ? `$${Number(v).toLocaleString()}` : `${Number(v).toLocaleString()}`)
  return (
    <div className="absolute left-1/2 -translate-x-1/2" style={{ top, width: 'min(90%, 440px)', pointerEvents: 'none', zIndex: 15 }}>
      <div className="flex items-center justify-between mb-1" style={{ fontFamily: BODY_FONT }}>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.92)', color: round.dark || round.color }}>
          <span aria-hidden>{round.emoji}</span> R{round.n} · {round.title}
        </span>
        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}>
          {show(banked)} / {show(target)}{unit === '$' ? '' : ` ${unit}`}
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 10, background: 'rgba(255,255,255,0.35)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: `linear-gradient(90deg, ${round.color}, ${round.dark || round.color})`, transition: 'width 0.25s ease-out', borderRadius: 999 }} />
      </div>
      {stages > 1 && (
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: stages }, (_, i) => (
            <span key={i} className="flex-1 rounded-full" style={{
              height: 3,
              background: i < stage ? round.color : 'rgba(255,255,255,0.3)',
              transition: 'background .25s ease-out',
            }} />
          ))}
          <span className="text-[10px] font-bold ml-1 px-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.35)', color: '#fff', fontFamily: BODY_FONT }}>
            STAGE {stage}/{stages}
          </span>
        </div>
      )}
    </div>
  )
}
