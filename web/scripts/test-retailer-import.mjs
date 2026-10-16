import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reviewedOrder, importReviewedOrders } from '../src/lib/retailer-import.mjs'

const order = (id, overrides = {}) => ({ order_id: id, date: 'May 6, 2024', total: '31.42', items: [], ...overrides })
test('distinct orders sharing a receipt ID report an identity failure, not a skip', async () => {
  const result = await importReviewedOrders({}, 'user', 'amazon', [order('one'), order('two')], async () => ({ receipt_id: 'merged-receipt', merged: false }))
  assert.deepEqual([result.imported, result.updated, result.skipped, result.failed], [1, 0, 0, 1])
  assert.deepEqual(result.receipt_ids, ['merged-receipt'])
  assert.equal(result.errors[0].order_id, 'two')
  assert.match(result.errors[0].message, /identity could not be preserved/)
})
test('missing dates and invalid money/IDs never become invented purchases', () => {
  for (const override of [{ date: '' }, { date: 'unknown' }, { date: '2024-02-30' }, { total: 'Infinity' }, { total: 'USD xyz' }, { total: '-3' }, { order_id: 'a/b' }]) {
    assert.equal(reviewedOrder(order('123-1234567-1234567', override), 'amazon'), null)
  }
  const valid = reviewedOrder(order('123-1234567-1234567', { total: '$1,031.42' }), 'amazon')
  assert.equal(valid.parsed.total_amount, 1031.42)
  assert.equal(valid.parsed.date, '2024-05-06')
  assert.equal(valid.parsed.tax_paid, undefined)
  assert.equal(reviewedOrder(order('test', { date: '2024-05-06T23:30:00-04:00' }), 'amazon').parsed.date, '2024-05-06')
})

test('84 same-day/same-total distinct orders persist distinctly and retry safely', async () => {
  const rows = new Map()
  const save = async (_, user, parsed, opts) => {
    const key = `${user}:${opts.retailer_order_key}`
    const merged = rows.has(key)
    if (!merged) rows.set(key, `receipt-${rows.size}`)
    return { receipt_id: rows.get(key), merged }
  }
  const orders = Array.from({ length: 84 }, (_, i) => order(`123-${String(i).padStart(7, '0')}-1234567`))
  const first = await importReviewedOrders({}, 'user', 'amazon', orders, save)
  assert.equal(first.imported, 84)
  assert.equal(new Set(first.receipt_ids).size, 84)
  const retry = await importReviewedOrders({}, 'user', 'amazon', orders, save)
  assert.equal(retry.imported, 0)
  assert.equal(retry.updated, 84)
  assert.equal(rows.size, 84)
  const otherUser = await importReviewedOrders({}, 'other-user', 'amazon', [orders[0]], save)
  assert.equal(otherUser.imported, 1)
})

test('duplicate IDs, incomplete orders and individual save errors have honest counts', async () => {
  const orders = [order('one'), order('one'), order('bad', { date: '' }), order('fail'), order('two')]
  const result = await importReviewedOrders({}, 'user', 'amazon', orders, async (_, user, parsed, opts) => {
    if (opts.retailer_order_key.endsWith('_fail')) throw new Error('Storage/database unavailable')
    return { receipt_id: opts.retailer_order_key, merged: false }
  })
  assert.deepEqual([result.imported, result.updated, result.skipped, result.failed], [2, 0, 2, 1])
  assert.equal(result.receipt_ids.length, 2)
  assert.equal(result.errors[0].order_id, 'fail')
})
