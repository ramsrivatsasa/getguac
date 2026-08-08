// GetGuac Growth AI — turns aggregate funnel outcomes into an approval-ready
// acquisition, activation and retention plan. This module never publishes an
// ad, sends a notification or changes a budget. It prepares decisions; humans
// approve external actions.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GROQ_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const PRODUCT_FACTS = [
  'GetGuac is free to get started, asks for no payment card and does not require a bank connection.',
  'Users can scan receipt photos, forward email receipts or upload PDFs.',
  'GetGuac organizes line items and supports return windows, subscriptions, spending insights, statement fees, price hunting and household lists.',
  'The public demo is /login?demo=1 and signup is /start.',
  'GetGuac must not promise cash rewards, guaranteed savings, invented reviews, invented users or invented press coverage.',
]

const SYSTEM = `You are GetGuac's senior growth strategist and experiment analyst.

You receive ONLY aggregate metrics, manual advertising totals and summaries of prior plans. Design the next smallest set of actions that can improve activated customers, where activation means a user processes a first receipt.

VERIFIED PRODUCT FACTS:
${PRODUCT_FACTS.map((fact) => `- ${fact}`).join('\n')}

OPERATING RULES:
- Never invent results, customer quotes, benchmarks, press, savings, features or tracking data.
- Distinguish observed facts from hypotheses.
- Do not recommend cash payouts. Prefer product value, education, useful alerts and non-cash referrals.
- Do not optimize for clicks alone. Prioritize landing-page arrival, registration, first receipt and seven-day return.
- Keep each campaign focused on one pain: receipt detail, return/refund windows, forgotten recurring spending, or no-bank-login privacy.
- Every experiment must name one primary metric and a stop rule.
- Notifications must be useful, truthful, preference-respecting and under 110 characters for the body. Never use shame, fake urgency or financial fear.
- External publishing and spending always require human approval.

Return strict JSON only, using exactly this top-level shape:
{
  "summary": "string",
  "northStar": { "metric": "string", "reason": "string" },
  "diagnosis": [{ "severity": "high|medium|low", "title": "string", "evidence": "string", "action": "string" }],
  "priorities": [{ "title": "string", "why": "string", "timeframe": "string", "successMetric": "string" }],
  "campaigns": [{ "name": "string", "audience": "string", "hook": "string", "primaryText": "string", "headline": "string", "cta": "string", "landingMessage": "string" }],
  "organic": [{ "format": "string", "hook": "string", "script": "string", "cta": "string" }],
  "lifecycle": [{ "trigger": "string", "delayHours": 0, "channel": "push|email|in-app", "title": "string", "body": "string", "route": "string" }],
  "experiments": [{ "name": "string", "hypothesis": "string", "control": "string", "variant": "string", "primaryMetric": "string", "stopRule": "string" }],
  "risks": ["string"]
}

Limits: at most 4 diagnosis items, 5 priorities, 3 campaigns, 5 organic ideas, 4 lifecycle messages, 4 experiments and 5 risks.`

function safeJson(raw) {
  if (!raw) return null
  let text = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return JSON.parse(text) } catch {}
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) text = text.slice(start, end + 1)
  try { return JSON.parse(text) } catch { return null }
}

function list(value, max) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').slice(0, max) : []
}

function strings(value, max) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, max) : []
}

function cleanPlan(plan) {
  if (!plan || typeof plan !== 'object') return null
  const cleaned = {
    summary: String(plan.summary || '').slice(0, 600),
    northStar: {
      metric: String(plan.northStar?.metric || 'First receipt activation rate').slice(0, 160),
      reason: String(plan.northStar?.reason || 'It measures whether a new account reaches product value.').slice(0, 400),
    },
    diagnosis: list(plan.diagnosis, 4),
    priorities: list(plan.priorities, 5),
    campaigns: list(plan.campaigns, 3),
    organic: list(plan.organic, 5),
    lifecycle: list(plan.lifecycle, 4).map((item) => ({ ...item, delayHours: Math.max(0, Number(item.delayHours) || 0) })),
    experiments: list(plan.experiments, 4),
    risks: strings(plan.risks, 5),
  }
  return cleaned.summary && cleaned.priorities.length ? cleaned : null
}

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null
}

