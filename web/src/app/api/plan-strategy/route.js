// POST /api/plan-strategy  { calc, inputs }  →  Guac-AI strategy for a goal.
//
// Generates personalized, motivating strategies + current US tax-advantaged
// account benefits (401k / IRA / HSA / 529 as relevant) + pros/cons for the
// Plan calculators. "Auto-updates" because the model reasons from its latest
// knowledge of the tax code rather than hardcoded text. US-default (we omit
// country-specific branching). Cached cross-user + IP-rate-limited so it stays
// cheap; the calculators fall back to built-in guidance if this is unavailable.

import { rateLimit, rateKey } from '../../../lib/apiGuard'
import { getCachedSearch, setCachedSearch } from '../../../lib/shoppingCache'

export const runtime = 'nodejs'
export const maxDuration = 30

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const GOALS = {
  retirement: 'saving for retirement',
  college: "saving for a child's college",
  healthcare: 'saving for healthcare costs in retirement',
  emergency: 'building an emergency fund',
}

function extractJson(text) {
  if (!text) return null
  try { return JSON.parse(text) } catch { /* fall through */ }
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)) } catch { /* */ } }
  return null
}

export async function POST(request) {
  const rl = await rateLimit(rateKey(request, 'plan-strategy'), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return Response.json({ error: `Too many requests. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const calc = String(body?.calc || '').slice(0, 40)
  const inputs = body?.inputs && typeof body.inputs === 'object' ? body.inputs : {}
  // `goal` lets any calculator (not just the original four) describe its topic.
  const goal = String(body?.goal || GOALS[calc] || 'reaching a financial goal').slice(0, 140)
  if (!calc) return Response.json({ error: 'unknown calculator' }, { status: 400 })

  // Round inputs so near-identical plans share a cache entry.
  const rounded = {}
  for (const [k, v] of Object.entries(inputs)) rounded[k] = Number.isFinite(Number(v)) ? Math.round(Number(v)) : v
  const cacheKey = `planai:${calc}:${JSON.stringify(rounded)}`
  const cached = await getCachedSearch(cacheKey)
  if (cached) return Response.json({ ...cached, _cache: 'hit' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return Response.json({ error: 'Guac-AI is not configured.' }, { status: 503 })

  const prompt = `You are Guac-AI, GetGuac's friendly, sharp money strategist. A US user is working on: ${goal}.
Their numbers: ${JSON.stringify(rounded)}.

Give concrete, encouraging, actionable guidance. Use the LATEST US tax rules and current-year contribution limits you know for the accounts that fit this goal (401(k) incl. employer match + catch-up, Traditional/Roth IRA, HSA, 529). Be specific with dollar limits and percentages. Motivate them to start or keep saving — warm but not preachy. One short sentence per item.

Return STRICT JSON only (no markdown), exactly this shape:
{
  "strategies": ["3-4 short actionable strings, each beginning with a fitting emoji"],
  "taxBenefits": ["2-3 short strings naming the account + its current contribution limit/benefit"],
  "pros": ["3-4 short pros"],
  "cons": ["3-4 short watch-outs"],
  "encouragement": "one short motivating sentence"
}`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
      }),
    })
    if (!res.ok) throw new Error(`Gemini ${res.status}`)
    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = extractJson(text)
    if (!parsed) throw new Error('unparseable')

    const arr = (x, n) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()).slice(0, n) : [])
    const payload = {
      strategies: arr(parsed.strategies, 5),
      taxBenefits: arr(parsed.taxBenefits, 4),
      pros: arr(parsed.pros, 5),
      cons: arr(parsed.cons, 5),
      encouragement: typeof parsed.encouragement === 'string' ? parsed.encouragement.slice(0, 200) : '',
    }
    if (!payload.strategies.length) throw new Error('empty')
    setCachedSearch(cacheKey, payload).catch(() => {})
    return Response.json({ ...payload, _cache: 'miss' })
  } catch (e) {
    console.error('[plan-strategy] failed:', e?.message)
    return Response.json({ error: 'Guac-AI is busy — showing built-in guidance.' }, { status: 502 })
  }
}
