// POST /api/chat
//
// Guac Chat — the in-app AI assistant behind the sidebar's Chatter → Chat.
//
// The assistant answers two kinds of questions:
//   1. "My money" questions — grounded in a compact server-built snapshot of
//      the signed-in user's receipts (last ~6 months): monthly totals,
//      category and store breakdowns, detected subscriptions, recent
//      receipts. The model is instructed to use ONLY these numbers and to
//      say when an answer needs data the snapshot doesn't carry.
//   2. "How do I…" app questions — a short feature map in the system prompt
//      covers capture, Steals, Smashlist, Returns, Reports, Bank, etc.
//
// Same AI plumbing as the other Guac-AI routes: Gemini first, Groq fallback,
// plain-text reply (no JSON mode — this is conversation, not extraction).
//
// Contract:
//   POST { messages: [{ role: 'user'|'assistant', content: string }, …] }
//   →    { reply: string }

import { rateLimit, userRateKey } from '../../../lib/apiGuard'
import { createApiClient } from '../../../lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const MAX_TURNS = 16          // history cap sent to the model
const MAX_MSG_CHARS = 2000    // per-message cap

const SYSTEM_PROMPT = `You are Guac, the friendly money assistant inside GetGuac ("money's wingman") — an app that reads receipts and bank statements so people can see where their money goes and keep more of it.

You receive a SNAPSHOT of the signed-in user's own data (their receipts summary). Ground every number you state in that snapshot.

HARD RULES:
- Never invent or estimate numbers that are not derivable from the snapshot. If the user asks for something the snapshot doesn't carry (per-item prices, a specific old receipt, bank fees detail), say what you CAN see and point them to the right page instead.
- You are read-only: you cannot add, edit, or delete anything. If asked to, explain where in the app they can do it.
- No lecturing, moralizing, or guilt about spending — GetGuac's voice is upbeat and on the user's side.
- You CAN answer general personal-finance questions — how to build a retirement fund, pay down debt, raise a credit score, save, budget, and similar — with clear, practical, EDUCATIONAL guidance. Frame it as general information (not licensed financial, tax, or legal advice); avoid guarantees or pushing specific products, and tie it back to their own snapshot numbers when relevant.
- Keep replies short: 1-3 sentences for simple questions, at most ~120 words with simple "-" bullets for breakdowns. Plain text only — no markdown headings, no tables, no emoji spam (one 🥑-style emoji now and then is fine).
- Dollar figures like $1,234.56.

SHOWING DATA — always give a clickable link when the user wants to SEE, FIND, SHOW, PULL UP, OPEN, or SEARCH their own records. Use this exact markdown link format so the app renders it as a button: [label](/path). ONLY these real in-app paths — never invent a URL, never link to an external site:
- Receipts (this is a full-text SEARCH — the value matches store names AND line-item text, so it works for a store OR a product): "show me my Costco receipts" -> [See your Costco receipts](/receipts?store=Costco); "find where I bought milk" -> [Receipts with "milk"](/receipts?store=milk); all receipts -> [Open receipts](/receipts). Use the store/keyword as the user said it (URL-encode spaces as %20).
- Reports & analytics (spending by category, tax/business summaries, CSV) -> [Open your reports](/reports); trends & GuacScore -> [Guacanomics](/guacanomics).
- Products you own / rebuy -> [Open your Stash](/stash); restaurant dishes -> [Bites](/bites); cheaper prices -> [Find deals](/steals); return windows -> [Returns](/returns); statement fees -> [Bank](/bank); upcoming bills -> [Bills](/bills); shopping list -> [Smashlist](/shopping).
- Money guides & tools for how-to topics: retirement -> [401(k) basics](/articles/401k-basics) + [Calculators](/plan); debt payoff -> [Avalanche vs snowball](/articles/avalanche-vs-snowball); credit score -> [Credit score guide](/articles/credit-score); emergency fund -> [Emergency fund size](/articles/emergency-fund-size); or the hub [All money guides](/articles).
Answer the question in words first (with the numbers from the snapshot), THEN add the link on its own line. Always include the matching link when the user asks to see or search their data.

CURRENT INFO: When a question needs up-to-date facts (current rates, rules, prices, news), use web search and answer from it — real source links are attached to your reply automatically, so you don't need to paste raw URLs.

APP MAP (for "how do I…" questions):
- Receipts: snap a photo, drop a PDF/screenshot, or forward email receipts to the address on the Inbox page; Guac-AI reads store, date, total, and every line item.
- Worth It?: rate purchases (Essential → Regret) — feeds the GuacScore.
- Steals: scans the live web for a cheaper price on things they buy; saved searches live on the dashboard too.
- Smashlist: the self-building shopping list with restock heads-ups (Shopping page).
- Stash: every product ever bought, with rebuy cadence and best store.
- Bites: every restaurant dish they've tried — like it or pass, reorder lists.
- Returns: return-window countdowns and store policies.
- Bank + GuacWizard: upload statements; GuacWizard flags fees, interest, and leaks ("bank bites").
- Reports: spending by category, tax-ready business + charity summaries, subscription detection, CSV export.
- Guacanomics: trends, GuacScore, spending vs refunds over time.
- GuacMoney: keeps score of the value they've kept (saved money stays their money — there is nothing to redeem).`

