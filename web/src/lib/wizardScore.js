// GuacWizard health score — 0 to 100. Higher = healthier.
//
// === CANONICAL ENGINE — DO NOT FORK ===
// Single source of truth for the GuacWizard math. Every surface
// reads through one of these paths:
//   • Web — imports `computeWizardScore` directly (no network)
//   • Mobile (Flutter) — calls /api/guacwizard via
//     mobile/lib/services/wizard_score.dart::WizardScoreApi.compute.
//     A Dart port of the math is bundled for offline + test use;
//     test-fixtures/score-engines.json asserts both implementations
//     produce identical scores from identical input.
//   • Server cron / scripts / future platforms — hit /api/guacwizard.
//
// If you change the math, add a fixture case to
// test-fixtures/score-engines.json and a scenario to
// test-fixtures/guacwizard-scenarios.json so the cross-platform
// runners (web/scripts/test-guacwizard-scenarios.mjs +
// mobile/test/services/guacwizard_scenarios_test.dart) lock the
// new behavior in.
//
// === CONTRACT ===
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
  // Cold-start baseline — only fires when there's literally NO bank
  // data at all (no accounts AND no fees/payments/purchases). If the
  // user has fees but no statements (common when bank rows come in
  // via direct import rather than statement OCR), the score is
  // computed from those raw totals instead of falling back to 50.
  // Matches the mobile aggregator's synthetic-account fallback.
  const hasAnyData =
       totalInterest > 0 || totalFees > 0
    || totalPayments > 0 || totalPurch    > 0
    || totalRefunds  > 0
  if (accounts.length === 0 && !hasAnyData) {
    score = 50
    reasons.push({ label: 'baseline', why: 'No bank data uploaded yet' })
  }

  score = Math.max(0, Math.min(100, score))
  return { score, reasons }
}
