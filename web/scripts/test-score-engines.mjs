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
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesPath = join(__dirname, '..', '..', 'test-fixtures', 'score-engines.json')

const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'))
const cases = fixtures.wizardScore

let pass = 0, fail = 0
const failures = []

for (const c of cases) {
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

console.log('')
console.log(`${pass} passed, ${fail} failed`)
if (fail > 0) {
  console.log('')
  console.log('Failures:')
  for (const f of failures) console.log('  ' + f)
  process.exit(1)
}
