// The GetGuac "financial journey" — the shared, educative round curriculum that
// relevant arcade games progress through. This is the ONE place the money
// lessons live; games import JOURNEY and interpret each round in their own
// mechanics ("as per the game"). Framework-agnostic: pure data + helpers, no
// React, so both canvas games and any future story/strategy game can reuse it.
//
// Round order is the real personal-finance "order of operations": free up cash
// first, build a cushion, then the bigger goals, and only then the long-horizon
// compounding ones. (Debt is intentionally NOT a round — see DEBT_CHAPTER
// below, which Debt Breaker owns on its own.) Lessons are genuine,
// widely-accepted principles — NOT invented outcome stats. In-game dollar
// targets are GAME-ONLY goals; a game never claims them as real savings.
//
// Each round carries three knobs games use to escalate:
//   stages — sub-levels inside the round; a game steps difficulty at each one
//   heat   — 1..8 overall intensity, the game maps it to speed/spawns/hazards
//   twist  — the ONE new complication this round introduces (shown to players)

export const JOURNEY = [
  {
    id: 'cut', n: 1, title: 'Cut your expenses', emoji: '✂️',
    color: '#F97316', dark: '#9A3412',
    // one-line "what this round is about"
    subtitle: 'Free up cash before anything else.',
    lesson: "You can't out-earn runaway spending. The fastest raise you'll ever get is cutting the wants you won't even miss.",
    tip: 'Cancel one subscription you forgot you had — that alone can be ~$120 a year back in your pocket.',
    // how a game phrases the goal, filled with the round's $target
    goal: (t) => `Free up $${t.toLocaleString()} by cutting the splurges.`,
    banner: 'Expenses cut!',
    stages: 2, heat: 1,
    twist: 'Learn the controls — the pace steps up once you find your rhythm.',
  },
  {
    id: 'save', n: 2, title: 'Build your savings', emoji: '🐷',
    color: '#0EA5E9', dark: '#075985',
    subtitle: 'A cushion for the surprises.',
    lesson: 'A starter emergency fund (around $1,000) keeps a flat tire or a surprise bill from turning back into new debt. Build it before you chase bigger goals.',
    tip: 'Automate a small transfer on payday — pay yourself first, before the money can be spent.',
    goal: (t) => `Stash $${t.toLocaleString()} into your emergency fund.`,
    banner: 'Safety net set!',
    stages: 3, heat: 3,
    twist: 'Surprise bills show up unannounced — that is exactly what the fund is for.',
  },
  {
    id: 'car', n: 3, title: 'Save for a car', emoji: '🚗',
    color: '#8B5CF6', dark: '#5B21B6',
    subtitle: 'A goal you can save toward.',
    lesson: 'Save the down payment instead of financing the whole thing. A bigger down payment means a smaller loan and far less interest over its life.',
    tip: 'A 2–3 year-old used car skips the steepest depreciation a new one takes the moment it leaves the lot.',
    goal: (t) => `Save $${t.toLocaleString()} toward the car.`,
    banner: 'Keys earned!',
    stages: 3, heat: 4,
    twist: 'Bigger money moves faster — everything on screen picks up speed.',
  },
  {
    id: 'house', n: 4, title: 'Buy a house', emoji: '🏡',
    color: '#16A34A', dark: '#166534',
    subtitle: 'The long game.',
    lesson: 'Aim for 20% down to skip PMI, and keep the payment near a third of your take-home so the house never owns you.',
    tip: 'Budget for three things, not one: the down payment, the closing costs, and a cushion for what moving in always throws at you.',
    goal: (t) => `Save $${t.toLocaleString()} toward the down payment.`,
    banner: 'Home sweet home!',
    stages: 3, heat: 5,
    twist: 'Closing costs sneak in — more essentials to protect, less room for error.',
  },
  {
    id: 'invest', n: 5, title: 'Invest for retirement', emoji: '📈',
    color: '#0D9488', dark: '#115E59',
    subtitle: 'Let time do the heavy lifting.',
    lesson: 'Money invested early compounds on itself — the same dollar put in at 25 does far more work than one put in at 45. If your employer matches contributions, that match is part of your pay.',
    tip: 'Contribute at least enough to get the full employer match before anything fancier. Turning it down is leaving pay on the table.',
    goal: (t) => `Grow $${t.toLocaleString()} into the retirement pot.`,
    banner: 'Compounding kicked in!',
    stages: 4, heat: 6,
    twist: 'The market swings — your run rate speeds up and slows down without warning.',
  },
  {
    id: 'edu', n: 6, title: 'Fund an education', emoji: '🎓',
    color: '#4F46E5', dark: '#3730A3',
    subtitle: 'Oxygen mask on yourself first.',
    lesson: 'Fund college AFTER your own retirement, not before it. There are loans and scholarships for school; there are none for retirement.',
    tip: 'A dedicated education account (like a 529) grows tax-free for qualified costs — but only fill it once your own retirement is on track.',
    goal: (t) => `Bank $${t.toLocaleString()} for the tuition fund.`,
    banner: 'Tuition covered!',
    stages: 4, heat: 7,
    twist: 'Everything at once — every hazard you have met so far is on the board.',
  },
  {
    id: 'freedom', n: 7, title: 'Reach financial freedom', emoji: '🌴',
    color: '#B45309', dark: '#78350F',
    subtitle: 'When work becomes optional.',
    lesson: 'A common yardstick: once invested assets reach roughly 25× your yearly spending, withdrawing about 4% a year has historically been survivable. Note the lever — spending less lowers the finish line as much as saving more raises it.',
    tip: 'Cutting your annual spending by $1 lowers your target by about $25. Frugality and income are the same lever from two ends.',
    goal: (t) => `Reach $${t.toLocaleString()} and buy back your time.`,
    banner: 'Work is optional!',
    stages: 4, heat: 8,
    twist: 'The victory lap — maximum pace, maximum payout, no mercy.',
  },
]

