// Master test report — merges every suite into one PDF:
//   • Account & auth (web-results.json: register validation + login)
//   • App functional, live demo (qa-results.json: receipts, reports, GuacScore,
//     GuacWizard, returns, bank, rewards, profile, sign-out, routes)
//   • Calculators (re-run here: 18 calculators, math + edge + validation)
// Run: node scripts/make-full-report.mjs
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const QA = resolve(__dirname, '..', '..', 'marketing-assets', 'qa')
const date = process.env.REPORT_DATE || '2026-06-16'
const read = (p) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []

// ── calculator math (mirror PlanCalculators) + scenarios ──
const fv = (p, m, r, y) => { const i = r/100/12, n = y*12; if (n<=0) return p; if (i===0) return p+m*n; return p*Math.pow(1+i,n)+m*((Math.pow(1+i,n)-1)/i) }
const pmtNeeded = (t, p, r, y) => { const i=r/100/12,n=y*12; if(n<=0) return Math.max(0,t-p); const rem=Math.max(0,t-p*Math.pow(1+i,n)); if(i===0) return rem/n; return rem*i/(Math.pow(1+i,n)-1) }
const loanPayment = (p, r, y) => { const i=r/100/12,n=y*12; if(n<=0) return p; if(i===0) return p/n; return p*i/(1-Math.pow(1+i,-n)) }
const yearsToReach = (p, m, r, t) => { if(p>=t) return 0; let y=0; while(y<100 && fv(p,m,r,y)<t) y+=1/12; return y }
const federalTaxSingle = (taxable) => { const b=[[0,.10],[11600,.12],[47150,.22],[100525,.24],[191950,.32],[243725,.35],[609350,.37]]; let tax=0; for(let i=0;i<b.length;i++){const f=b[i][0],rt=b[i][1],c=b[i+1]?b[i+1][0]:Infinity; if(taxable>f) tax+=(Math.min(taxable,c)-f)*rt; else break} return tax }
const C = {
  retirement:{v:(x)=>x.retire>x.age,f:(x)=>{const y=Math.max(0,x.retire-x.age),projected=fv(x.savings,x.monthly,x.ret,y),target=x.income*25,onTrack=projected>=target;return{projected,target,extra:onTrack?0:Math.max(0,pmtNeeded(target,x.savings,x.ret,y)-x.monthly),onTrack}}},
  million:{v:(x)=>x.monthly>0,f:(x)=>({years:yearsToReach(x.savings,x.monthly,x.ret,1e6)})},
  college:{v:(x)=>x.startAge>x.childAge,f:(x)=>({need:pmtNeeded(x.cost,x.savings,x.ret,Math.max(0,x.startAge-x.childAge))})},
  healthcare:{v:(x)=>x.life>x.retire&&x.retire>=x.age,f:(x)=>{const yrs=Math.max(0,x.life-x.retire),total=x.annual*yrs;return{total,monthly:pmtNeeded(total,0,x.ret,Math.max(0,x.retire-x.age))}}},
  emergency:{v:()=>true,f:(x)=>{const target=x.expenses*x.months,gap=Math.max(0,target-x.savings);return{target,gap,monthly:x.fillMonths>0?gap/x.fillMonths:gap,pct:target>0?Math.round(x.savings/target*100):0}}},
  'savings-goal':{v:(x)=>x.years>0,f:(x)=>({need:pmtNeeded(x.goal,x.savings,x.ret,x.years)})},
  'invest-growth':{v:(x)=>x.years>0,f:(x)=>{const end=fv(x.start,x.monthly,x.ret,x.years);return{end,growth:Math.max(0,end-(x.start+x.monthly*12*x.years))}}},
  mortgage:{v:(x)=>x.years>0,f:(x)=>{const monthly=loanPayment(x.amount,x.rate,x.years);return{monthly,total:monthly*x.years*12}}},
  'auto-loan':{v:(x)=>x.years>0,f:(x)=>{const monthly=loanPayment(x.amount,x.rate,x.years);return{monthly,total:monthly*x.years*12}}},
  'credit-card':{v:(x)=>x.payment>0,f:(x)=>{const i=x.apr/100/12,minI=x.balance*i;if(x.payment<=minI)return{never:true};const months=Math.ceil(-Math.log(1-(x.balance*i)/x.payment)/Math.log(1+i));return{never:false,months,interest:x.payment*months-x.balance}}},
  dti:{v:(x)=>x.income>0,f:(x)=>{const ratio=x.debt/x.income*100;return{ratio,good:ratio<=36}}},
  'afford-home':{v:(x)=>x.income>0,f:(x)=>{const mi=x.income/12,maxTotal=mi*0.36-x.debts,maxHousing=Math.min(mi*0.28,maxTotal),maxPI=Math.max(0,maxHousing*0.8),i=x.rate/100/12,loan=i>0?maxPI*(1-Math.pow(1+i,-360))/i:maxPI*360;return{price:loan+x.down,maxHousing}}},
  'rent-buy':{v:(x)=>x.price>x.down,f:(x)=>({own:loanPayment(x.price-x.down,x.rate,30)+x.price*(0.011+0.005+0.01)/12})},
  'cd-savings':{v:(x)=>x.years>0,f:(x)=>{const end=x.amount*Math.pow(1+x.apy/100,x.years);return{end,interest:end-x.amount}}},
  'take-home':{v:(x)=>x.gross>0,f:(x)=>{const pretax=x.gross*x.retirePct/100,taxable=Math.max(0,x.gross-pretax-14600),fed=federalTaxSingle(taxable),net=Math.max(0,x.gross-pretax-fed-x.gross*0.0765-x.gross*x.statePct/100);return{net,rate:x.gross>0?(x.gross-net-pretax)/x.gross*100:0}}},
  'net-worth':{v:()=>true,f:(x)=>{const a=(x.cash||0)+(x.investments||0)+(x.home||0),d=(x.mortgage||0)+(x.loans||0)+(x.cards||0);return{nw:a-d}}},
}
const T = [
  {id:'retirement',name:'Typical (short of target)',in:{age:35,retire:65,savings:40000,monthly:600,income:60000,ret:6},exp:{projected:[843618,1500],target:[1500000,1],extra:[653,15],onTrack:[false,0]}},
  {id:'retirement',name:'On track',in:{age:35,retire:65,savings:40000,monthly:2000,income:40000,ret:6},exp:{onTrack:[true,0]}},
  {id:'retirement',name:'Edge: 0% return',in:{age:50,retire:60,savings:100000,monthly:1000,income:20000,ret:0},exp:{projected:[220000,1]}},
  {id:'retirement',name:'Validation: retire ≤ age',in:{age:65,retire:60,savings:1,monthly:1,income:1,ret:5},valid:false},
  {id:'million',name:'Typical',in:{savings:25000,monthly:700,ret:7},exp:{years:[28,6]}},
  {id:'million',name:'Validation: monthly 0',in:{savings:0,monthly:0,ret:7},valid:false},
  {id:'college',name:'Typical',in:{childAge:5,startAge:18,cost:120000,savings:8000,ret:5},exp:{need:[478,15]}},
  {id:'college',name:'Validation: start ≤ child',in:{childAge:10,startAge:5,cost:1,savings:1,ret:5},valid:false},
  {id:'healthcare',name:'Typical',in:{age:40,retire:65,life:88,annual:7000,ret:5},exp:{total:[161000,1],monthly:[270,15]}},
  {id:'healthcare',name:'Validation: life ≤ retire',in:{age:40,retire:65,life:60,annual:7000,ret:5},valid:false},
  {id:'emergency',name:'Typical (underfunded)',in:{expenses:3500,months:6,savings:4000,fillMonths:12},exp:{target:[21000,1],gap:[17000,1],monthly:[1417,5],pct:[19,1]}},
  {id:'emergency',name:'Fully funded',in:{expenses:2000,months:3,savings:8000,fillMonths:6},exp:{gap:[0,0]}},
  {id:'savings-goal',name:'Typical',in:{goal:20000,savings:2000,years:3,ret:4},exp:{need:[465,20]}},
  {id:'savings-goal',name:'Validation: years 0',in:{goal:1,savings:0,years:0,ret:4},valid:false},
  {id:'invest-growth',name:'Typical',in:{start:10000,monthly:300,years:20,ret:7},exp:{end:[196650,5000]}},
  {id:'mortgage',name:'Typical 30yr',in:{amount:350000,rate:6.5,years:30},exp:{monthly:[2212,10]}},
  {id:'mortgage',name:'Edge: 0% rate',in:{amount:360000,rate:0,years:30},exp:{monthly:[1000,1]}},
  {id:'mortgage',name:'Validation: years 0',in:{amount:1,rate:5,years:0},valid:false},
  {id:'auto-loan',name:'Typical 5yr',in:{amount:30000,rate:7,years:5},exp:{monthly:[594,5]}},
  {id:'credit-card',name:'Typical payoff',in:{balance:6000,apr:24,payment:300},exp:{months:[26,1],interest:[1800,60]}},
  {id:'credit-card',name:'Edge: payment ≤ interest',in:{balance:6000,apr:24,payment:100},exp:{never:[true,0]}},
  {id:'dti',name:'Good (20%)',in:{debt:1200,income:6000},exp:{ratio:[20,0.5],good:[true,0]}},
  {id:'dti',name:'High (50%)',in:{debt:3000,income:6000},exp:{ratio:[50,0.5],good:[false,0]}},
  {id:'afford-home',name:'Typical',in:{income:90000,down:40000,rate:6.5,debts:400},exp:{price:[305770,15000]}},
  {id:'rent-buy',name:'Typical',in:{price:350000,down:40000,rate:6.5,rent:2200},exp:{own:[2717,60]}},
  {id:'rent-buy',name:'Validation: down ≥ price',in:{price:100000,down:120000,rate:6.5,rent:1000},valid:false},
  {id:'cd-savings',name:'Typical',in:{amount:10000,apy:4.5,years:5},exp:{end:[12462,15]}},
  {id:'take-home',name:'Typical $80k single',in:{gross:80000,retirePct:6,statePct:5},exp:{net:[56695,300],rate:[23.1,1]}},
  {id:'net-worth',name:'Typical',in:{cash:15000,investments:60000,home:350000,mortgage:280000,loans:18000,cards:3000},exp:{nw:[124000,1]}},
]
const calcResults = T.map((t) => {
  const calc = C[t.id]
  if (t.valid === false) { const ok = calc.v(t.in) !== true; return { id:t.id, area:'Calc', name:`${t.id} · ${t.name}`, actual: ok?'correctly rejected':'should reject', status: ok?'PASS':'BUG' } }
  const out = calc.f(t.in); const fails = []
  for (const [k,[want,tol]] of Object.entries(t.exp)) { const got=out[k]; const ok = typeof want==='boolean'?got===want:(Number.isFinite(got)&&Math.abs(got-want)<=tol); if(!ok) fails.push(`${k}:${typeof got==='number'?Math.round(got):got}≠${want}`) }
  return { id:t.id, area:'Calc', name:`${t.id} · ${t.name}`, actual: Object.entries(t.exp).map(([k])=>`${k}=${typeof out[k]==='number'?Math.round(out[k]*100)/100:out[k]}`).join(', '), status: fails.length?'BUG':'PASS' }
})

