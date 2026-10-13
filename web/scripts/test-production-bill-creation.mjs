import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {mkdir,writeFile} from 'node:fs/promises'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {chromium} from 'playwright'
import {releaseAccess} from './release-access.mjs'

assert(process.argv.includes('--production'))
process.loadEnvFile('.env.local')
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
assert.equal(url,'https://qchkwojgvfhlbdtpzzig.supabase.co')
const base=process.env.RELEASE_URL||'https://getguac.app',access=await releaseAccess(base)
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const must=r=>{assert.ifError(r.error);return r.data}
const credentials={email:`bill-qa-${randomUUID()}@example.test`,password:randomUUID()+'Aa1!'}
const output='.local/bills-production-20261013',checks=[]
await mkdir(output,{recursive:true})
let user,browser
try {
  user=must(await admin.auth.admin.createUser({...credentials,email_confirm:true})).user
  const cookies=[]
  const sb=createServerClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>cookies,setAll:cs=>{for(const c of cs){const i=cookies.findIndex(x=>x.name===c.name);if(i>=0)cookies.splice(i,1);cookies.push(c)}}}})
  must(await sb.auth.signInWithPassword(credentials))
  browser=await chromium.launch({headless:true})
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:950}})
    await context.addCookies([...access.cookies,...cookies.map(c=>({name:c.name,value:c.value,url:base,sameSite:'Lax'}))])
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base+'/bills',{waitUntil:'networkidle'})
    await page.getByRole('button',{name:'Add bill',exact:true}).click()
    const name=`Synthetic QA rent ${width}`
    const date=new Date();date.setUTCDate(date.getUTCDate()+7);const due=date.toISOString().slice(0,10)
    await page.getByPlaceholder('Bill or provider').fill(name)
    await page.getByPlaceholder('Expected amount').fill('1250')
    await page.getByLabel('First due date').fill(due)
    await page.getByLabel('Bill type',{exact:true}).selectOption('rent')
    await page.getByRole('button',{name:'Save bill',exact:true}).click()
    await page.getByRole('status').filter({hasText:`${name} saved. Calendar entries are ready.`}).waitFor()
    const series=must(await admin.from('bill_series').select('id,bill_type,expected_amount').eq('user_id',user.id).eq('name',name).single())
    assert.equal(series.bill_type,'rent');assert.equal(Number(series.expected_amount),1250)
    const cycles=must(await admin.from('bill_cycles').select('id,due_date,expected_amount').eq('bill_series_id',series.id))
    assert.equal(cycles.length,12);assert(cycles.some(c=>c.due_date===due))
    await page.reload({waitUntil:'networkidle'});await page.locator('p').filter({hasText:name}).first().waitFor()
    assert.equal(must(await admin.from('bill_series').select('id').eq('user_id',user.id).eq('name',name)).length,1)
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    assert.deepEqual(errors,[])
    await page.screenshot({path:`${output}/${width}.png`})
    checks.push({width,billType:'rent',cycles:cycles.length,reload:true,noDuplicate:true})
    await context.close();console.log('PASS production synthetic bill create/type/cycles/reload',width)
  }
}finally{
  await browser?.close()
  if(user){must(await admin.from('bill_cycles').delete().eq('user_id',user.id));must(await admin.from('bill_series').delete().eq('user_id',user.id));must(await admin.auth.admin.deleteUser(user.id))}
  await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),base,synthetic:true,checks},null,2))
}
