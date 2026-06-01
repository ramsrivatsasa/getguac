// GuacWizard health score — 0 to 100. Higher = healthier.
//
// Pulled out of /guacwizard/page.jsx so both the dedicated page AND
// the dashboard tile compute the same number. Transparent on the
// page (the breakdown is shown alongside) so the user sees why the
// score moves.
//
// Inputs come from bankAccountTotals(generateInsights(...)) which
// aggregates bank_statements + bank_fees + bank_transactions into
// summary + accounts shapes.

export function computeWizardScore({ summary, accounts = [] } = {}) {
  let score = 100
  const reasons = []
  if (!summary) return { score: null, reasons }

  const { totalInterest = 0, totalFees = 0,
          totalPayments = 0, totalRefunds = 0 } = summary
  // Accept both `totalPurch` (the field name web's generateInsights
  // emits) and `totalPurchases` (the field name the Dart engine
  // uses). Same value, different historical naming — both engines
  // now produce the same answer for the same data.
  const totalPurch = summary.totalPurch != null
    ? summary.totalPurch
    : (summary.totalPurchases ?? 0)
  // netDebtChange may be pre-computed by web's upstream pipeline,
  // or derived from raw fields (mobile passes the raw shape).
  // Falling back to the formula keeps both paths consistent.
  const netDebtChange = summary.netDebtChange != null
    ? summary.netDebtChange
    : (totalPurch - totalRefunds - totalPayments)

  if (totalInterest > 0) {
    const penalty = Math.min(35, Math.round(totalInterest / 10))
    score -= penalty
    reasons.push({ label: `-${penalty}`, why: `$${totalInterest.toFixed(2)} in interest paid` })
  }
  if (totalFees > 0) {
    const penalty = Math.min(20, Math.round(totalFees / 5))
    score -= penalty
    reasons.push({ label: `-${penalty}`, why: `$${totalFees.toFixed(2)} in fees paid` })
  }
  if (totalPurch > 0 && netDebtChange > 100) {
    const penalty = Math.min(20, Math.round(netDebtChange / 50))
    score -= penalty
    reasons.push({ label: `-${penalty}`, why: `Debt grew by $${netDebtChange.toFixed(2)}` })
  } else if (netDebtChange < -100) {
    const bonus = Math.min(10, Math.round(Math.abs(netDebtChange) / 100))
    score += bonus
    reasons.push({ label: `+${bonus}`, why: `Debt down $${Math.abs(netDebtChange).toFixed(2)}` })
  }
  // High-APR card penalty — 5 points per card whose latest statement
  // shows an APR ≥ 25%. Captures the "you're carrying a balance on a
  // predatory card" signal even when this window's interest happens
  // to be small.
  const highApr = accounts.filter(a => a.latestApr != null && Number(a.latestApr) >= 25).length
  if (highApr > 0) {
    score -= highApr * 5
    reasons.push({ label: `-${highApr * 5}`, why: `${highApr} card(s) above 25% APR` })
  }
  // Cold-start baseline — if the user hasn't uploaded any statements
  // yet, peg at 50 so the dashboard tile doesn't show a misleading
  // 100/100 from "nothing bad found because there's nothing here".
  if (accounts.length === 0) {
    score = 50
    reasons.push({ label: 'baseline', why: 'No statements uploaded yet' })
  }

  score = Math.max(0, Math.min(100, score))
  return { score, reasons }
}
