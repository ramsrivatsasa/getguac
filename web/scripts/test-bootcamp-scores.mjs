import assert from 'node:assert/strict'
import {migrateScores, readScores, saveScore} from '../src/app/money-bootcamp/scores.js'

const old = 'know-your-money-a-simple-financial-snapshot'
const legacy = {best: 89, last: 56, attempts: 3, at: '2026-10-12'}
const current = {best: 78, last: 78, attempts: 1, at: '2026-10-13'}
const source = {[old]: legacy, 'where-you-stand': current, 'exam:start': legacy, unknown: legacy}
const migrated = migrateScores(source)
assert.deepEqual(migrated['where-you-stand'], {...current, best: 89, attempts: 4})
assert.equal(migrated[old], undefined)
assert.deepEqual(migrated['exam:start'], legacy)
assert.deepEqual(migrated.unknown, legacy)
assert.deepEqual(migrateScores(migrated), migrated)
assert.deepEqual(source[old], legacy, 'Input must not be mutated')
assert.deepEqual(migrateScores([]), {})
let stored = JSON.stringify({[old]: legacy})
global.window = {localStorage: {getItem: () => stored, setItem: (_, value) => {stored = value}}, dispatchEvent: () => {}}
assert.equal(readScores()['where-you-stand'].best, 89)
assert.equal(JSON.parse(stored)[old], undefined)
assert.equal(saveScore('where-you-stand', 9, 9).attempts, 4)
assert.equal(readScores()['where-you-stand'].best, 100)
stored = '{broken'
assert.deepEqual(readScores(), {})
window.localStorage.getItem = () => {throw new Error('blocked')}
assert.deepEqual(readScores(), {})
assert.equal(saveScore('where-you-stand', 7, 9).best, 78)
delete global.window
assert.deepEqual(readScores(), {})
console.log('PASS score aliases, best/latest/attempt history, idempotence, exam/unknown preservation, save, malformed/blocked storage and SSR')
