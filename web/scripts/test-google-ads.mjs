import assert from 'node:assert/strict'
import { googleAdsSignupId } from '../src/lib/google-ads-signup.mjs'
import { adsAllowed, adsPageLocation, sendGoogleSignup, finishGoogleSignup, GOOGLE_ADS_SIGNUP } from '../src/lib/google-ads-browser.mjs'

const now = Date.now(), user = { id: 'local-test', created_at: new Date(now).toISOString(), identities: [{ provider: 'email' }] }
const id = googleAdsSignupId(user, { now, enabled: true })
assert.match(id, /^[0-9a-f-]{36}$/)
for (const invalid of [null, {}, { ...user, identities: [] }, { ...user, created_at: 'invalid' }, { ...user, created_at: new Date(now - 300001).toISOString() }, { ...user, created_at: new Date(now + 1).toISOString() }]) assert.equal(googleAdsSignupId(invalid, { now, enabled: true }), null)
assert.equal(googleAdsSignupId(user, { now, enabled: true, existing: true }), null)
assert.equal(googleAdsSignupId(user, { now, enabled: false }), null)

function browser(path = '/register') {
  const storage = new Map(), calls = [], scripts = []
  const win = { location: new URL(`https://getguac.app${path}?email=private%40example.test&gclid=verified-click#private`), sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) }, gtag: (...args) => { calls.push(args); args[2]?.event_callback?.() } }
  const doc = { cookie: '', referrer: 'https://example.test/private?secret=1', createElement: () => ({}), head: { appendChild: s => scripts.push(s) } }
  return { win, doc, nav: {}, enabled: true, calls, scripts }
}
for (const path of ['/dashboard', '/receipts', '/profile', '/news', '/admin/statistics']) assert.equal(adsAllowed(browser(path).win, {}, { cookie: '' }, true), false)
for (const nav of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) assert.equal(adsAllowed(browser().win, nav, { cookie: '' }, true), false)
assert.equal(adsAllowed(browser().win, {}, { cookie: 'guac_embedded=1' }, true), false)
assert.equal(adsAllowed({ location: new URL('http://localhost:3002/register') }, {}, { cookie: '' }, true), false)
const b = browser()
assert.equal(adsPageLocation(b.win), 'https://getguac.app/register?gclid=verified-click')
assert.equal(await sendGoogleSignup('invalid', b), false)
assert.equal(await sendGoogleSignup(id, b), true)
assert.equal(await sendGoogleSignup(id, b), false)
assert.equal(b.scripts.length, 1)
const conversions = b.calls.filter(c => c[0] === 'event')
assert.equal(conversions.length, 1)
assert.equal(conversions[0][2].send_to, GOOGLE_ADS_SIGNUP)
assert.equal(conversions[0][2].transaction_id, id)
assert.ok(!JSON.stringify(b.calls).includes('private'))
const oauth = browser('/register/complete')
oauth.doc.cookie = `gg_ads_signup=${id}`
assert.equal(await finishGoogleSignup(oauth), true)
assert.match(oauth.doc.cookie, /Max-Age=0/)
assert.equal(await finishGoogleSignup(oauth), false)
const blocked = browser(); blocked.nav.globalPrivacyControl = true
assert.equal(await sendGoogleSignup(id, blocked), false)
assert.equal(blocked.scripts.length, 0)
console.log('PASS new-account qualification, duplicate prevention, public-only scope, privacy opt-outs, redacted URLs and OAuth completion')
