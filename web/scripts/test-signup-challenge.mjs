import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifySignupChallenge } from '../src/lib/signup-challenge.js'
const originalFetch=globalThis.fetch
const secret=process.env.TURNSTILE_SECRET_KEY
const demo=process.env.DEMO_CHALLENGE_SECRET
process.env.DEMO_CHALLENGE_SECRET='signup-unit-test-only'
const token=(age=5000)=>{const payload=`${Date.now()+60000}.${Date.now()-age}`;return `${payload}.${createHmac('sha256',process.env.DEMO_CHALLENGE_SECRET).update(`7.${payload}`).digest('base64url')}`}
const response=(body,ok=true)=>({ok,json:async()=>body})
try {
 await test('web challenge remains valid and does not contact Cloudflare',async()=>{
  globalThis.fetch=()=>{throw Error('unexpected network')}
  assert.equal((await verifySignupChallenge({demo_token:token(),demo_answer:'7'})).ok,true)
  assert.equal((await verifySignupChallenge({demo_token:token(),demo_answer:'8'})).ok,false)
  assert.equal((await verifySignupChallenge({demo_token:token(0),demo_answer:'7'})).reason,'too-fast')
 })
 await test('mobile token is verified with the secret, timeout and expected hostname',async()=>{
  process.env.TURNSTILE_SECRET_KEY='unit-test-secret'
  globalThis.fetch=async(url,options)=>{
   assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify')
   assert.equal(options.body.get('secret'),'unit-test-secret')
   assert.equal(options.body.get('response'),'mobile-token')
   assert(options.signal)
   return response({success:true,hostname:'getguac.app'})
  }
  assert.equal((await verifySignupChallenge({turnstile_token:'mobile-token'})).ok,true)
 })
 await test('rejected, replayed, malformed, foreign-host and unavailable verification fail closed',async()=>{
  for(const body of [{success:false,'error-codes':['timeout-or-duplicate']},{success:'true',hostname:'getguac.app'},{success:true,hostname:'attacker.example'},{}]){
   globalThis.fetch=async()=>response(body)
   assert.equal((await verifySignupChallenge({turnstile_token:'mobile-token'})).ok,false)
  }
  globalThis.fetch=async()=>response({success:true,hostname:'getguac.app'},false)
  assert.equal((await verifySignupChallenge({turnstile_token:'mobile-token'})).ok,false)
  globalThis.fetch=async()=>{throw Error('timeout')}
  assert.equal((await verifySignupChallenge({turnstile_token:'mobile-token'})).ok,false)
 })
 await test('no secret, missing tokens, oversized tokens and honeypots cannot bypass verification',async()=>{
  delete process.env.TURNSTILE_SECRET_KEY
  assert.equal((await verifySignupChallenge({turnstile_token:'mobile-token'})).ok,false)
  process.env.TURNSTILE_SECRET_KEY='unit-test-secret'
  globalThis.fetch=()=>{throw Error('must not reach network')}
  for(const body of [{},{turnstile_token:42},{turnstile_token:'x'.repeat(2049)},{turnstile_token:'mobile-token',website:'spam'}])assert.equal((await verifySignupChallenge(body)).ok,false)
 })
 await test('invalid web challenge cannot fall back to mobile validation',async()=>{
  globalThis.fetch=()=>{throw Error('must not reach network')}
  assert.equal((await verifySignupChallenge({demo_token:'invalid',demo_answer:'7',turnstile_token:'mobile-token'})).ok,false)
 })
} finally {
 globalThis.fetch=originalFetch
 if(secret===undefined)delete process.env.TURNSTILE_SECRET_KEY;else process.env.TURNSTILE_SECRET_KEY=secret
 if(demo===undefined)delete process.env.DEMO_CHALLENGE_SECRET;else process.env.DEMO_CHALLENGE_SECRET=demo
}
