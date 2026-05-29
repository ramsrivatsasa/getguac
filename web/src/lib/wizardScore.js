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

export function computeWizardScore({ summary, accounts } = {}) {
  let score = 100
  const reasons = []
  if (!summary) return { score: null, reasons }

  const { totalInterest = 0, totalFees = 0, netDebtChange = 0, totalPurch = 0 } = summary

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

  score = Math.max(0, Math.min(100, score))
  return { score, reasons }
}
