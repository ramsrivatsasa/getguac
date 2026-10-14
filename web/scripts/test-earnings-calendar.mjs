import assert from 'node:assert/strict'
import { normalizeEarnings, loadEarningsCalendar } from '../src/lib/earnings-calendar.mjs'
const rows = [{ symbol: 'AAPL', date: '2026-10-20', epsEstimate: 0, epsActual: null, revenueEstimate: 500000000, revenueActual: null, hour: 'amc' }, { symbol: 'MSFT', date: '2026-10-21', epsEstimate: '2.50' }]
const result = normalizeEarnings([...rows, rows[0]], ['AAPL'])
assert.equal(result.length, 1); assert.equal(result[0].expectedEPS, 0); assert.equal(result[0].actualEPS, null); assert.equal(result[0].timing, 'After market close')
assert.equal(normalizeEarnings(rows, ['MSFT'])[0].expectedEPS, null)
assert.ok((await loadEarningsCalendar({ key: '', fetcher: () => { throw new Error('Must not request') } })).unavailable)
assert.ok((await loadEarningsCalendar({ key: 'synthetic-test', fetcher: async () => ({ ok: false }) })).unavailable)
const loaded = await loadEarningsCalendar({ key: 'synthetic-test', now: new Date('2026-10-14T12:00:00Z'), fetcher: async (url, options) => {
  assert.equal(url.searchParams.get('from'), '2026-10-07'); assert.equal(url.searchParams.get('to'), '2026-11-13'); assert.equal(url.searchParams.has('token'), false); assert.equal(options.headers['X-Finnhub-Token'], 'synthetic-test')
  return { ok: true, json: async () => ({ earningsCalendar: rows }) }
} })
assert.equal(loaded.rows.length, 2); assert.equal(loaded.asOf, '2026-10-14T12:00:00.000Z')
console.log('PASS sourced calendar adapter, expected/reported separation, missing values and credential-free failure')
