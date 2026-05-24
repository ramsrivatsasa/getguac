// GuacoScore™ — a 0-100 score of how worthy your spending has been.
//
// Higher = more essential purchases.  Lower = more adhoc / regret.
// Each rated purchase contributes a value scaled by its dollar amount, so
// a $500 regret hurts the score more than a $5 regret. Unrated items are
// excluded — you have to rate to score.

export const GUACOSCORE_GRADES = [
  { min: 90, key: 'master',  label: 'Smash Master',  emoji: '🥑',  desc: 'Every dollar earning its smash.',     color: 'emerald' },
  { min: 75, key: 'solid',   label: 'Solid Smasher', emoji: '✨', desc: 'Mostly essentials. Keep it up.',       color: 'lime' },
  { min: 60, key: 'steady',  label: 'Steady Guac',   emoji: '🙂', desc: 'Doing fine. Some room to tighten.',    color: 'amber' },
  { min: 40, key: 'splurgy', label: 'Splurgy',       emoji: '🍿', desc: 'Treat-yourself mode. Watch the drift.', color: 'orange' },
  { min: 0,  key: 'mushy',   label: 'Mushy',         emoji: '🙈', desc: 'Lots of regret. Reset incoming.',      color: 'rose' },
]

export function gradeFor(score) {
  if (score == null) return null
  for (const g of GUACOSCORE_GRADES) if (score >= g.min) return g
  return GUACOSCORE_GRADES[GUACOSCORE_GRADES.length - 1]
}

// Computes the score from an array of receipts.
// Pass a list of plain receipt rows (must have `rating` and `total_amount`).
//
// Optional 2nd arg `opts.bankBite = { interest, fees, total }` — the amount
// the user paid in interest + bank fees over the SAME period. We penalize the
// score by up to -25 based on bank-bite as a fraction of spend, plus extra
// per-dollar hits (interest stings more than fees). Reasoning: even essential
// purchases on a card you don't pay off are leaking value, so the score
// should reflect the cost of borrowing — not just whether the buys were wise.
//
// Returns: { score, grade, ratedCount, weightedSpend, bankPenalty } or
//          { score: null } if no rated data.
export function calculateGuacoScore(receipts = [], opts = {}) {
  const rated = (receipts || []).filter(r =>
    r && r.rating != null && parseFloat(r.total_amount || 0) > 0
  )
  if (rated.length === 0) return { score: null, grade: null, ratedCount: 0, weightedSpend: 0, bankPenalty: 0 }

  let weightedSum = 0
  let weightTotal = 0
  for (const r of rated) {
    const w = Math.abs(parseFloat(r.total_amount || 0))
    const v = (r.rating - 3) * 25
    weightedSum += v * w
    weightTotal += w
  }

  const raw = weightTotal === 0 ? 50 : (weightedSum / weightTotal) + 50

  // ── Bank-Bite penalty ───────────────────────────────────────────────
  // Interest is worse than fees per dollar (compounds, indicates rolling
  // balance). The penalty caps at -25 so the score can't be obliterated
  // by a single horrible statement.
  let bankPenalty = 0
  const bite = opts?.bankBite || {}
  const interest = Math.max(0, Number(bite.interest || 0))
  const fees     = Math.max(0, Number(bite.fees || 0))
  if (interest > 0 || fees > 0) {
    const ratio = weightTotal > 0 ? (interest + fees) / weightTotal : 1
    // ratio-based: 10% of spend in interest+fees → -10 points; 25%+ → -25
    const ratioHit = Math.min(25, ratio * 100)
    // per-dollar: every $25 of interest hurts an extra point; every $50 of fees
    const dollarHit = (interest / 25) + (fees / 50)
    bankPenalty = Math.min(25, Math.round(ratioHit + dollarHit))
  }

  const score = Math.round(Math.max(0, Math.min(100, raw - bankPenalty)))
  return {
    score,
    grade: gradeFor(score),
    ratedCount: rated.length,
    weightedSpend: weightTotal,
    bankPenalty,
  }
}
