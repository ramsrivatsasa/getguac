// Rewards-balance extraction from email bodies.
//
// Loyalty programs periodically email users their current points/cashback
// balance. This module:
//   1. Cheaply tells "is this a balance-update email?" via subject/body
//      keyword matching (no AI cost on non-balance mail).
//   2. When it looks like a balance email, asks Gemini to extract structured
//      data: program name, balance amount, unit, expiry.
//
// Wired into lib/email-to-receipt.js so a single AI call per receipt-hook
// email picks up the balance. Non-receipt mail uses the keyword fast-path.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Cheap pre-filter — if NONE of these phrases appear in the subject or
// preview, we don't waste an AI call. Designed to be lenient (false positives
// are cheap; false negatives miss data).
const BALANCE_HINTS = [
  /\bbalance\b/i,
  /\b(points|pts)\b/i,
  /\bcash[\s-]?back\b/i,
  /\brewards?\b/i,
  /\bextra ?bucks?\b/i,
  /\bextracare\b/i,
  /\bmember(ship)?\b/i,
  /\bsavings\b/i,
  /\bcredit\b/i,
  /\bperks?\b/i,
  /\bstars?\b/i,        // Starbucks Stars
  /\bmiles\b/i,         // airline / hotel
  /\bcoupons?\b/i,
  /\bredeem\b/i,
]

export function looksLikeBalanceEmail({ subject = '', preview = '', bodyText = '' } = {}) {
  const haystack = `${subject}\n${preview}\n${bodyText.slice(0, 2000)}`
  return BALANCE_HINTS.some(re => re.test(haystack))
}

// AI extraction. Returns either:
//   { found: true, program_name, balance_amount, balance_unit, expires_at }
// or:
//   { found: false }
// Never throws — failure means "we couldn't extract a balance, skip it."
export async function extractBalanceFromEmail({ subject, fromAddr, body, emailDate }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !body || body.length < 40) return { found: false }

  const prompt = `You extract REWARDS BALANCE updates from emails sent by loyalty programs.
This email may or may not be a balance-update email. Output strict JSON.

If this email contains a current rewards/cashback/points balance for the recipient, return:
{
  "found": true,
  "program_name": string,          // 'CVS ExtraCare', 'BJ's Easy Renewal', 'My Best Buy Plus', 'Costco Membership', 'Amazon Prime', 'Starbucks Stars', 'Target Circle', etc. Use the OFFICIAL program name.
  "balance_amount": number,        // numeric balance (e.g. 4.50 for $4.50, 1240 for 1,240 points)
  "balance_unit": string,          // '$' for cashback/dollars, 'pts' for points, 'miles' for airline, 'stars' for Starbucks, '%' for cashback rate
  "expires_at": string|null        // YYYY-MM-DD if the email gives an expiry; null otherwise
}

If this is NOT a balance email (it's a receipt, a marketing blast, a shipping notice, a newsletter, anything non-balance), return:
{ "found": false }

Rules:
- Only return found:true when you can clearly identify BOTH the program AND a specific balance value.
- Ignore PROMOTIONAL "earn up to $X" text — that's an OFFER, not a balance.
- Marketing emails that say "you have rewards waiting" without a specific number = found:false.
- Receipt emails that show "earned: 5 pts this purchase" without a TOTAL balance = found:false.

Sender hint (use to disambiguate program names): ${fromAddr || 'unknown'}
Email date (for expiry context): ${emailDate || 'unknown'}
Subject: ${subject || '(no subject)'}

EMAIL BODY:
${body.length > 8000 ? body.slice(0, 8000) + '\n[truncated]' : body}

JSON only:`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 512 },
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const json = await res.json()
    if (!res.ok) {
      console.warn('[rewards-balance-extractor]', json?.error?.message || res.status)
      return { found: false }
    }
    const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
    const cleaned = text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(cleaned)
    if (!parsed?.found) return { found: false }
    return {
      found: true,
      program_name: (parsed.program_name || '').toString().trim() || null,
      balance_amount: typeof parsed.balance_amount === 'number' ? parsed.balance_amount : Number(parsed.balance_amount) || null,
      balance_unit: (parsed.balance_unit || '$').toString().trim(),
      expires_at: parsed.expires_at && /^\d{4}-\d{2}-\d{2}/.test(parsed.expires_at) ? parsed.expires_at.slice(0, 10) : null,
    }
  } catch (e) {
    console.warn('[rewards-balance-extractor] error:', e.message)
    return { found: false }
  }
}

// Persist a successfully extracted balance.
export async function writeRewardsBalance(sb, { userId, storeId, storeName, sourceEmailId, parsed }) {
  if (!userId || !parsed?.found || parsed.balance_amount == null || !parsed.program_name) return
  const { error } = await sb.from('rewards_balances').insert({
    user_id: userId,
    store_id: storeId || null,
    store_name: storeName || null,
    program_name: parsed.program_name,
    balance_amount: parsed.balance_amount,
    balance_unit: parsed.balance_unit || '$',
    expires_at: parsed.expires_at || null,
    source_email_id: sourceEmailId || null,
  })
  if (error) console.warn('[rewards-balance-extractor] insert failed:', error.message)
}
