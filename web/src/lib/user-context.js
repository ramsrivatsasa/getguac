// Per-user few-shot context builder. Central place that turns a user's
// past corrections into a short prompt snippet we append to every AI call
// (parse-receipt, categorize, future "Ask Guac").
//
// Why this exists
// ---------------
// Gemini knows general retail but doesn't know YOU. If you've already
// categorized 4 IONOS receipts as "cloud", Gemini will still call the 5th
// "tech" unless we tell it. This lib pulls your past per-store corrections
// (where `receipts.category_source = 'user'`) and renders them into a few
// lines the model can follow.
//
// Design choices
// --------------
// - One function, returns a ready-to-append string. Caller never thinks
//   about token shapes.
// - Returns "" (not null) when no signal exists, so callers can do
//   `SYSTEM_PROMPT + suffix` unconditionally.
// - Caps at 5 examples and 50 source rows — bounded cost, predictable
//   token usage (~150 tokens of suffix in the worst case).
// - Strictly per-user. We pull ONLY the caller's own receipts. Cross-user
//   data never enters the prompt.
//
// Cost
// ----
// One short Supabase query per parse request, ~200 extra tokens in the
// Gemini call (so $0.0001-ish at gemini-2.5-flash rates).

const DEFAULT_MAX_EXAMPLES = 5
const SOURCE_ROW_CAP = 50

/**
 * Build a per-user few-shot context for AI prompts.
 *
 * @param {object} supabase  A supabase client bound to the user's session
 *                           (createApiClient() handles both cookie + Bearer).
 * @param {object} [opts]
 * @param {number} [opts.maxExamples=5]  How many (store, category) pairs to surface.
 * @returns {Promise<{user_id: string, examples: Array<{store:string, category:string, count:number}>}|null>}
 */
export async function buildUserContext(supabase, opts = {}) {
  const maxExamples = opts.maxExamples ?? DEFAULT_MAX_EXAMPLES

  if (!supabase) return null

  let userId = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  } catch {
    return null
  }
  if (!userId) return null

  let corrections
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('store_name, category, created_at')
      .eq('user_id', userId)
      .eq('category_source', 'user')
      .not('store_name', 'is', null)
      .not('category', 'is', null)
      .order('created_at', { ascending: false })
      .limit(SOURCE_ROW_CAP)
    if (error) return null
    corrections = data
  } catch {
    return null
  }

  if (!Array.isArray(corrections) || corrections.length === 0) return null

  // Tally (store, category) → count. The MOST corrected pair for a given
  // store wins (handles users who briefly tried a wrong category before
  // settling on the right one).
  const byStore = new Map()
  for (const r of corrections) {
    const store = (r.store_name || '').trim()
    const category = (r.category || '').trim()
    if (!store || !category) continue
    if (!byStore.has(store)) byStore.set(store, new Map())
    const cats = byStore.get(store)
    cats.set(category, (cats.get(category) || 0) + 1)
  }

  const examples = []
  for (const [store, cats] of byStore.entries()) {
    let bestCat = null, bestCount = 0
    for (const [cat, count] of cats.entries()) {
      if (count > bestCount) { bestCat = cat; bestCount = count }
    }
    if (bestCat) examples.push({ store, category: bestCat, count: bestCount })
  }

  // Sort by frequency, then alphabetically for stable ordering.
  examples.sort((a, b) => b.count - a.count || a.store.localeCompare(b.store))
  const top = examples.slice(0, maxExamples)
  if (top.length === 0) return null

  return { user_id: userId, examples: top }
}

/**
 * Render a user context object into a prompt suffix the model can follow.
 * Safe to call with null — returns "" so callers can append unconditionally.
 *
 * @param {object|null} context  Output of buildUserContext()
 * @returns {string}
 */
export function renderUserContextPrompt(context) {
  if (!context || !Array.isArray(context.examples) || context.examples.length === 0) {
    return ''
  }
  const lines = context.examples.map(e =>
    `- "${e.store}" → ${e.category}  (this user has confirmed ${e.count}x)`
  )
  return [
    '',
    'USER-SPECIFIC PREFERENCES — this individual user has previously corrected receipts from these merchants to these specific categories. Trust these mappings as authoritative for THIS user unless the receipt content is unambiguously different (e.g. they bought a laptop at a store they normally use for groceries). Apply them silently — do NOT mention them in output, do NOT add prose, still return JSON only.',
    ...lines,
    '',
  ].join('\n')
}

/**
 * Convenience: do both in one call. Returns the prompt suffix string ready
 * to concatenate to SYSTEM_PROMPT. Returns "" on cold start / anonymous.
 */
export async function buildUserContextPrompt(supabase, opts) {
  const ctx = await buildUserContext(supabase, opts)
  return renderUserContextPrompt(ctx)
}
