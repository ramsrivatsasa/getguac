// Disposable local-only account. Synthetic purchases test persistence, not
// real-world retailer discovery or the owner's financial records.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
const config = JSON.parse(await fs.readFile('.local/supabase.json', 'utf8'))
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(config.API_URL).hostname))
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `import-regression-${Date.now()}@example.test`, password = `Local-only-${crypto.randomUUID()}`
let userId
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw created.error
  userId = created.data.user.id
  const client = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } })
  const login = await client.auth.signInWithPassword({ email, password })
  if (login.error) throw login.error
  const headers = { Authorization: `Bearer ${login.data.session.access_token}`, 'Content-Type': 'application/json' }
  const post = async (path, body, extra = {}) => {
    const response = await fetch(`http://127.0.0.1:3002${path}`, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(180_000) })
    const data = await response.json()
    assert.ok(response.ok, JSON.stringify({ path, status: response.status, data }))
    return data
  }
  const orders = Array.from({ length: 84 }, (_, i) => ({ order_id: `123-${String(i).padStart(7, '0')}-7654321`, date: 'May 6, 2024', total: '31.42', items: [] }))
  const ids = new Set()
  for (const batch of [orders.slice(0, 50), orders.slice(50)]) {
    const result = await post('/api/connections/import', { retailer_id: 'amazon', orders: batch })
    assert.deepEqual([result.imported, result.updated, result.failed], [batch.length, 0, 0])
    result.receipt_ids.forEach(id => ids.add(id))
  }
  assert.equal(ids.size, 84)
  console.log('PASS 84 distinct same-day/same-total Amazon orders persisted across two batches')
  for (const batch of [orders.slice(0, 50), orders.slice(50)]) {
    const result = await post('/api/connections/import', { retailer_id: 'amazon', orders: batch })
    assert.deepEqual([result.imported, result.updated, result.failed], [0, batch.length, 0])
    assert.ok(result.receipt_ids.every(id => ids.has(id)))
  }
  const rows = await admin.from('receipts').select('id,retailer_order_key').eq('user_id', userId)
  if (rows.error) throw rows.error
  assert.equal(rows.data.length, 84)
  console.log('PASS repeated history imports preserve all 84 receipt identities')
  const dedup = await post('/api/receipts/dedup', {})
  assert.equal(dedup.groups_with_duplicates, 0)
  assert.equal(dedup.receipts_to_delete, 0)
  const concurrentOrder = { ...orders[0], order_id: '123-9999999-7654321' }
  const concurrent = await Promise.all([1, 2].map(() => post('/api/connections/import', { retailer_id: 'amazon', orders: [concurrentOrder] })))
  assert.equal(concurrent.reduce((n, result) => n + result.imported, 0), 1)
  assert.equal(new Set(concurrent.flatMap(result => result.receipt_ids)).size, 1)
  console.log('PASS concurrent retry creates one receipt; duplicate cleanup preserves distinct orders')
  await fs.writeFile('.local/retailer-import-dedup-test.json', JSON.stringify(dedup, null, 2))
  // Upload a test PNG to storage and save/replay the resulting receipt with
  // the exact native Bearer-header/outbox contract.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64')
  const objectPath = `${userId}/synthetic-upload.png`
  const uploaded = await client.storage.from('receipts').upload(objectPath, png, { contentType: 'image/png' })
  if (uploaded.error) throw uploaded.error
  const receipt_link = client.storage.from('receipts').getPublicUrl(objectPath).data.publicUrl
  const payload = { parsed: { store_name: 'Synthetic upload fixture', date: '2026-10-07', total_amount: 7.25, items: [] }, source: 'image', receipt_link }
  const idem = `upload-test-${crypto.randomUUID()}`
  const saved = await post('/api/receipts/save', payload, { 'Idempotency-Key': idem })
  assert.ok(saved.receipt_id)
  const replay = await post('/api/receipts/save', payload, { 'Idempotency-Key': idem })
  assert.equal(replay.receipt_id, saved.receipt_id)
  assert.equal(replay.replayed, true)
  const repeatUpload = await post('/api/receipts/save', payload, { 'Idempotency-Key': `upload-repeat-${crypto.randomUUID()}` })
  assert.equal(repeatUpload.receipt_id, saved.receipt_id)
  assert.equal(repeatUpload.merged, true)
  console.log('PASS authenticated native-contract storage upload, receipt save and retry')
  const form = new FormData()
  form.append('file', new Blob([png], { type: 'image/png' }), 'synthetic-upload.png')
  const parsed = await fetch('http://127.0.0.1:3002/api/parse-receipt', { method: 'POST', headers: { Authorization: headers.Authorization }, body: form, signal: AbortSignal.timeout(180_000) })
  const parseData = await parsed.json()
  assert.notEqual(parsed.status, 401, JSON.stringify(parseData))
  console.log(`PASS parser accepts native Bearer authentication (HTTP ${parsed.status}; one-pixel fixture tests authentication; separate synthetic receipt probe tests OCR)`)
  await client.storage.from('receipts').remove([objectPath])
  await fs.writeFile('.local/retailer-import-local-results.json', JSON.stringify({ date: new Date().toISOString(), synthetic: true, distinctOrders: ids.size, storageUpload: true, saveReplay: true, parserStatus: parsed.status }, null, 2))
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId)
    if (removed.error) throw removed.error
    console.log('Removed disposable local test account')
  }
}
