import assert from 'node:assert/strict'
import {mkdir, writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
import {bootcampTests, bootcampExams} from '../src/lib/bootcamp.js'
import {academySlug} from '../src/lib/academy-titles.mjs'
import {releaseAccess} from './release-access.mjs'

const base = process.env.RELEASE_URL || 'http://127.0.0.1:3002'
const output = process.env.REVIEW_OUTPUT || '.local/bootcamp-final-20261013'
const access = await releaseAccess(base), tests = bootcampTests(), exams = bootcampExams()
assert.equal(tests.length,100);assert.equal(exams.length,13)
await mkdir(output,{recursive:true})
const robots = await (await access.fetch(base+'/robots.txt')).text()
assert(robots.includes('Sitemap: https://getguac.app/money-bootcamp/sitemap.xml'))
const sitemap = await (await access.fetch(base+'/money-bootcamp/sitemap.xml')).text()
const checks=[]
for(const item of [...tests,...exams]) {
  const path='/money-bootcamp/'+(item.trackId&&item.n===undefined?'exam/':'')+item.slug
  const r=await access.fetch(base+path), html=await r.text()
  assert.equal(r.status,200,path);assert(html.includes('bc-q'),path)
  assert(html.includes(`rel="canonical" href="https://getguac.app${path}"`),path)
  assert(sitemap.includes('https://getguac.app'+path),path)
  for(const q of item.questions){assert(q.options.length>=2);assert(q.answer>=0&&q.answer<q.options.length)}
  checks.push({path,status:r.status,questions:item.questions.length})
}
const browser=await chromium.launch({headless:true})
try {
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900}})
    await context.addCookies(access.cookies)
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base+'/academy/lessons',{waitUntil:'networkidle'})
    if(width<1024){await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.locator('#marketing-mobile-nav summary').filter({hasText:'Academy'}).click()}
    else await page.locator('header').getByRole('link',{name:'Academy',exact:true}).first().hover()
    await page.getByRole('link',{name:'Money Bootcamp',exact:true}).first().click()
    await page.waitForURL('**/money-bootcamp')
    await page.goto(base+'/academy/'+academySlug('where-you-stand'),{waitUntil:'networkidle'})
    await page.getByRole('link',{name:/^Take the test/}).click()
    await page.waitForURL('**/money-bootcamp/where-you-stand')
    const test=tests.find(t=>t.slug==='where-you-stand')
    for(let i=0;i<test.questions.length;i++)await page.getByRole('group',{name:`Question ${i+1} options`,exact:true}).getByRole('button').nth(test.questions[i].answer).click()
    await page.locator('.bc-result-pct').filter({hasText:'100%'}).waitFor()
    await page.reload({waitUntil:'networkidle'})
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gg_bootcamp_scores_v1'))['where-you-stand'].best),100)
    await page.goto(base+'/money-bootcamp',{waitUntil:'networkidle'})
    await page.locator('.bc-badge').filter({hasText:'Best 100%'}).first().waitFor()
    await page.evaluate(()=>localStorage.setItem('gg_bootcamp_scores_v1',JSON.stringify({'know-your-money-a-simple-financial-snapshot':{best:89,last:56,attempts:3,at:'2026-10-12'}})))
    await page.reload({waitUntil:'networkidle'})
    await page.locator('.bc-badge').filter({hasText:'Best 89%'}).waitFor()
    await page.screenshot({path:`${output}/hub-${width}.png`})
    await page.locator('a[href="/money-bootcamp/exam/start"]').first().click()
    await page.waitForURL('**/money-bootcamp/exam/start')
    const exam=exams.find(e=>e.slug==='start')
    for(let i=0;i<exam.questions.length;i++)await page.getByRole('group',{name:`Question ${i+1} options`,exact:true}).getByRole('button').nth(exam.questions[i].answer).click()
    await page.locator('.bc-result-pct').filter({hasText:'100%'}).waitFor()
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    await page.screenshot({path:`${output}/exam-${width}.png`})
    await page.goBack({waitUntil:'networkidle'});await page.waitForURL('**/money-bootcamp')
    assert.deepEqual(errors,[])
    await context.close();console.log('PASS Bootcamp lesson/test, save/reload, legacy scores, hub/exam/back',width)
  }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify({checkedAt:new Date().toISOString(),base,checks},null,2))}
