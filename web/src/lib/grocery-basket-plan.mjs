const cents = n => Number.isSafeInteger(n) && n >= 0
const TOTAL_LIMIT = 100000000
const day = 86400000

// Pure calculation. The server must substantiate verified retailer evidence;
// this function never searches, guesses prices, saves a choice or books savings.
export function compareGroceryBasket(lines, offers, stores, {now=Date.now(),ttlMs=day}={}) {
  if (!Array.isArray(lines) || lines.length>40 || !Array.isArray(stores) || stores.length>8) throw Error('Compare at most 40 basket items and 8 stores at once.')
  const ids = new Set()
  for (const line of lines) {
    if (!line.id || ids.has(line.id) || !Number.isSafeInteger(line.qty) || line.qty<1 || line.qty>1000) throw Error('Each basket item needs a unique identity and a valid quantity.')
    ids.add(line.id)
  }
  const storeIds=new Set(stores.map(s=>s.id))
  if(storeIds.size!==stores.length)throw Error('Store identities must be unique.')
  const valid = offers.filter(offer=>{
    const line = lines.find(line=>line.id===offer.lineId)
    const timestamp=Date.parse(offer.checkedAt||'')
    let url
    try {url=new URL(offer.sourceUrl)}catch{return false}
    return line && storeIds.has(offer.storeId) && line.specKey && line.specKey===offer.specKey &&
      offer.verified===true && offer.available===true && offer.currency==='USD' && cents(offer.unitCents) && offer.unitCents>0 &&
      Number.isFinite(timestamp) && timestamp<=now && now-timestamp<=ttlMs && url.protocol==='https:' && !url.username && !url.password &&
      offer.locationVerified===true
  })
  const best = (line, allowed) => valid.filter(o=>o.lineId===line.id&&allowed.includes(o.storeId)).sort((a,b)=>a.unitCents-b.unitCents||a.storeId.localeCompare(b.storeId))[0] || null
  const baselineKnown=lines.length>0&&lines.every(l=>cents(l.baselineUnitCents))
  const baselineCents=baselineKnown?lines.reduce((sum,l)=>sum+l.baselineUnitCents*l.qty,0):null
  if(baselineCents>TOTAL_LIMIT)throw Error('Basket amount exceeds the supported comparison limit.')
  function basketFor(storeSet) {
    const selections=lines.map(line=>({lineId:line.id,qty:line.qty,offer:best(line,storeSet.map(s=>s.id))}))
    const priced=selections.filter(s=>s.offer), used=storeSet.filter(s=>priced.some(p=>p.offer.storeId===s.id))
    const listedSubtotalCents=priced.reduce((sum,s)=>sum+s.qty*s.offer.unitCents,0)
    if(listedSubtotalCents>TOTAL_LIMIT)throw Error('Basket amount exceeds the supported comparison limit.')
    const complete=lines.length>0&&priced.length===lines.length
    // Extra costs include travel/delivery, required membership and fees. Null
    // means unconfirmed; zero is allowed only when explicitly confirmed.
    const costsKnown=used.length>0&&used.every(s=>s.extraCostsConfirmed===true&&cents(s.extraCostsCents))
    const extraCostsCents=costsKnown?used.reduce((sum,s)=>sum+s.extraCostsCents,0):null
    const totalCents=complete&&costsKnown?listedSubtotalCents+extraCostsCents:null
    return {storeIds:used.map(s=>s.id),coverage:priced.length,itemCount:lines.length,complete,costsKnown,
      listedSubtotalCents,extraCostsCents,totalCents,
      estimatedSavingsCents:totalCents!==null&&baselineKnown?baselineCents-totalCents:null,
      selections,missingLineIds:selections.filter(s=>!s.offer).map(s=>s.lineId)}
  }
  const singleStores=stores.map(s=>({...basketFor([s]),storeId:s.id}))
    .sort((a,b)=>(a.totalCents??Infinity)-(b.totalCents??Infinity)||b.coverage-a.coverage||a.storeId.localeCompare(b.storeId))
  const bestSingle=singleStores.find(s=>s.complete&&s.costsKnown)||null
  const splits=[]
  for(let i=0;i<stores.length;i++)for(let j=i+1;j<stores.length;j++) {
    const basket=basketFor([stores[i],stores[j]])
    if(basket.storeIds.length===2&&basket.complete&&basket.costsKnown&&basket.estimatedSavingsCents>0&&
      bestSingle&&basket.totalCents<bestSingle.totalCents) splits.push({...basket,extraSavingVersusSingleCents:bestSingle.totalCents-basket.totalCents})
  }
  splits.sort((a,b)=>a.totalCents-b.totalCents||a.storeIds.join().localeCompare(b.storeIds.join()))
  return {baselineCents,singleStores,bestSingle,splitOption:splits[0]||null,verifiedSavingsCents:null,
    basis:'Current verified basket quotes compared with recorded unit prices; estimates are separate from receipt-supported savings.'}
}
