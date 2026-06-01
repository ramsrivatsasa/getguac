// Cross-platform fixture test for the web/JS score engine.
//
// Reads test-fixtures/score-engines.json (shared with the mobile
// Dart suite at mobile/test/services/wizard_score_test.dart) and
// asserts computeWizardScore produces the expected score for every
// case. If this passes AND `flutter test` passes on the same
// fixtures, web and mobile compute identical numbers for the same
// input — i.e. the dashboard tile and the /guacanomics / /guacwizard
// pages will all agree.
//
// Run:  cd web && node scripts/test-score-engines.mjs

import { computeWizardScore } from '../src/lib/wizardScore.js'
import { bankAccountTotals } from '../src/lib/financeInsights.js'
import { calculateGuacoScore } from '../src/lib/guacoscore.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const baseDir = join(__dirname, '..', '..', 'test-fixtures')

const fixtures = JSON.parse(readFileSync(join(baseDir, 'score-engines.json'), 'utf-8'))
const guacoFixtures = JSON.parse(readFileSync(join(baseDir, 'guacoscore.json'), 'utf-8'))

let pass = 0, fail = 0
const failures = []

console.log('--- computeWizardScore ---')
for (const c of fixtures.wizardScore) {
  const result = computeWizardScore({
    summary: c.input.summary,
    accounts: c.input.accounts,
  })
  if (result.score === c.expected.score) {
    pass++
    console.log(`  ✓ ${c.name} → ${result.score}`)
  } else {
    fail++
    failures.push(`${c.name}: expected ${c.expected.score}, got ${result.score}`)
    console.log(`  ✗ ${c.name} — expected ${c.expected.score}, got ${result.score}`)
  }
}

console.log('\n--- aggregateBankForWizard (pipeline layer) ---')
for (const c of fixtures.aggregateBankForWizard || []) {
  // Fixtures pass startStr (always) and endStr (optional). When
  // endStr is set we want EXCLUSIVE upper-bound semantics so a row
  // dated == endStr belongs to the NEXT window. Use the new
  // {start, end} shape that financeInsights.inRange supports.
  const bound = c.input.endStr
    ? { start: new Date(c.input.startStr), end: new Date(c.input.endStr) }
    : new Date(c.input.startStr)
  const accounts = bankAccountTotals(
    { statements: c.input.statements, fees: c.input.fees, transactions: c.input.transactions },
    bound,
  )
  const totals = accounts.reduce((t, a) => ({
    interest:  t.interest  + a.totalInterest,
    fees:      t.fees      + a.totalFees,
    payments:  t.payments  + a.totalPayments,
    purchases: t.purchases + a.totalPurchases,
  }), { interest: 0, fees: 0, payments: 0, purchases: 0 })
  const want = c.expected.summaryTotals
  const wantLen = c.expected.accountsLength
  const ok =
       totals.interest  === want.interest
    && totals.fees      === want.fees
    && totals.payments  === want.payments
    && totals.purchases === want.purchases
    && accounts.length  === wantLen
  if (ok) {
    pass++
    console.log(`  ✓ ${c.name} → interest=${totals.interest}, fees=${totals.fees}, accounts=${accounts.length}`)
  } else {
    fail++
    const detail = `expected interest=${want.interest} fees=${want.fees} accounts=${wantLen}, ` +
                   `got interest=${totals.interest} fees=${totals.fees} accounts=${accounts.length}`
    failures.push(`${c.name}: ${detail}`)
    console.log(`  ✗ ${c.name} — ${detail}`)
  }
}

console.log('\n--- calculateGuacoScore ---')
for (const c of guacoFixtures.cases) {
  // Convert fixture's camelCase to the snake_case the engine expects
  const receipts = c.input.receipts.map(r => ({
    rating: r.rating,
    total_amount: r.totalAmount,
  }))
  const result = calculateGuacoScore(receipts, { bankBite: c.input.bankBite })
  const okScore = result.score === c.expected.score
  const okCount = result.ratedCount === c.expected.ratedCount
  const okPenalty = result.bankPenalty === c.expected.bankPenalty
  if (okScore && okCount && okPenalty) {
    pass++
    console.log(`  ✓ ${c.name} → score=${result.score} rated=${result.ratedCount} penalty=${result.bankPenalty}`)
  } else {
    fail++
    const detail = `expected score=${c.expected.score} rated=${c.expected.ratedCount} penalty=${c.expected.bankPenalty}, ` +
                   `got score=${result.score} rated=${result.ratedCount} penalty=${result.bankPenalty}`
    failures.push(`${c.name}: ${detail}`)
    console.log(`  ✗ ${c.name} — ${detail}`)
  }
}

console.log('')
console.log(`${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('')
  console.log('Failures:')
  for (const f of failures) console.log('  ' + f)
  process.exit(1)
}
