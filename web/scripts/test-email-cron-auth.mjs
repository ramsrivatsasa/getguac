import assert from 'node:assert/strict'
import { emailCronAuthorized } from '../src/lib/email-cron-auth.mjs'
const request = headers => new Request('https://example.test/api/email/poll', { headers })
assert.equal(emailCronAuthorized(request({}), ''), false)
assert.equal(emailCronAuthorized(request({}), 'test-secret'), false)
assert.equal(emailCronAuthorized(request({ authorization: 'Bearer wrong' }), 'test-secret'), false)
assert.equal(emailCronAuthorized(request({ authorization: 'Bearer test-secret' }), 'test-secret'), true)
assert.equal(emailCronAuthorized(request({ 'x-cron-secret': 'test-secret' }), 'test-secret'), true)
assert.equal(emailCronAuthorized(request({ authorization: 'Bearer undefined' }), undefined), false)
console.log('PASS email cron authentication: Vercel, GitHub, missing and invalid secrets')
