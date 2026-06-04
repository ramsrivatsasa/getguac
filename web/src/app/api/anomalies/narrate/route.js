// POST /api/anomalies/narrate
//
// Guac-AI ENRICHMENT BACKFILL — Anomaly narratives.
//
// The AnomaliesPanel currently shows a template-y string like
//   "$89 this period vs avg $30 over the prior 3 windows"
// which is accurate but not memorable. This endpoint takes a list of
// anomalies and asks Gemini to write ONE-SENTENCE plain-language
// explanations like:
//   "This $89 Trader Joe's is 3× your usual TJ visit ($30 avg) —
//    probably stocked up for the week."
//
// Storage: per-user `anomaly_narratives` table keyed by
// (user_id, kind, bucket, period_start) so a panel re-render does NOT
// re-prompt the AI. New windows naturally age out — the panel only ever
// asks about its current window. Cached blurbs older than the window
// get garbage-collected on the client (we just don't fetch them).
//
// Contract:
//   POST body:
//     { anomalies: [{
//         kind: 'merchant-spike'|'category-spike'|'missing-recurring',
//         bucket: '<storeKey or category slug>',
//         period_start: 'YYYY-MM-DD',
//         title?: string,
//         body?: string,
//         amount?: number,
//         priorAvg?: number,
//         multiple?: number|null,
//         merchant?: string,
//         category?: string,
//       }, …]
//     }
//   Response:
//     { narratives: { '<kind>:<bucket>:<period_start>': '<one sentence>' } }
//
// Conservative — returns the original body text as a fallback when the
// AI call fails (caller can just use a.body in that case).

import { rateLimit, userRateKey } from '../../../../lib/apiGuard'
import { createApiClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You write one-sentence plain-language spending explanations.

Input: a JSON list of anomalies, each with:
  id, kind ('merchant-spike'|'category-spike'|'missing-recurring'),
  merchant?, category?, amount?, priorAvg?, multiple?

Output: ONLY a JSON object of the form:
  { "narratives": { "<id>": "<one short sentence>" } }

Style rules (HARD):
- ONE sentence each, max 22 words.
- Specific & friendly. Reference dollar amounts and "Nx your usual" only when supplied.
- Speculate gently about cause when natural ("probably stocked up for the week", "looks like autopay hiccup") — never accusatory.
- DO NOT lecture, moralize, or suggest action. The panel surfaces the action separately.
- DO NOT include phrases like "spending alert" or "anomaly detected".
- Plain text only — no emoji, no markdown.

Examples:
  merchant-spike, Trader Joe's $89 vs $30 avg (3x) → "This $89 Trader Joe's run is 3× your usual TJ stop ($30 avg) — probably a big stock-up week."
  category-spike, EATS $420 vs $180 (2.3x)        → "Eats jumped to $420 this month vs $180 typical — 2.3× your usual restaurant cadence."
  missing-recurring, Netflix ~$15.49              → "No Netflix charge in 42 days — your $15.49 monthly is overdue, maybe canceled or autopay failed."`

function safeParseJson(raw) {
  if (!raw) return null
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(s) } catch {}
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try { return JSON.parse(s) } catch { return null }
}

async function callGemini({ apiKey, payload }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: payload }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 2048 },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  return json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
}

async function callGroq({ apiKey, payload }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: payload },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2048,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Groq ${res.status}`)
  return json?.choices?.[0]?.message?.content || ''
}

function makeKey(a) {
  return `${a.kind}:${a.bucket}:${a.period_start}`
}

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'anomalies-narrate'), { limit: 30, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  let body = null
  try { body = await request.json() } catch {}
  const anomalies = Array.isArray(body?.anomalies)
    ? body.anomalies
        .filter(a => a && a.kind && a.bucket && a.period_start)
        .slice(0, 12)
    : []
  if (anomalies.length === 0) return Response.json({ narratives: {} })

  // ── Cache lookup ────────────────────────────────────────────────
  const keys = anomalies.map(makeKey)
  const { data: cached } = await sb
    .from('anomaly_narratives')
    .select('kind, bucket, period_start, narrative')
    .eq('user_id', user.id)
    .in('bucket', anomalies.map(a => a.bucket))   // narrowing filter
  const cacheByKey = new Map()
  for (const row of (cached || [])) {
    cacheByKey.set(`${row.kind}:${row.bucket}:${row.period_start}`, row.narrative)
  }

  const out = {}
  const toGenerate = []
  for (const a of anomalies) {
    const k = makeKey(a)
    const hit = cacheByKey.get(k)
    if (hit) out[k] = hit
    else toGenerate.push(a)
  }

  // ── AI pass for cache misses ───────────────────────────────────
  if (toGenerate.length > 0) {
    const apiKey  = process.env.GEMINI_API_KEY
    const groqKey = process.env.GROQ_API_KEY

    if (apiKey || groqKey) {
      const compact = toGenerate.map(a => ({
        id: makeKey(a),
        kind: a.kind,
        merchant: a.merchant || null,
        category: a.category || null,
        amount: a.amount != null ? Number(a.amount) : null,
        priorAvg: a.priorAvg != null ? Number(a.priorAvg) : null,
        multiple: a.multiple != null ? Number(a.multiple) : null,
      }))
      const payload = `Write narratives for these anomalies.\n${JSON.stringify(compact)}`

      let raw
      try { if (apiKey) raw = await callGemini({ apiKey, payload }) }
      catch (e) { console.warn('[anomalies/narrate] Gemini failed:', e.message) }
      if (!raw && groqKey) {
        try { raw = await callGroq({ apiKey: groqKey, payload }) }
        catch (e) { console.warn('[anomalies/narrate] Groq failed:', e.message) }
      }

      const parsed = safeParseJson(raw)
      if (parsed?.narratives) {
        const inserts = []
        for (const a of toGenerate) {
          const k = makeKey(a)
          const blurb = parsed.narratives[k]
          if (typeof blurb === 'string' && blurb.trim().length > 0 && blurb.length < 400) {
            out[k] = blurb.trim()
            inserts.push({
              user_id: user.id,
              kind: a.kind,
              bucket: a.bucket,
              period_start: a.period_start,
              narrative: blurb.trim(),
            })
          }
        }
        if (inserts.length > 0) {
          // Best-effort. Conflict on the unique (user_id, kind, bucket,
          // period_start) tuple is fine — means another tab beat us to it.
          await sb.from('anomaly_narratives').upsert(inserts, {
            onConflict: 'user_id,kind,bucket,period_start',
            ignoreDuplicates: false,
          }).then(() => {}, (e) => console.warn('[anomalies/narrate] persist failed:', e.message))
        }
      }
    }
  }

  return Response.json({ narratives: out, generated: keys.length - cacheByKey.size, cached: cacheByKey.size })
}