export function fallbackGrowthPlan(metrics = {}, campaign = {}) {
  const clicks = Number(campaign.linkClicks || 0)
  const landings = Number(campaign.landingPageViews || 0)
  const accounts = Number(campaign.accountsCreated || metrics.signups?.current || 0)
  const activated = Number(metrics.activation?.currentUsers || 0)
  const arrival = pct(landings, clicks)
  const signupRate = pct(accounts, landings)
  const activationRate = pct(activated, accounts)
  const diagnoses = []

  if (clicks && arrival != null && arrival < 75) diagnoses.push({
    severity: 'high', title: 'Paid clicks are not reliably reaching the page',
    evidence: `${landings} landing-page views from ${clicks} link clicks (${arrival}%).`,
    action: 'Verify page speed and destination continuity before increasing the budget.',
  })
  if (!metrics.tracking?.metaConversionsConfigured) diagnoses.push({
    severity: 'high', title: 'Meta cannot observe Google registrations',
    evidence: 'The public pixel is configured but the private Conversions API token is missing.',
    action: 'Configure FB_CAPI_TOKEN and verify CompleteRegistration in Meta Test Events.',
  })
  if (landings && signupRate != null) diagnoses.push({
    severity: signupRate < 10 ? 'high' : 'medium', title: 'Landing-to-account conversion needs a measured baseline',
    evidence: `${accounts} accounts from ${landings} landing-page views (${signupRate}%).`,
    action: 'Keep one primary “Analyze my first receipt” offer and test one message at a time.',
  })
  if (accounts && activationRate != null) diagnoses.push({
    severity: activationRate < 40 ? 'high' : 'medium', title: 'First-receipt activation is the growth constraint',
    evidence: `${activated} newly registered users processed a receipt (${activationRate}%).`,
    action: 'Route new users directly into scan, forward-email or sample-receipt onboarding.',
  })

  return {
    summary: 'Concentrate acquisition on one receipt-rescue promise, repair measurement, and optimize for the first receipt rather than inexpensive clicks.',
    northStar: { metric: 'New-account → first-receipt activation rate', reason: 'A processed receipt is the first moment GetGuac can deliver durable product value.' },
    diagnosis: diagnoses.slice(0, 4),
    priorities: [
      { title: 'Repair registration attribution', why: 'The advertising system cannot learn from conversions it cannot see.', timeframe: 'Before the next ad increase', successMetric: 'CompleteRegistration appears in Meta Test Events and matches internal counts.' },
      { title: 'Launch the Free Receipt Rescue offer', why: 'A concrete first outcome is easier to understand than a list of features.', timeframe: 'This week', successMetric: 'Landing-page visitor → account creation improves without lowering first-receipt activation.' },
      { title: 'Shorten first-receipt onboarding', why: 'The first receipt is the activation event.', timeframe: 'This week', successMetric: 'At least 40% of new accounts process a first receipt.' },
    ],
    campaigns: [
      { name: 'Receipt Rescue', audience: 'Households and frequent online shoppers', hook: 'That receipt may still be worth money.', primaryText: 'Scan one receipt. GetGuac organizes what you bought and watches the details that are easy to miss.', headline: 'Analyze your first receipt free', cta: 'Sign Up', landingMessage: 'Your bank shows the charge. GetGuac shows what you bought.' },
      { name: 'Beyond the bank charge', audience: 'People trying to understand household spending', hook: 'Your bank shows $91 at Target. What did the $91 buy?', primaryText: 'Turn receipt photos and emails into searchable, item-level purchase history—without connecting a bank.', headline: 'See the purchase, not just the charge', cta: 'Learn More', landingMessage: 'Know what you bought, where it went and what deserves attention.' },
      { name: 'No bank login', audience: 'Privacy-conscious money-app shoppers', hook: 'Understand spending without handing over a bank login.', primaryText: 'Forward a receipt or upload a PDF. GetGuac organizes purchases while your bank credentials stay with you.', headline: 'Receipt intelligence without bank access', cta: 'Try It Free', landingMessage: 'Free to start. No card. No bank connection.' },
    ],
    organic: [
      { format: '15-second screen recording', hook: 'What one Target receipt reveals', script: 'Show charge → receipt lines → organized items → return window. Label any sample figures as illustrative.', cta: 'Try the public demo.' },
      { format: 'Founder video', hook: 'Why GetGuac never asks for your bank login', script: 'Explain the receipt-first approach and show the privacy controls.', cta: 'Analyze one receipt free.' },
      { format: 'Before/after carousel', hook: 'Bank transaction versus purchase intelligence', script: 'Slide one shows a merchant total; slide two shows item-level context and next actions.', cta: 'See what your receipt knows.' },
    ],
    lifecycle: [
      { trigger: 'Account has a push token but no receipt after one day', delayHours: 24, channel: 'push', title: 'Your first receipt can do more', body: 'Scan one receipt to organize items and start watching return windows.', route: '/receipts' },
      { trigger: 'First receipt completes', delayHours: 0, channel: 'in-app', title: 'Your first receipt is organized', body: 'Review the items, then add another receipt when you are ready.', route: '/receipts' },
      { trigger: 'User processed receipts in the last seven days', delayHours: 168, channel: 'push', title: 'Your weekly GetGuac summary is ready', body: 'Review your receipts, returns and anything that deserves attention.', route: '/dashboard' },
    ],
    experiments: [
      { name: 'CTA promise', hypothesis: 'A receipt-specific CTA will activate more useful accounts than a generic signup CTA.', control: 'Get started free', variant: 'Analyze my first receipt—free', primaryMetric: 'First receipts per landing-page visitor', stopRule: 'Run for 14 days or 200 landing-page views; do not scale a variant with worse activation.' },
      { name: 'Pain-led advertisement', hypothesis: 'One problem per ad will outperform the all-features message.', control: 'General GetGuac feature ad', variant: 'Receipt Rescue ad', primaryMetric: 'First receipts per $10 spent', stopRule: 'Pause after $20 with no first-receipt activation.' },
    ],
    risks: ['Meta attribution remains incomplete until Conversions API is configured.', 'Sample product figures must remain clearly labeled as illustrative.', 'Do not scale paid traffic until the first-receipt event is measurable.', 'Automated notifications must honor preferences, quiet hours and frequency limits.'],
  }
}

