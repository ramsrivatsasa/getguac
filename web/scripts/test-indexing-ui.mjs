import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = 'http://127.0.0.1:3002'
const output = '.local/indexing-ui-20261015'
await mkdir(output,{recursive:true})
const browser = await chromium.launch({headless:true})
const rows = []
try {
  for(const width of [1440,390]) {
    const page = await browser.newPage({viewport:{width,height:900}})
    page.setDefaultNavigationTimeout(120000)
    page.setDefaultTimeout(60000)
    const errors = []
    page.on('pageerror',e=>errors.push(e.message))
    const response = await page.goto(base+'/home/',{waitUntil:'domcontentloaded'})
    assert.equal(response.status(),200)
    assert.equal(new URL(page.url()).pathname,'/')
    await page.goto(base+'/features/understand/guac-ai',{waitUntil:'networkidle'})
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    const action = page.getByRole('link',{name:'Open Guac AI',exact:true}).first()
    assert.equal(await action.getAttribute('href'),'/chat')
    await page.screenshot({path:`${output}/guac-ai-${width}.png`,fullPage:true})
    await action.click()
    await page.waitForURL('**/login')
    await page.goBack({waitUntil:'networkidle'})
    assert.equal(new URL(page.url()).pathname,'/features/understand/guac-ai')
    assert.deepEqual(errors,[])
    rows.push({width,homeAlias:true,chatGuestRedirect:true,back:true,noOverflow:true,noPageErrors:true})
    await page.close()
  }
} finally {await browser.close()}
await writeFile(output+'/results.json',JSON.stringify(rows,null,2))
console.log('PASS desktop/mobile legacy homepage, Guac AI action, guest login, Back and overflow checks')
