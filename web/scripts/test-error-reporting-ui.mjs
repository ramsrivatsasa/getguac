import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServerClient } from '@supabase/ssr'
import { readFile } from 'node:fs/promises'
const config = JSON.parse(await readFile('.local/supabase.json', 'utf8'))
const account = JSON.parse(await readFile('.local/find10-account.json', 'utf8')), cookies = []
const sb = createServerClient(config.API_URL, config.ANON_KEY, { cookies: { getAll: () => cookies, setAll: values => { for (const c of values) { const i = cookies.findIndex(x => x.name === c.name); if (i >= 0) cookies.splice(i, 1); cookies.push(c) } } } })
const auth = await sb.auth.signInWithPassword({ email: account.email, password: account.password }); if (auth.error) throw auth.error
const base = 'http://127.0.0.1:3002'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await context.addCookies(cookies.map(c => ({ name: c.name, value: c.value, url: base, httpOnly: false, sameSite: 'Lax' })))
const page = await context.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
const admin = (await import('@supabase/supabase-js')).createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const references=[]
try {
 for(const signedIn of [false,true]) {
  const ctx=signedIn?context:await browser.newContext({viewport:{width:390,height:844}})
  const p=await ctx.newPage()
  p.setDefaultNavigationTimeout(120000)
  await p.goto(base+(signedIn?'/news?tab=watchlist':'/login'),{waitUntil:'networkidle'})
  await p.waitForFunction(()=>window.fetch.name.endsWith('observedFetch'))
  const existing=p.getByRole('dialog');if(await existing.isVisible())await existing.getByRole('button',{name:'Dismiss',exact:true}).click()
  await p.evaluate(()=>window.dispatchEvent(new Event('guac-open-error-report')))
  const popup=p.getByRole('dialog')
  await popup.getByLabel('What happened? (optional)').fill('Audit report password=secret123 https://example.test/?token=abc user@example.test')
  const response=p.waitForResponse(r=>r.url().endsWith('/api/report-error')&&r.request().method()==='POST')
  await popup.getByRole('button',{name:'Report error',exact:true}).click()
  const data=await (await response).json();assert.equal(data.ok,true);references.push(data.reportId)
  await popup.waitFor({state:'hidden'})
  await p.getByRole('status').filter({hasText:'Report saved.'}).waitFor()
  const {data:row,error}=await admin.from('audit_log').select('user_id,detail,action').eq('id',data.reportId).single();assert.ifError(error)
  assert.equal(Boolean(row.user_id),signedIn);assert.equal(row.action,'error_report')
  assert.ok(!JSON.stringify(row.detail).includes('secret123'));assert.ok(!JSON.stringify(row.detail).includes('token=abc'));assert.ok(!JSON.stringify(row.detail).includes('user@example.test'))
  await p.route('**/api/audit-failure',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"test"}'}))
  await p.evaluate(()=>fetch('/api/audit-failure'))
  await popup.getByRole('heading',{name:'Something went wrong'}).waitFor()
  await p.screenshot({path:'.local/production-audit/error-popup-'+(signedIn?'signed-in':'guest')+'.png'})
  await popup.getByRole('button',{name:'Dismiss',exact:true}).click()
  await p.evaluate(()=>fetch('/api/audit-failure'))
  await p.waitForTimeout(150)
  assert.equal(await popup.isVisible(),false,'Repeated error must not reopen popup')
  await p.evaluate(()=>window.dispatchEvent(new Event('guac-open-error-report')))
  await p.route('**/api/report-error',r=>r.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}))
  await popup.getByLabel('What happened? (optional)').fill('Keep my description')
  await popup.getByRole('button',{name:'Report error',exact:true}).click()
  await popup.getByRole('status').filter({hasText:'could not be sent'}).waitFor()
  assert.equal(await popup.getByLabel('What happened? (optional)').inputValue(),'Keep my description')
  await popup.press('Escape');assert.equal(await popup.isVisible(),false)
  await p.evaluate(() => {
   window.dispatchEvent(new ErrorEvent('error', { error: new Error('Audit runtime failure') }))
   window.dispatchEvent(new ErrorEvent('error', { error: new Error('Audit second failure') }))
  })
  await popup.getByText('Audit runtime failure', { exact: true }).waitFor()
  await popup.getByRole('button',{name:'Dismiss',exact:true}).click()
  assert.equal(await popup.isVisible(),false,'Additional errors must not queue successive blocking dialogs')
  await p.evaluate(() => window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('Audit promise failure') })))
  await popup.getByText('Audit promise failure', { exact: true }).waitFor()
  await popup.press('Escape')
  if(!signedIn)await ctx.close();else await p.close()
 }
 console.log('PASS: guest/member reporting, durable records, attribution, redaction, automatic close, HTTP/runtime/promise popups, no queued blocking errors, deduplication, preserved failure state and Escape')
} finally {if(references.length)await admin.from('audit_log').delete().in('id',references);await browser.close()}
