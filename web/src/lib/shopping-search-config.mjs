import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {isLoopbackBackend} from './find-your-10/local-boundary.mjs'
import {tavilySearchKey} from './tavily-search.mjs'

// The local app may use an explicitly supplied search credential, never a
// production database or unrelated production secrets. Read on demand so
// configuring search does not require restarting the local runtime.
export async function shoppingSearchKey({env=process.env,read=readFile,cwd=process.cwd()}={}) {
  if(env.FIND10_LOCAL_MODE!=='1')return env.SERPAPI_KEY?.trim()||''
  if(!isLoopbackBackend(env.NEXT_PUBLIC_SUPABASE_URL))throw Error('Local shopping search requires local Supabase.')
  let config
  try {config=JSON.parse(await read(join(cwd,'.local','shopping-search.json'),'utf8'))}
  catch(error){if(error.code==='ENOENT')return '';throw Error('Local shopping search configuration is invalid.')}
  return config.enabled===true&&typeof config.serpApiKey==='string'?config.serpApiKey.trim():''
}
export async function shoppingSearchConfigured(){return Boolean(await shoppingSearchKey())||Boolean(await tavilySearchKey())}
