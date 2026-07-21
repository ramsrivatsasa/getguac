// Auto-learning difficulty for the Guac Arcade.
//
// Every game that plugs into the financial-journey rounds reports how each
// round actually went — did you clear it, how fast, how many avocados did it
// cost, how clean were your inputs. That folds into a persistent per-game
// SKILL estimate (0..1), and the skill estimate drives how hard the next round
// is: spawn rates, speeds, hazard counts, and a mild nudge to the dollar goal.
//
// So the game keeps meeting you where you are. Crush a round and it tightens
// up; struggle and it backs off — instead of every player hitting the same
// wall at the same place.
//
// Deliberately simple + explainable: one exponential moving average, no
// black box. `explain()` returns the sentence we show the player, because a
// difficulty system that moves under you without saying so just feels unfair.
//
// Pure data + localStorage, no React — canvas games, the hook in journeyKit,
// and any future story game all share it.

const KEY = (gameId) => `gg-${gameId}-skill-v1`

export const FRESH_PROFILE = {
  skill: 0.42,   // start a touch below the middle: first-timers get a fair ramp
  rounds: 0,     // rounds recorded (clears + fails)
  clears: 0,
  fails: 0,
  runs: 0,
  lastPerf: null,
  lastDelta: 0,
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)

export function loadProfile(gameId) {
  if (typeof window === 'undefined') return { ...FRESH_PROFILE }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(gameId)) || 'null')
    if (!raw || typeof raw !== 'object') return { ...FRESH_PROFILE }
    return {
      ...FRESH_PROFILE,
      ...raw,
      skill: clamp(num(raw.skill, FRESH_PROFILE.skill), 0, 1),
      rounds: Math.max(0, Math.round(num(raw.rounds))),
      clears: Math.max(0, Math.round(num(raw.clears))),
      fails: Math.max(0, Math.round(num(raw.fails))),
      runs: Math.max(0, Math.round(num(raw.runs))),
    }
  } catch {
    return { ...FRESH_PROFILE }
  }
}

export function saveProfile(gameId, profile) {
  if (typeof window === 'undefined') return profile
  try { localStorage.setItem(KEY(gameId), JSON.stringify(profile)) } catch {}
  return profile
}

export function resetProfile(gameId) {
  const p = { ...FRESH_PROFILE }
  saveProfile(gameId, p)
  return p
}

// How well did that round go, 0..1?
//   cleared    — did they hit the round goal
//   seconds    — how long it took
//   par        — how long we EXPECT that round to take (per game, per round)
//   livesLost  — avocados spent getting there
//   accuracy   — optional 0..1 (hit rate, clean-slice rate, …) if the game has one
export function scoreRound({ cleared, seconds = 0, par = 60, livesLost = 0, accuracy = null }) {
  let perf = cleared ? 0.66 : 0.2
  // Beating par is worth up to +0.25; crawling past it costs up to −0.2.
  if (cleared && seconds > 0 && par > 0) {
    perf += clamp((par - seconds) / par, -0.2, 0.25)
  } else if (!cleared && seconds > 0 && par > 0) {
    // Died early = struggling more than dying near the finish.
    perf += clamp((seconds / par) * 0.18, 0, 0.18)
  }
  perf -= clamp(num(livesLost) * 0.08, 0, 0.26)
  if (accuracy != null && Number.isFinite(Number(accuracy))) {
    perf = perf * 0.75 + clamp(Number(accuracy), 0, 1) * 0.25
  }
  return clamp(perf, 0, 1)
}

// Fold one round's result into the profile. Returns the NEW profile (already
// persisted). Learns fast from the first few rounds, then settles down so one
// unlucky round doesn't undo everything.
export function recordRound(gameId, result) {
  const prev = loadProfile(gameId)
  const perf = scoreRound(result)
  const alpha = clamp(0.5 - prev.rounds * 0.03, 0.18, 0.5)
  const skill = clamp(prev.skill + (perf - prev.skill) * alpha, 0, 1)
  const next = {
    ...prev,
    skill,
    rounds: prev.rounds + 1,
    clears: prev.clears + (result?.cleared ? 1 : 0),
    fails: prev.fails + (result?.cleared ? 0 : 1),
    lastPerf: perf,
    lastDelta: skill - prev.skill,
  }
  return saveProfile(gameId, next)
}

export function recordRunStart(gameId) {
  const p = loadProfile(gameId)
  return saveProfile(gameId, { ...p, runs: p.runs + 1 })
}

const TIERS = [
  { at: 0.00, label: 'Warming up', emoji: '🌱' },
  { at: 0.35, label: 'Finding your rhythm', emoji: '🎯' },
  { at: 0.55, label: 'Dialed in', emoji: '⚡' },
  { at: 0.72, label: 'Sharp', emoji: '🔥' },
  { at: 0.87, label: 'Ruthless', emoji: '💀' },
]

// Turn the skill estimate into the knobs a game actually uses.
//   mul       — multiply spawn rate / speed / hazard pressure (0.72 … 1.58)
//   targetMul — nudge the round's dollar goal (0.85 … 1.15)
//   hazards   — extra simultaneous hazards a game may add (0 … 2)
export function difficultyFor(profile) {
  const skill = clamp(num(profile?.skill, FRESH_PROFILE.skill), 0, 1)
  let tier = TIERS[0]
  for (const t of TIERS) if (skill >= t.at) tier = t
  return {
    skill,
    mul: 0.72 + skill * 0.86,
    targetMul: 0.85 + skill * 0.3,
    hazards: skill >= 0.87 ? 2 : skill >= 0.66 ? 1 : 0,
    tier: tier.label,
    emoji: tier.emoji,
    // 0..100 for a progress meter
    pct: Math.round(skill * 100),
  }
}

// The one-liner we show the player so the adjustment is never invisible.
export function explain(profile) {
  const p = profile || FRESH_PROFILE
  if (!p.rounds) return "This game learns how you play and tunes itself to you as you go."
  const d = num(p.lastDelta)
  if (d > 0.045) return "You made that look easy — turning the pace up for you."
  if (d > 0.012) return "Nicely done. Nudging the difficulty up a notch."
  if (d < -0.045) return "That one bit back. Easing off so you can find your footing."
  if (d < -0.012) return "Backing the pressure off slightly this round."
  return "Difficulty is tuned to how you have been playing."
}