async function callGemini(apiKey, payload) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: payload }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.35, maxOutputTokens: 5000 },
    }),
    signal: AbortSignal.timeout(20_000),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json?.error?.message || `Gemini ${response.status}`)
  return json?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('') || ''
}

async function callGroq(apiKey, payload) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: payload }],
      response_format: { type: 'json_object' },
      temperature: 0.35,
      max_tokens: 5000,
    }),
    signal: AbortSignal.timeout(20_000),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json?.error?.message || `Groq ${response.status}`)
  return json?.choices?.[0]?.message?.content || ''
}

export async function generateGrowthPlan({ metrics, campaign, history = [] }) {
  const payload = JSON.stringify({
    generatedAt: new Date().toISOString(),
    metrics,
    manualCampaignTotals: campaign,
    recentLearningHistory: history.slice(0, 5),
    instruction: 'Produce the next approval-ready plan. Use null or “not measured” where data is unavailable.',
  })
  let raw = ''
  let provider = 'rules'
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  if (geminiKey) {
    try { raw = await callGemini(geminiKey, payload); provider = `gemini:${GEMINI_MODEL}` }
    catch (error) { console.warn('[growth-agent] Gemini failed:', error.message) }
  }
  if (!raw && groqKey) {
    try { raw = await callGroq(groqKey, payload); provider = `groq:${GROQ_MODEL}` }
    catch (error) { console.warn('[growth-agent] Groq failed:', error.message) }
  }

  const aiPlan = cleanPlan(safeJson(raw))
  return { plan: aiPlan || fallbackGrowthPlan(metrics, campaign), provider: aiPlan ? provider : 'rules' }
}