export const JOURNEY_COUNT = JOURNEY.length

// Debt is NO LONGER a round of the shared journey — the arcade doesn't put
// players through a debt chapter on the way to the other goals. Debt Breaker
// is the one game still built around the lesson, so the chapter def lives here
// as a standalone (same shape as a round, no `n` — it isn't "chapter X of Y"
// any more) rather than inside JOURNEY, where every journey game would pick it
// up again.
export const DEBT_CHAPTER = {
  id: 'debt', title: 'Get debt-free', emoji: '🧱',
  color: '#E11D48', dark: '#9F1239',
  subtitle: 'Kill the highest interest first.',
  lesson: 'High-interest debt grows faster than almost any savings account. Throw every freed-up dollar at the worst APR first (the "avalanche"), then roll it to the next.',
  tip: 'List your debts by interest rate, not balance. The top of that list is costing you the most.',
  goal: (t) => `Throw $${t.toLocaleString()} at your debt to clear it.`,
  banner: 'Debt crushed!',
  stages: 2, heat: 2,
  twist: 'Interest bites back — the board pushes harder the longer you take.',
}

// A round def by index, clamped so callers can't fall off the end.
export const roundAt = (i) => JOURNEY[Math.max(0, Math.min(JOURNEY.length - 1, i))]

// A round def by its stable id — used by the single-chapter goal games
// (Nest Egg Climb → 'save', Dream House Stack → 'house', Tuition Invaders →
// 'edu') so they teach the same lesson the full-journey games teach in that
// slot. Debt Breaker imports DEBT_CHAPTER directly instead.
export const roundById = (id) => JOURNEY.find((r) => r.id === id) || JOURNEY[0]

// Per-round dollar goals. The curve climbs hard — later rounds are meant to
// feel like real money — but games pair it with a per-round `valueMul` so the
// PLAY TIME per round stays in the couple-of-minutes range instead of turning
// into a grind. The point is the lesson + the progression, not the realism of
// the absolute number.
//
// Scales gently with a signed-in player's monthly spend when we have it,
// otherwise uses the demo baseline. `data` is the shape from
// lib/playerSpending.js ({ monthlyTotal, ... }); anything falsy → baseline.
// `mul` lets a game rescale the whole curve into its own economy (Budget
// Tetris banks far bigger chunks per action than the slicer does).
const BASE_TARGETS = [300, 1600, 3200, 6000, 10000, 16000, 25000]

// Every round's budget carries a flat bump on top of whatever the curve, the
// per-game economy and the adaptive engine produce. It is deliberately applied
// LAST, by the games, via withBudgetBump() — folding it into BASE_TARGETS here
// would shrink it everywhere it matters: Budget Tetris rescales the curve by
// 0.45× (a baked-in bump would land as +$450) and the adaptive engine multiplies
// by 0.85–1.15× on top (another −15% for a low-skill profile). Added at the end,
// every game and every player sees the full amount.
export const BUDGET_BUMP = 1000
export const withBudgetBump = (v) => BUDGET_BUMP + Math.max(0, Math.round(v))

export function journeyTargets(data, mul = 1) {
  const monthly = Number(data?.monthlyTotal) || 0
  // 0.7×–1.6× nudge around a $1,500/mo reference; 1× when we have no data.
  const scale = (monthly > 0 ? Math.max(0.7, Math.min(1.6, monthly / 1500)) : 1) * (mul || 1)
  return BASE_TARGETS.map((b, i) => {
    const raw = b * scale
    // round R1 to the nearest $10, mid goals to $50, the big ones to $100
    const step = i === 0 ? 10 : i < 3 ? 50 : 100
    return Math.max(Math.round(b * 0.3), Math.round(raw / step) * step)
  })
}

// How much one "unit" of progress is worth in a given round. Later rounds move
// bigger money per action, which is what keeps a $25,000 finale from taking
// twenty minutes to clear. Games multiply their natural award by this.
const VALUE_MULS = [1, 1.9, 2.6, 3.4, 4.6, 6, 8]
export const roundValueMul = (i) => VALUE_MULS[Math.max(0, Math.min(VALUE_MULS.length - 1, i))]

// Which stage (sub-level) of a round the player is in, given progress toward
// the round target. 1-based. Games use it to step difficulty mid-round.
export function stageFor(roundIdx, banked, target) {
  const stages = roundAt(roundIdx).stages || 1
  if (stages <= 1 || !(target > 0)) return 1
  const frac = Math.max(0, Math.min(0.999, banked / target))
  return 1 + Math.floor(frac * stages)
}
