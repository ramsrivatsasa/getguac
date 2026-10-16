import nextEnv from '@next/env'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isLoopbackBackend } from '../src/lib/find-your-10/local-boundary.mjs'
nextEnv.loadEnvConfig(process.cwd(), true)
const env = { ...process.env, FIND10_LOCAL_MODE: '1' }
for (const key of Object.keys(env)) {
  if (/SUPABASE|SENTRY|POSTHOG|RESEND|STRIPE|OPENAI|ANTHROPIC|GEMINI|GROQ|GROK|FINNHUB|TAVILY|MIGADU|SERPAPI|SMTP|EMAIL_ENCRYPTION|FIREBASE|UPSTASH/.test(key)) env[key] = ''
}
const local = JSON.parse(readFileSync(new URL('../.local/supabase.json', import.meta.url), 'utf8'))
if (!isLoopbackBackend(local.API_URL)) throw new Error('Only a loopback local Supabase backend is allowed.')
env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = local.ANON_KEY
env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY
env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3002'
env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3002'
const health = await fetch(local.API_URL + '/auth/v1/health', { headers: { apikey: local.ANON_KEY }, signal: AbortSignal.timeout(5000) }).catch(() => null)
if (!health?.ok) throw new Error('Local Supabase is offline. Start WSL Ubuntu and the local database bridge. Refusing to use production.')
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1'
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', host, '-p', '3002'], { env, stdio: 'inherit' })
child.on('exit', code => process.exit(code ?? 0))
