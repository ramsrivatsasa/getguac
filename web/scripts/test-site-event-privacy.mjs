import assert from 'node:assert/strict'
import {recordSiteEvent} from '../src/lib/record-site-event.js'
const saved=[]
const db={from:()=>({insert:value=>({abortSignal:async()=>{saved.push(value);return {error:null}}})})}
const prior={...process.env}
process.env.NODE_ENV='production';process.env.VERCEL_ENV='production';process.env.VISIT_SALT='synthetic-unit-test-salt'
const request=(extra={})=>new Request('https://getguac.app/api/visit',{headers:{host:'getguac.app','user-agent':'Mozilla/5.0 Mobile Safari','x-forwarded-for':'192.0.2.1','x-vercel-ip-country':'US','x-vercel-ip-city':'New%20York',...extra}})
try {
 await recordSiteEvent(db,request(),{path:'/register?email=private@example.test',event:'signup_start',referrer:'https://www.instagram.com/?private=value'})
 assert.equal(saved.length,1);assert.equal(saved[0].path,'/register');assert.equal(saved[0].city,'New York');assert.equal(saved[0].source,'Social');assert.match(saved[0].visitor_hash,/^[a-f0-9]{64}$/)
 const serial=JSON.stringify(saved[0]);assert.ok(!serial.includes('192.0.2.1'));assert.ok(!serial.includes('Mozilla'));assert.ok(!serial.includes('private'));assert.ok(!serial.includes('instagram.com'))
 for(const extra of [{dnt:'1'},{'sec-gpc':'1'},{host:'preview.example.test'},{'user-agent':'HeadlessChrome'},{cookie:'guac_embedded=1'}]) await recordSiteEvent(db,request(extra),{path:'/register'})
 assert.equal(saved.length,1)
 await recordSiteEvent(db,request(),{path:'/admin/statistics'});assert.equal(saved.length,1)
 await recordSiteEvent(db,{headers:new Headers()}, {path:'/register'});assert.equal(saved.length,1)
 console.log('PASS event minimization, opt-outs, bot/embedded/preview/admin exclusion and missing metadata')
}finally {
 for(const name of ['NODE_ENV','VERCEL_ENV','VISIT_SALT']){if(prior[name]===undefined)delete process.env[name];else process.env[name]=prior[name]}
}
