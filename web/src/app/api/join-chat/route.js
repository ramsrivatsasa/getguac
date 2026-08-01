import { rateKey, rateLimit } from '../../../lib/apiGuard'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_TURNS = 10
const MAX_CHARS = 600

const SYSTEM = `You are Guac, the friendly GetGuac product guide on the public signup page. Your job is to understand what the visitor wants, answer honestly, reduce signup uncertainty, and invite them to either create a free account at /start or try the public demo at /login?demo=1.

VERIFIED PRODUCT FACTS:
- GetGuac is free to get started, requires no card, and has no bank connection.
- Visitors can snap a receipt, forward an email receipt, or upload a PDF. Guac-AI extracts the store, date, total, tax, and line items and organizes purchases.
- Features include subscription detection, return-window and warranty tracking, spending categories, statement fee insights, reports, household sharing, Smashlist restock predictions, Stash purchase history, price hunting, and iPhone, Android, and web apps.
- Data is encrypted, records are account-scoped, users can delete their account and data, and GetGuac says it does not sell user data.
- A public demo is available before signup.

RULES:
- Never claim you can see this visitor's finances, receipts, identity, browser, or account. This public chat has no personal financial data.
- Never invent user counts, savings amounts, ratings, setup times, security certifications, or features.
- Do not give personalized financial, tax, legal, or investment advice. You may give brief general educational guidance with an appropriate caveat.
- Be warm and concise: usually 2-4 short sentences, under 100 words. Ask at most one useful follow-up question.
- Behave like a capable conversational agent: remember the visitor's stated goal from the conversation, answer the current question directly, anticipate the most relevant next concern, and adapt the recommendation as the conversation develops.
- If the visitor gives a vague goal, ask one focused discovery question. Once the goal is clear, stop interviewing and help.
- Do not pressure, shame, or manufacture urgency. Motivate by connecting a real feature to the visitor's stated goal.
- When it fits naturally, finish with exactly one plain-text invitation: "Try the demo: /login?demo=1" or "Join free: /start".`

async function gemini(apiKey, messages) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
      generationConfig: { temperature: 0.45, maxOutputTokens: 300 },
    }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json?.error?.message || `Gemini ${response.status}`)
  return json?.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join('').trim()
}

async function groq(apiKey, messages) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
      temperature: 0.45,
      max_tokens: 300,
    }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json?.error?.message || `Groq ${response.status}`)
  return json?.choices?.[0]?.message?.content?.trim()
}

export async function POST(request) {
  const limited = await rateLimit(rateKey(request, 'join-chat'), { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!limited.ok) return Response.json({ error: `Guac needs a quick break. Try again in ${limited.retryAfter}s.` }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(message => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-MAX_TURNS)
    .map(message => ({ role: message.role, content: message.content.trim().slice(0, MAX_CHARS) }))
    .filter(message => message.content)

  if (!messages.length || messages[messages.length - 1].role !== 'user') return Response.json({ error: 'Ask Guac a question.' }, { status: 400 })

  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  if (!geminiKey && !groqKey) return Response.json({ error: 'Guac-AI is not configured yet.' }, { status: 503 })

  let reply = ''
  try { if (geminiKey) reply = await gemini(geminiKey, messages) } catch (error) { console.warn('[join-chat] Gemini failed:', error.message) }
  try { if (!reply && groqKey) reply = await groq(groqKey, messages) } catch (error) { console.warn('[join-chat] Groq failed:', error.message) }
  if (!reply) return Response.json({ error: 'Guac had trouble answering. Please try again.' }, { status: 502 })
  return Response.json({ reply })
}
