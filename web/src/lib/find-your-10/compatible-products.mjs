import {recordedModel} from './product-identity.mjs'

// Researched product identities, not fixed prices or synthetic purchases.
// Installation matches remain review-only: model, dimensions and terms differ.
export const compatibleProducts=[{
 baselineModel:'B2515LF-PPU-ECO',model:'B2511LF-PPU-12',
 url:'https://www.prairiegrit.com/product/delta-b2511lf-ppu-12-foundations-4-in-centerset-double-handle-bathroom-faucet-in-polished-chrome',
 title:'Delta Foundations Centerset Faucet',store:'PrairieGrit · Warehouse Wonders',currency:'USD',
 sources:['https://www.deltafaucet.com/bathroom/product/B2515LF-PPU-ECO.html','https://www.deltafaucet.com/bathroom/product/B2511LF-PPU-12.html'],
 specificationsCheckedAt:'2026-10-04',
}]
export const compatibilityVersion=group=>compatibleProducts.some(p=>p.baselineModel===recordedModel(group))?'installation-review-v1':''
const clean=s=>String(s).replace(/\*\*/g,'').trim()
export function extractedCompatibleProduct(content,product,now=new Date()) {
 const text=String(content||''),start=text.indexOf('\n# '),body=start>=0?text.slice(start):text
 const header=body.match(/^#\s+([^\n]+)/m)?.[1]||''
 if(!header.includes(product.model))return null
 const lead=body.split(/###\s+(?:\[?Description|About This Product)/i)[0]
 if(/out of stock|sold out|unavailable/i.test(lead)||!/^In stock\s*$/mi.test(lead))return null
 const price=Number(lead.match(/^\$(\d[\d,]*\.\d{2})(?:\s|$)/m)?.[1]?.replace(/,/g,''))
 if(!Number.isFinite(price)||price<=0)return null
 const specs=Object.fromEntries([...body.matchAll(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*$/gm)].map(m=>[clean(m[1]),clean(m[2])]))
 if(specs.Model!==product.model||specs.Brand!=='Delta'||specs['Faucet Hole Fit']!=='3'||specs['Installation Type']!=='4 in. Centerset'||specs['Color/Finish']!=='Polished Chrome'||specs['Number of Faucet Handles']!=='2'||specs['Drain Kit Included']!=='Drain Kit Included'||specs['Flow rate (gallons per minute)']!=='1.2 GPM')return null
 // Unknown condition, shipping and warranty are explicit; never infer New.
 const image=body.match(/!\[[^\]]*\]\((https:\/\/www\.prairiegrit\.com\/wp-content\/[^)]+)\)/)?.[1]
 return {title:product.title,model:product.model,store:product.store,url:product.url,price,image,condition:'unknown',available:true,
  retailerVerification:'verified-extract',retailerCheckedAt:new Date(now).toISOString(),retailerSourceUrl:product.url,
  compatibilityEvidence:{model:product.model,mounting:'3-hole 4-inch centerset',finish:'polished chrome',handles:2,drain:true,flowGpm:1.2,
   manufacturerWarranty:/No Manufacturer Warranty/.test(body)?false:null,shippingCents:null,condition:'unknown'}}
}
export function compatibleReviewOption(offer,group,now=new Date()) {
 const product=compatibleProducts.find(p=>p.baselineModel===recordedModel(group)&&p.model===offer.model&&(offer.url||offer.sourceUrl)===p.url)
 const e=offer.compatibilityEvidence,checked=Date.parse(offer.retailerCheckedAt)
 if(!product||offer.retailerVerification!=='verified-extract'||offer.available!==true||!Number.isFinite(checked)||checked>+now||+now-checked>=86400000||e?.model!==product.model||e.mounting!=='3-hole 4-inch centerset'||e.finish!=='polished chrome'||e.handles!==2||e.drain!==true||e.flowGpm!==1.2)return null
 const latest=[...group.rows].sort((a,b)=>b.receipts.date.localeCompare(a.receipts.date))[0]
 const baseline=Math.round(latest.price/latest.qty*100),price=Math.round(Number(offer.price)*100)
 if(!Number.isInteger(price)||price<=0||price>=baseline)return null
 return {key:`quote:${product.url}`,choice:product.title,model:product.model,store:product.store,image:offer.image,sourceLabel:'Product',sourceUrl:product.url,
  checkedAt:new Date(checked).toISOString(),expiresAt:new Date(checked+86400000).toISOString(),condition:'unknown',available:true,
  retailerVerification:'verified-extract',retailerCheckedAt:new Date(checked).toISOString(),retailerSourceUrl:product.url,compatibilityEvidence:e,
  compatibilitySources:product.sources,matchKind:'Similar alternative · different model',reviewOnly:true,needsPrice:false,
  alternativeCents:price,listedDifferenceCents:baseline-price,estimateCents:0,basis:'listed price difference; purchase terms need review',
  tradeoff:`Same 3-hole, 4-inch centerset mounting, chrome finish, two handles, drain and 1.2 GPM. Different model and dimensions; sink clearance is not verified. Condition and outgoing shipping cost are unconfirmed. ${e.manufacturerWarranty===false?'No manufacturer warranty; seller lists a 30-day guarantee.':'Manufacturer warranty is unconfirmed.'} No savings or purchase task counted.`}
}
