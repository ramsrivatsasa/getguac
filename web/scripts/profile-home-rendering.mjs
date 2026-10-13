import {chromium} from 'playwright'
import {mkdir,writeFile} from 'node:fs/promises'
import {releaseAccess} from './release-access.mjs'

const variant=process.argv[2]||'baseline'
const selectors={goals:'.goals-carousel,.goals-track',stage:'.flow,.stage',hero:'.hero',posts:'.posts,.post',nav:'.site-head',main:'main'}
const output=`.local/home-render-profile-20261013/${variant}`
const base=process.env.RELEASE_URL||'https://getguac.app',access=await releaseAccess(base)
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true})
try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1.75})
  await page.context().addCookies(access.cookies)
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  if(variant==='visibility-no-reveal')await page.addInitScript(()=>{
    const Original=window.IntersectionObserver
    window.IntersectionObserver=class extends Original {
      observe(target){if(!target.classList.contains('rise'))super.observe(target)}
    }
  })
  const cdp=await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  if(selectors[variant]||['fonts','visibility','visibility-no-reveal','deferred-footer'].includes(variant))await page.route('**/_next/static/css/**',async route=>{
    const response=await route.fetch(),stylesheet=await response.text()
    const css=variant==='deferred-footer'?'footer{content-visibility:auto;contain-intrinsic-block-size:auto 800px}':variant.startsWith('visibility')?'main > section:not(.hero){content-visibility:auto;contain-intrinsic-size:auto 800px}':variant==='fonts'?'*{font-family:Arial,sans-serif!important}':`${selectors[variant]}{display:none!important}`
    await route.fulfill({response,body:stylesheet+'\n'+css})
  })
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750})
  const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve))
  await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline.stack,blink.user_timing',transferMode:'ReturnAsStream'})
  await page.goto(base,{waitUntil:'networkidle'})
  await page.waitForTimeout(1500)
  const metrics=await cdp.send('Performance.getMetrics')
  await cdp.send('Tracing.end')
  const {stream}=await complete
  let trace=''
  for(;;){const chunk=await cdp.send('IO.read',{handle:stream});trace+=chunk.data;if(chunk.eof)break}
  await cdp.send('IO.close',{handle:stream})
  await writeFile(`${output}/trace.json`,trace)
  const events=JSON.parse(trace).traceEvents
  const layout=events.filter(e=>['Layout','UpdateLayoutTree'].includes(e.name)&&e.dur).sort((a,b)=>b.dur-a.dur).slice(0,12)
  const summary={metrics,errors,dom:await page.evaluate(()=>({elements:document.querySelectorAll('*').length,styles:document.styleSheets.length,overflow:document.documentElement.scrollWidth>innerWidth+1,goalsDisplay:getComputedStyle(document.querySelector('.goals-track')).display,sectionVisibility:getComputedStyle(document.querySelector('.core-values')).contentVisibility,mainDisplay:getComputedStyle(document.querySelector('main')).display})),layout:layout.map(e=>({name:e.name,durationMs:e.dur/1000,data:e.args}))}
  await writeFile(`${output}/summary.json`,JSON.stringify(summary,null,2))
  console.log(JSON.stringify({variant,errors,dom:summary.dom,metrics:metrics.metrics.filter(m=>/LayoutDuration|RecalcStyleDuration|ScriptDuration/.test(m.name)),layout:summary.layout.slice(0,3).map(e=>({name:e.name,durationMs:e.durationMs}))},null,2))
}finally{await browser.close()}
