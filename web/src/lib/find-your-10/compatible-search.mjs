import {tavilySearchKey} from '../tavily-search.mjs'
import {recordedModel} from './product-identity.mjs'
import {compatibleProducts,extractedCompatibleProduct} from './compatible-products.mjs'

export async function searchCompatibleProducts(group,{key=tavilySearchKey,request=fetch,now=new Date()}={}) {
 const leads=compatibleProducts.filter(p=>p.baselineModel===recordedModel(group))
 if(!leads.length)return []
 const apiKey=await key();if(!apiKey)return []
 const response=await request('https://api.tavily.com/extract',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
  body:JSON.stringify({urls:leads.map(p=>p.url),extract_depth:'basic',format:'markdown'}),signal:AbortSignal.timeout(12000)})
 if(!response.ok)throw Error('Compatible retailer lookup unavailable')
 const data=await response.json()
 if(!Array.isArray(data.results)||!data.results.length&&data.failed_results?.length)throw Error('Compatible retailer lookup unavailable')
 return data.results.flatMap(result=>{const lead=leads.find(p=>p.url===result.url);const offer=lead&&extractedCompatibleProduct(result.raw_content,lead,now);return offer?[offer]:[]})
}