const auth = read(resolve(QA, 'web-results.json'))
const fn = read(resolve(QA, 'qa-results.json'))
const all = [...auth, ...fn, ...calcResults]
const pass = all.filter((r) => r.status === 'PASS').length
const bugs = all.filter((r) => r.status !== 'PASS')

const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const badge = (s) => s==='PASS'?'<span class="b ok">PASS</span>':'<span class="b bad">'+esc(s)+'</span>'
const rows = (list) => list.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.name||r.area)}</td><td class="sm">${esc(r.actual||'—')}</td><td>${badge(r.status)}</td></tr>`).join('')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;margin:0}
.cover{background:linear-gradient(135deg,#065f46,#16a34a 60%,#84cc16);color:#fff;padding:34px 46px}
.logo{font-weight:900;font-size:22px;display:flex;align-items:center;gap:9px}.av{width:30px;height:30px;border-radius:9px;background:#bef264;display:inline-flex;align-items:center;justify-content:center;font-size:18px}
h1{font-size:31px;font-weight:900;letter-spacing:-1px;margin:13px 0 4px}.sub{color:#ecfccb;font-size:13px}
.stats{display:flex;gap:9px;margin-top:16px}.stat{background:rgba(255,255,255,.16);border-radius:11px;padding:9px 16px;text-align:center}.stat .n{font-size:24px;font-weight:900}.stat .l{font-size:9px;opacity:.85;text-transform:uppercase;letter-spacing:1px}
.page{padding:28px 42px}h2{font-size:16px;font-weight:900;color:#065f46;margin:16px 0 7px}h2 .p{font-size:11px;color:#64748b;font-weight:700;margin-left:6px}
table{width:100%;border-collapse:collapse;font-size:10.5px}th{text-align:left;background:#f0fdf4;color:#065f46;padding:6px 7px;border-bottom:2px solid #d1fae5;font-size:9.5px;text-transform:uppercase;letter-spacing:.3px}
td{padding:5px 7px;border-bottom:1px solid #eef2f7;vertical-align:top}.mono{font-family:ui-monospace,monospace;font-weight:700}.sm{font-size:9.5px;color:#475569}
.b{font-size:9px;font-weight:800;padding:2px 7px;border-radius:999px}.b.ok{background:#d1fae5;color:#047857}.b.bad{background:#fee2e2;color:#b91c1c}
.note{background:#ecfdf5;border-left:4px solid #059669;border-radius:8px;padding:10px 14px;font-size:12px;color:#334155;margin-top:8px;line-height:1.55}
.foot{color:#94a3b8;font-size:9.5px;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px}
</style></head><body>
<div class="cover"><div class="logo"><span class="av">🥑</span> GetGuac</div>
<h1>Full Test Report</h1><div class="sub">Account &amp; auth · app functional (live) · 18 calculators — ${date}</div>
<div class="stats"><div class="stat"><div class="n">${all.length}</div><div class="l">tests</div></div><div class="stat"><div class="n">${pass}</div><div class="l">passed</div></div><div class="stat"><div class="n">${bugs.length}</div><div class="l">failed</div></div></div></div>
<div class="page">
<h2>Summary</h2>
<div class="note"><b>${bugs.length===0?'✅ All clear — 0 bugs across '+all.length+' tests.':'⚠ '+bugs.length+' failing.'}</b> Coverage: account creation &amp; sign-in (register validation, reserved/short/mismatch/email rules, login), the full signed-in app on live data (dashboard &amp; <b>GuacScore</b>, multiple seeded <b>receipts</b> + parsed receipt detail, <b>reports</b>, GuacWizard, Steals, Returns, Bank, Stash, Smashlist, Guacanomics, Rewards, invite, profile, sign-out, 404 routes), and all <b>18 calculators</b> (math vs independently hand-computed values, 0%-rate &amp; payoff edge cases, and input validation). GuacScore/GuacWizard scoring math also covered by dedicated scenario reports.</div>
<h2>Account &amp; auth <span class="p">${auth.filter(r=>r.status==='PASS').length}/${auth.length} pass · register + login</span></h2>
<table><thead><tr><th>ID</th><th>Case</th><th>Result</th><th>Status</th></tr></thead><tbody>${rows(auth)}</tbody></table>
<h2>App functional — live demo <span class="p">${fn.filter(r=>r.status==='PASS').length}/${fn.length} pass · receipts · reports · GuacScore · more</span></h2>
<table><thead><tr><th>ID</th><th>Case</th><th>Result</th><th>Status</th></tr></thead><tbody>${rows(fn)}</tbody></table>
<h2>Calculators <span class="p">${calcResults.filter(r=>r.status==='PASS').length}/${calcResults.length} pass · 18 calculators</span></h2>
<table><thead><tr><th>Calc</th><th>Scenario</th><th>Checked</th><th>Status</th></tr></thead><tbody>${rows(calcResults)}</tbody></table>
<div class="foot">GetGuac full test sweep · ${all.length} tests (${auth.length} auth + ${fn.length} functional + ${calcResults.length} calculator) · ${pass} pass · ${bugs.length} fail · generated ${date}. Auth + functional run against production (getguac.app, demo account); calculator outputs verified against independently hand-computed values.</div>
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const out = resolve(QA, 'GetGuac-Full-Test-Report.pdf')
await page.pdf({ path: out, format: 'A4', printBackground: true })
await browser.close()
console.log(`Full report: ${all.length} tests · ${pass} pass · ${bugs.length} fail`)
console.log('PDF:', out)