function safeText(s) {
  return String(s == null ? '' : s).slice(0, MAX_MSG_CHARS)
}

// ── Snapshot: one receipts query, aggregated in JS ─────────────────────────
async function buildSnapshot(sb, userId) {
  const since = new Date()
  since.setDate(since.getDate() - 183)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data: rows, error } = await sb
    .from('receipts')
    .select('store_name, date, total_amount, tax_paid, category, business_purchase')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: false })
    .limit(500)
  if (error) throw error

  const today = new Date().toISOString().slice(0, 10)
  const daysAgo = (n) => {
    const d = new Date(); d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
  }
  const d30 = daysAgo(30), d90 = daysAgo(90)
  const money = (n) => Math.round(n * 100) / 100

  const months = {}, byCategory = {}, byStore = {}, subs = {}
  let total30 = 0, total90 = 0, tax90 = 0, business90 = 0
  for (const r of rows || []) {
    const amt = Number(r.total_amount) || 0
    const m = String(r.date || '').slice(0, 7)
    if (m) months[m] = money((months[m] || 0) + amt)
    if (r.date >= d90) {
      total90 += amt
      tax90 += Number(r.tax_paid) || 0
      if (r.business_purchase) business90 += amt
      const cat = r.category || 'misc'
      byCategory[cat] = money((byCategory[cat] || 0) + amt)
      const store = (r.store_name || 'UNKNOWN').toUpperCase()
      byStore[store] = byStore[store] || { total: 0, receipts: 0 }
      byStore[store].total = money(byStore[store].total + amt)
      byStore[store].receipts += 1
      if (cat === 'subs') {
        subs[store] = subs[store] || { charges: 0, total: 0 }
        subs[store].charges += 1
        subs[store].total = money(subs[store].total + amt)
      }
    }
    if (r.date >= d30) total30 += amt
  }

  const topStores = Object.entries(byStore)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([store, v]) => ({ store, ...v }))

  return {
    today,
    coverage: `receipts from ${sinceStr} to today (older data exists but is not in this snapshot)`,
    receiptsInSnapshot: (rows || []).length,
    last30Days: { totalSpent: money(total30) },
    last90Days: {
      totalSpent: money(total90),
      taxPaid: money(tax90),
      businessSpend: money(business90),
      byCategory,
      topStores,
      subscriptions: Object.entries(subs).map(([store, v]) => ({ store, ...v })),
    },
    monthlyTotals: months,
    recentReceipts: (rows || []).slice(0, 20).map(r => ({
      store: r.store_name, date: r.date, total: Number(r.total_amount) || 0, category: r.category || 'misc',
    })),
  }
}

// ── Model calls: Gemini first, Groq fallback (plain text) ──────────────────
async function callGemini({ apiKey, system, history }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      // Google Search grounding: lets Guac pull current facts (rates, rules,
      // how-tos) from the web and return real source links. The model decides
      // when to use it; "my money" questions still ground in the snapshot.
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Gemini ${res.status}`)
  const cand = json?.candidates?.[0]
  const text = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
  const sources = (cand?.groundingMetadata?.groundingChunks || [])
    .map(c => c.web).filter(w => w && w.uri)
    .map(w => ({ title: (w.title || w.uri).slice(0, 80), uri: w.uri }))
    .filter((s, i, a) => a.findIndex(x => x.uri === s.uri) === i)
    .slice(0, 4)
  return { text, sources }
}

async function callGroq({ apiKey, system, history }) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: system },
        ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ],
      temperature: 0.5,
      max_tokens: 1024,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message || `Groq ${res.status}`)
  return json?.choices?.[0]?.message?.content || ''
}

export async function POST(request) {
  const sb = createApiClient()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user?.id) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const rl = await rateLimit(userRateKey(user.id, 'chat'), { limit: 40, windowMs: 60 * 60 * 1000 })
  if (!rl.ok) return Response.json({ error: `Rate limited. Try again in ${rl.retryAfter}s.` }, { status: 429 })

  let body = null
  try { body = await request.json() } catch {}
  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: safeText(m.content) }))
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return Response.json({ error: 'Send at least one user message.' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  if (!apiKey && !groqKey) {
    return Response.json({ error: 'Chat is not configured on this server.' }, { status: 503 })
  }

  let snapshot = null
  try { snapshot = await buildSnapshot(sb, user.id) }
  catch (e) {
    console.warn('[chat] snapshot failed:', e.message)
    snapshot = { error: 'snapshot unavailable — answer app questions only and say the data view is temporarily unavailable' }
  }

  const system = `${SYSTEM_PROMPT}\n\nSNAPSHOT (the signed-in user's data):\n${JSON.stringify(snapshot)}`

  let reply = '', sources = []
  try {
    if (apiKey) { const r = await callGemini({ apiKey, system, history }); reply = r.text; sources = r.sources || [] }
  } catch (e) { console.warn('[chat] Gemini failed:', e.message) }
  if (!reply && groqKey) {
    try { reply = await callGroq({ apiKey: groqKey, system, history }) }
    catch (e) { console.warn('[chat] Groq failed:', e.message) }
  }
  if (!reply) {
    return Response.json({ error: 'Guac had trouble answering — try again in a moment.' }, { status: 502 })
  }
  return Response.json({ reply: reply.trim(), sources })
}
