import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {chromium} from 'playwright'
import {releaseAccess} from './release-access.mjs'

assert(process.argv.includes('--production'), 'Explicit --production is required for disposable QA records')
const env = {}
for (const line of (await readFile('.env.local','utf8')).split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g,'')
}
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,'https://qchkwojgvfhlbdtpzzig.supabase.co')
const base = process.env.RELEASE_URL || 'https://getguac.app', output = process.env.REVIEW_OUTPUT || '.local/dashboard-hydration-production-20261013'
assert(/^https:\/\/(getguac\.app|getguac-[a-z0-9]+-getguac\.vercel\.app)$/.test(base), 'Only the GetGuac live domain or release candidates are allowed')
const access = await releaseAccess(base)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const must = result => {assert.ifError(result.error);return result.data}
const credentials = {email:`hydration-qa-${randomUUID()}@example.test`,password:`${randomUUID()}!aA1`}
const results = []
let user, browser
await mkdir(output,{recursive:true})
try {
  user = must(await admin.auth.admin.createUser({...credentials,email_confirm:true,user_metadata:{first_name:'Hydration QA (synthetic)',release_verification:true,country_code:'US',preferred_currency:'USD',postal_code:'20152',city:'Chantilly',address_region:'VA'}})).user
  must(await admin.from('income_sources').insert({user_id:user.id,name:'Synthetic hydration verification income',amount:5000,expected_monthly_amount:5000,cadence:'monthly',is_active:true,is_confirmed:true,notes:'Disposable QA data.'}))
  const cookies = []
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const c of values){const i=cookies.findIndex(x=>x.name===c.name);if(i>=0)cookies.splice(i,1);cookies.push(c)}}}})
  must(await sb.auth.signInWithPassword(credentials))
  browser = await chromium.launch({headless:true})
  for (const timezoneId of ['UTC','America/New_York','America/Los_Angeles']) {
    const context = await browser.newContext({timezoneId})
    await context.addCookies(access.cookies)
    await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:base,sameSite:'Lax'})))
    await context.addInitScript(()=>{localStorage.setItem('sidebarCollapsed','true');localStorage.setItem('spendingPeriod','yearly');localStorage.setItem('spendingPeriodCount','3')})
    const page = await context.newPage(), errors = []
    page.on('pageerror',error=>errors.push(error.message))
    page.on('console',message=>{if(message.type()==='error'&&/hydration|did not match|server render|webpack_modules|ChunkLoadError|418/i.test(message.text()))errors.push(message.text())})
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000})
      const response = await page.goto(base+'/dashboard',{waitUntil:'networkidle',timeout:90000})
      await page.waitForFunction(()=>document.body.innerText.includes('Last 3 years'),{},{timeout:30000})
      assert.equal(response.status(),200)
      assert.equal(new URL(page.url()).pathname,'/dashboard')
      const state = await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,period:localStorage.getItem('spendingPeriod'),count:localStorage.getItem('spendingPeriodCount'),collapsed:localStorage.getItem('sidebarCollapsed')}))
      assert.equal(state.overflow,false);assert.equal(state.period,'yearly');assert.equal(state.count,'3');assert.equal(state.collapsed,'true')
      assert(!/records could not be loaded|This page could not load/.test(await page.locator('body').innerText()))
      await page.screenshot({path:`${output}/${timezoneId.replaceAll('/','-')}-${width}.png`,fullPage:true})
      await page.goto(base+'/receipts',{waitUntil:'networkidle',timeout:90000})
      await page.goBack({waitUntil:'networkidle',timeout:90000})
      assert.equal(new URL(page.url()).pathname,'/dashboard')
      await page.reload({waitUntil:'networkidle',timeout:90000})
      await page.waitForFunction(()=>document.body.innerText.includes('Last 3 years'))
      assert.deepEqual(errors,[])
      results.push({timezoneId,width,status:response.status(),...state,errors:[...errors],reloadAndBack:true})
      console.log('PASS production dashboard hydration, reload and back',timezoneId,width)
    }
    await context.close()
  }
} finally {
  if(browser)await browser.close()
  if(user)must(await admin.auth.admin.deleteUser(user.id))
  await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),results,disposableUserRemoved:Boolean(user)},null,2))
}
