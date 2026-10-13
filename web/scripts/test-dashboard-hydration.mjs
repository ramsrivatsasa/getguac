import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServerClient} from '@supabase/ssr'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
const config=JSON.parse(await readFile('.local/supabase.json','utf8'))
assert.match(config.API_URL,/^http:\/\/(127\.0\.0\.1|localhost):/)
const account=JSON.parse(await readFile('.local/find10-account.json','utf8')), cookies=[]
const sb=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>{for(const c of values){const i=cookies.findIndex(x=>x.name===c.name);if(i>=0)cookies.splice(i,1);cookies.push(c)}}}})
const {error}=await sb.auth.signInWithPassword({email:account.email,password:account.password});if(error)throw error
const base='http://127.0.0.1:3002', output='.local/dashboard-hydration'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true}), results=[]
try {
 for(const timezoneId of ['UTC','America/New_York','America/Los_Angeles']){
  const context=await browser.newContext({timezoneId,viewport:{width:1440,height:1000}})
  await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:base,sameSite:'Lax'})))
  await context.addInitScript(()=>{localStorage.setItem('sidebarCollapsed','true');localStorage.setItem('spendingPeriod','yearly');localStorage.setItem('spendingPeriodCount','3')})
  const page=await context.newPage(), errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'&&/hydration|did not match|server render|webpack_modules|ChunkLoadError|418/i.test(m.text()))errors.push(m.text())})
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000})
   const response=await page.goto(base+'/dashboard',{waitUntil:'networkidle',timeout:60000})
   await page.waitForFunction(()=>document.body.innerText.includes('Last 3 years'),{},{timeout:30000})
   const text=await page.locator('body').innerText()
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,period:localStorage.getItem('spendingPeriod'),count:localStorage.getItem('spendingPeriodCount')}))
   const result={timezoneId,width,status:response.status(),path:new URL(page.url()).pathname,...state,errors:[...errors]};results.push(result)
   await page.screenshot({path:`${output}/${timezoneId.replaceAll('/','-')}-${width}.png`,fullPage:true,caret:'initial'})
   assert.equal(result.path,'/dashboard',text.slice(0,200));assert.equal(result.status,200)
   assert.ok(!/records could not be loaded|This page could not load/.test(text),text.slice(0,200))
   assert.deepEqual(errors,[]);assert.equal(state.overflow,false);assert.equal(state.period,'yearly');assert.equal(state.count,'3')
   console.log('PASS signed-in dashboard',timezoneId,width)
  }
  await context.close()
 }
} finally {await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));await browser.close()}
