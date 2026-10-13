import https from 'node:https'
import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import {sameMeasurements} from './product-measurements.mjs'
import {sameApparelSize} from './apparel-size.mjs'
import {offerCondition} from './offer-condition.mjs'
import {packSize} from './filter-match.mjs'

export function publicRetailerAddress(address) {
  if(isIP(address)!==4)return false
  const [a,b]=address.split('.').map(Number)
  return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19)))
}
// Pin DNS to a public address for each hop; never fetch loopback/private targets.
export async function retailerHtml(raw,{timeoutMs=8000,maxBytes=2_000_000}={}) {
  const deadline=Date.now()+timeoutMs
  for(let hop=0;hop<4;hop++) {
    const url=new URL(raw)
    if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw Error('Unsupported retailer URL')
    const addresses=await Promise.race([lookup(url.hostname,{all:true,family:4}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Retailer DNS timeout')),Math.max(1,deadline-Date.now()));timer.unref?.()})])
    if(!addresses.length||addresses.some(a=>!publicRetailerAddress(a.address)))throw Error('Unsupported retailer address')
    const result=await new Promise((resolve,reject)=>{
      const request=https.get(url,{headers:{Accept:'text/html','User-Agent':'GetGuac/1.0 (product offer verification)'},lookup:(_host,options,callback)=>callback(null,options.all?[addresses[0]]:addresses[0].address,4)},response=>{
        if([301,302,303,307,308].includes(response.statusCode)&&response.headers.location){response.resume();resolve({redirect:new URL(response.headers.location,url).href});return}
        if(response.statusCode!==200||!String(response.headers['content-type']).includes('text/html')){response.resume();reject(Error('Retailer page unavailable'));return}
        let size=0;const chunks=[]
        response.on('data',chunk=>{size+=chunk.length;if(size>maxBytes)request.destroy(Error('Retailer page too large'));else chunks.push(chunk)})
        response.on('end',()=>resolve({html:Buffer.concat(chunks).toString('utf8'),url:url.href}));response.on('error',reject)
      })
      const timer=setTimeout(()=>request.destroy(Error('Retailer timeout')),Math.max(1,deadline-Date.now()))
      request.on('close',()=>clearTimeout(timer));request.on('error',reject)
    })
    if(!result.redirect)return result
    raw=result.redirect
  }
  throw Error('Too many retailer redirects')
}
const typeIs=(value,type)=>[].concat(value?.['@type']||[]).some(t=>String(t).split('/').pop()===type)
const words=s=>String(s||'').toLowerCase().match(/[a-z0-9]+/g)||[]
export function retailerOfferEvidence(html,listing,now=new Date()) {
  const products=[]
  function visit(value){if(!value||typeof value!=='object')return;if(typeIs(value,'Product'))products.push(value);for(const child of Object.values(value))if(typeof child==='object')if(Array.isArray(child))child.forEach(visit);else visit(child)}
  for(const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(script[1]))}catch{/* Missing/invalid data is not verification. */}
  const tokens=words(listing.title),matches=products.filter(p=>tokens.length&&tokens.filter(t=>words(p.name).includes(t)).length>=Math.ceil(tokens.length*.75)&&tokens.filter(t=>/\d/.test(t)).every(t=>words(p.name).includes(t))&&packSize(listing.title)===packSize(p.name)&&sameMeasurements(listing.title,p.name)&&sameApparelSize(listing.title,p.name))
  if(matches.length!==1)return null
  const product=matches[0],offers=[].concat(product.offers||[]).filter(o=>typeIs(o,'Offer'))
  // A range/aggregate or multiple variants cannot substantiate one seller's price.
  if(offers.length!==1)return null
  const offer=offers[0],price=Number(offer.price)
  if(offer.priceCurrency!=='USD'||!Number.isFinite(price)||price<=0||offer.priceValidUntil&&new Date(offer.priceValidUntil+'T23:59:59Z')<now)return null
  if(offer.url){try{const a=new URL(offer.url,listing.url),b=new URL(listing.url);if(a.hostname!==b.hostname||a.pathname.replace(/\/$/,'')!==b.pathname.replace(/\/$/,''))return null}catch{return null}}
  const condition=offerCondition({condition:offer.itemCondition||product.itemCondition})
  const availability=String(offer.availability||'').split('/').pop()
  return {price,condition,model:typeof product.model==='string'?product.model:typeof product.mpn==='string'?product.mpn:'',available:availability==='InStock'?true:['OutOfStock','Discontinued','SoldOut','PreOrder','BackOrder'].includes(availability)?false:null,
    retailerCheckedAt:now.toISOString(),retailerVerification:'verified',retailerSourceUrl:listing.url}
}
export async function enrichRetailerOffer(listing,{read=retailerHtml,now=new Date()}={}) {
  try {
    const page=await read(listing.url),evidence=retailerOfferEvidence(page.html,listing,now)
    if(!evidence)return {...listing,retailerVerification:'unverified'}
    return {...listing,...evidence,condition:offerCondition(listing)==='pre-owned'?'pre-owned':evidence.condition==='unknown'?listing.condition:evidence.condition}
  }catch{return {...listing,retailerVerification:'unavailable'}}
}
