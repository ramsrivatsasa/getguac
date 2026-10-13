import {CASH_OPTIONS} from './cash-options.mjs'
import {CD_OPTIONS} from './cd-options.mjs'
const supported=new Set(['bask-savings','everbank-savings','liveoak-savings',...CD_OPTIONS.map(o=>o.id)])
export function depositText(html){return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&(?:reg|trade|copy);/gi,' ').replace(/\s+/g,' ').trim()}
export function extractDepositRate(option,html){
 const text=depositText(html)
 let matches=[]
 if(option.id==='everbank-savings')matches=[...text.matchAll(/New accounts earn a\s+(\d+(?:\.\d+)?)\s*%\s*APY/gi)]
 else if(option.id==='bask-savings')matches=[...text.matchAll(/Earn\s+(\d+(?:\.\d+)?)\s*%\s*Annual Percentage Yield/gi)]
 else if(option.id==='liveoak-savings')matches=[...text.matchAll(/Personal High-Yield Savings Calculator\s+(\d+(?:\.\d+)?)\s*%\s*APY/gi)]
 else if(option.id.startsWith('marcus-cd-'))matches=[...text.matchAll(new RegExp(`${option.termMonths} months\\s+High-Yield CD\\s+(\\d+(?:\\.\\d+)?)%\\s+\\$500`,'gi'))]
 else if(option.id.startsWith('bask-cd-'))matches=[...text.matchAll(new RegExp(`${option.termMonths} Months\\s+\\d+(?:\\.\\d+)?%?\\s+(\\d+(?:\\.\\d+)?)%?\\s+Open Account`,'gi'))]
 const rates=[...new Set(matches.map(m=>Number(m[1]).toFixed(2)))]
 if(rates.length!==1||Number(rates[0])<=0||Number(rates[0])>25)return null
 return rates[0]
}
// Called by the existing plan agent. Requests contain public URLs only, no user records.
export async function refreshDepositQuotes({previous={},now=new Date(),fetcher=fetch}={}){
 const quotes={...previous},options=[...CASH_OPTIONS,...CD_OPTIONS].filter(o=>supported.has(o.id))
 const pending=options.filter(o=>!quotes[o.id]?.checkedAt||+now-Date.parse(quotes[o.id].checkedAt)>86400000)
 await Promise.all([...new Set(pending.map(o=>o.url))].map(async url=>{
  try{
   const response=await fetcher(url,{signal:AbortSignal.timeout(7000),redirect:'error',headers:{Accept:'text/html'}})
   if(!response.ok)return
   const html=await response.text();if(html.length>3000000)return
   for(const o of pending.filter(o=>o.url===url)){const apy=extractDepositRate(o,html);if(apy)quotes[o.id]={apy,url,checkedAt:new Date(now).toISOString()}}
  }catch{/* Keep the old timestamp. Unreadable sources never become freshly verified. */}
 }))
 return quotes
}
