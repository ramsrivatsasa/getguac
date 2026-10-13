import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {chromium} from 'playwright'
import {releaseAccess} from './release-access.mjs'
const production=process.argv.includes('--production')
let cfg
if(production){
 process.loadEnvFile('.env.local')
 cfg={API_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY}
 assert.equal(cfg.API_URL,'https://qchkwojgvfhlbdtpzzig.supabase.co')
}else{
 cfg=JSON.parse(await fs.readFile('.local/supabase.json','utf8'))
 assert(['localhost','127.0.0.1'].includes(new URL(cfg.API_URL).hostname),'Local database only')
}
const db=createClient(cfg.API_URL,cfg.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const base=production?(process.env.RELEASE_URL||'https://getguac.app'):'http://127.0.0.1:3002';const ids=[];let browser
const access=await releaseAccess(base)
const output=production?'.local/article-feedback-production-20261013':'.local/academy-review-20261012'
await fs.mkdir(output,{recursive:true})
async function account(isAdmin=false){const email=`academy-test-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa1!';const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;ids.push(data.user.id);if(isAdmin){const {error:e}=await db.from('profiles').update({is_admin:true}).eq('id',data.user.id);if(e)throw e}const client=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false}});const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;return {id:data.user.id,token:login.data.session.access_token,session:login.data.session}}
async function api(path,token,method='GET',body){const r=await access.fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}}
try{
 const reader=await account(),other=await account(),admin=await account(true)
 const endpoint='/api/articles/fifty-thirty-twenty/feedback'
 assert.equal((await api(endpoint,null,'POST',{action:'react',reaction:1})).status,401)
 assert.equal((await api(endpoint,reader.token,'POST',{action:'react',reaction:9})).status,400)
 const initial=(await api(endpoint)).data
 for(const reaction of [1,1,-1,0]){assert.equal((await api(endpoint,reader.token,'POST',{action:'react',reaction})).status,200);const state=(await api(endpoint,reader.token)).data;assert.equal(state.reaction,reaction);assert.equal(state.likes,initial.likes+(reaction===1?1:0));assert.equal(state.dislikes,initial.dislikes+(reaction===-1?1:0))}
 assert.equal((await api(endpoint,reader.token,'POST',{action:'comment',displayName:'Synthetic QA Reader',body:'<script>alert("test")</script> A synthetic QA test question; removed after verification.'})).status,200)
 const pending=(await api(endpoint,reader.token)).data.pending.find(c=>c.body.includes('synthetic QA'))
 assert(pending);assert(!(await api(endpoint)).data.comments.some(c=>c.id===pending.id));assert(!(await api(endpoint,other.token)).data.pending.some(c=>c.id===pending.id))
 assert.equal((await api('/api/admin/article-comments',reader.token)).status,403)
 assert.equal((await api('/api/admin/article-comments',reader.token,'PATCH',{id:pending.id,status:'approved'})).status,403)
 assert.equal((await api('/api/admin/article-comments',admin.token,'PATCH',{id:pending.id,status:'approved'})).status,200)
 assert((await api(endpoint)).data.comments.some(c=>c.id===pending.id))
 // Direct browser-client writes cannot bypass moderation or change votes.
 const raw=createClient(cfg.API_URL,cfg.ANON_KEY,{global:{headers:{Authorization:`Bearer ${reader.token}`}},auth:{persistSession:false}})
 assert((await raw.from('article_comments').insert({article_slug:'fifty-thirty-twenty',user_id:reader.id,body:'Bypass attempt',status:'approved'})).error)
 for(const table of ['article_comments','article_reactions']){
  assert((await raw.from(table).select('*').limit(1)).error,'Direct member reads must not bypass the API privacy checks')
  const guest=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false}})
  assert((await guest.from(table).select('*').limit(1)).error,'Direct guest reads must not bypass the API privacy checks')
 }
 assert((await raw.from('article_reactions').upsert({article_slug:'fifty-thirty-twenty',user_id:reader.id,reaction:1})).error)
 browser=await chromium.launch({headless:true})
 for(const width of [1440,390]){
  await api(endpoint,reader.token,'POST',{action:'react',reaction:0})
  const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultNavigationTimeout(120000)
  await page.context().addCookies(access.cookies)
  page.on('response',async r=>{if(r.url().includes('/feedback')&&r.request().method()==='POST')console.log('Browser feedback POST:',r.status(),(await r.text()).slice(0,160))})
  await page.route('**/api/articles/**/feedback',route=>route.continue({headers:{...route.request().headers(),Authorization:`Bearer ${reader.token}`}}))
  await page.goto(base+'/articles/how-to-budget-with-the-50-30-20-rule',{waitUntil:'domcontentloaded'})
  await page.getByRole('heading',{name:'Join the conversation'}).scrollIntoViewIfNeeded()
  await page.getByRole('button',{name:/^Like\b/}).click();await page.getByRole('status').filter({hasText:'Reaction saved.'}).waitFor()
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^Like\b/}).waitFor()
  assert.equal(await page.getByRole('button',{name:/^Like\b/}).getAttribute('aria-pressed'),'true')
  await page.getByLabel('Public name',{exact:true}).fill('Synthetic QA reader')
  await page.getByLabel('Comment',{exact:true}).fill(`Synthetic QA UI question at ${width}px - remove after verification.`)
  await page.getByRole('button',{name:'Post comment',exact:true}).click()
  await page.getByRole('status').filter({hasText:'Your comment is awaiting review.'}).waitFor()
  await page.reload({waitUntil:'domcontentloaded'});await page.getByText(`Synthetic QA UI question at ${width}px - remove after verification.`,{exact:true}).waitFor()
  const comment=page.locator('section[aria-label="Reader feedback"] article').filter({hasText:'<script>alert("test")</script>'});await comment.waitFor();assert.equal(await comment.locator('script').count(),0)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:`${output}/${width}-feedback.png`});await page.close()
 }
 const adminContext=await browser.newContext({viewport:{width:1440,height:900}})
 await adminContext.addCookies(access.cookies)
 const cookie='base64-'+Buffer.from(JSON.stringify(admin.session)).toString('base64url')
 const cookieName=`sb-${new URL(cfg.API_URL).hostname.split('.')[0]}-auth-token`
 const chunks=[];for(let i=0;i<cookie.length;i+=3000)chunks.push(cookie.slice(i,i+3000))
 await adminContext.addCookies(chunks.map((value,i)=>({name:chunks.length===1?cookieName:`${cookieName}.${i}`,value,url:base,httpOnly:false,secure:production,sameSite:'Lax'})))
 const adminPage=await adminContext.newPage();adminPage.setDefaultNavigationTimeout(120000)
 await adminPage.goto(base+'/admin/article-comments',{waitUntil:'domcontentloaded'})
 const uiRow=adminPage.locator('article').filter({hasText:'Synthetic QA UI question at 1440px'});await uiRow.waitFor()
 await uiRow.getByRole('button',{name:'Approve',exact:true}).click();await uiRow.waitFor({state:'detached'})
 assert((await api(endpoint)).data.comments.some(c=>c.body.includes('1440px')))
 await adminPage.screenshot({path:`${output}/1440-comment-moderation.png`})
 await adminPage.setViewportSize({width:390,height:900});await adminPage.waitForTimeout(400);const close=adminPage.getByRole('button',{name:'Close navigation',exact:true});const closeBox=await close.boundingBox();if(closeBox&&closeBox.x>=0&&closeBox.x<390)await close.click();await adminPage.getByRole('heading',{name:'Article comments',exact:true}).waitFor();assert(await adminPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await adminPage.screenshot({path:`${output}/390-comment-moderation.png`});await adminContext.close()
 assert.equal((await api('/api/admin/article-comments',admin.token,'PATCH',{id:pending.id,status:'rejected'})).status,200)
 assert(!(await api(endpoint)).data.comments.some(c=>c.id===pending.id))
 console.log('Passed: persistent reactions, comment form/reload, pending privacy, API and browser moderation, RLS, text escaping, desktop/mobile feedback')
 await fs.writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),base,persistentReactions:true,commentReload:true,pendingPrivacy:true,moderation:true,directAccessDenied:true,literalMarkupEscaped:true,widths:[1440,390]},null,2))
}finally{await browser?.close();for(const id of ids){const {error}=await db.auth.admin.deleteUser(id);assert.ifError(error)}}
