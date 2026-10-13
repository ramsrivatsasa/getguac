import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {isLoopbackBackend} from './find-your-10/local-boundary.mjs'

// Server-only credentials. Local development never borrows production secrets.
export async function tavilySearchKey({env=process.env,read=readFile,cwd=process.cwd()}={}) {
  if(env.FIND10_LOCAL_MODE!=='1')return env.TAVILY_API_KEY?.trim()||''
  if(!isLoopbackBackend(env.NEXT_PUBLIC_SUPABASE_URL))throw Error('Local Tavily search requires local Supabase.')
  try {
    const config=JSON.parse(await read(join(cwd,'.local','tavily-key.json'),'utf8'))
    return config.enabled===true&&typeof config.apiKey==='string'?config.apiKey.trim():''
  }catch(error){if(error.code==='ENOENT')return '';throw Error('Local Tavily configuration is invalid.')}
}

export async function tavilySearch(query,{key=tavilySearchKey,request=fetch,timeoutMs=12000,domains=[]}={}) {
  const apiKey=await key()
  if(!apiKey)throw Error('Tavily search is not configured')
  const response=await request('https://api.tavily.com/search',{
    method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({query:String(query).slice(0,400),search_depth:'basic',max_results:5,
      include_answer:false,include_raw_content:false,auto_parameters:false,include_domains:domains,include_usage:true}),
    signal:AbortSignal.timeout(timeoutMs),
  })
  if(!response.ok)throw Error(`Tavily search HTTP ${response.status}`)
  const data=await response.json()
  if(!Array.isArray(data.results))throw Error('Invalid Tavily search response')
  return data.results.map(({title,url,content})=>({title:String(title||''),url:String(url||''),content:String(content||'')}))
}
