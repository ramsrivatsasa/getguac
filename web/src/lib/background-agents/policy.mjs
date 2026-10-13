export const AGENT_KINDS = ['news', 'analysis', 'plan', 'goals', 'wealth', 'shopping']
export const CADENCE_SECONDS = { news: 900, analysis: 900, plan: 900, goals: 3600, wealth: 3600, shopping: 3600 }
export const NEWS_TOPICS = ['Business & policy', 'Economy', 'Consumer finance', 'Markets', 'Recalls', 'Rates', 'Inflation', 'Bond yields', 'National debt', 'Household debt']
export function retryDelay(kind, attempts, status) {
  if (status === 'succeeded' || status === 'partial') return CADENCE_SECONDS[kind] || 900
  if (status === 'blocked') return 3600
  return Math.min(3600, 60 * 2 ** Math.min(6, Math.max(0, attempts - 1)))
}
// Explicit per-person preferences affect ordering only, never facts or totals.
export function personalizeNews(result, feedback = []) {
  const weights = new Map(feedback.filter(f => f.kind === 'news').map(f => [f.topic, f.vote]))
  const rank = items => [...(items || [])].sort((a, b) => (weights.get(b.topic) || 0) - (weights.get(a.topic) || 0) || Date.parse(b.date) - Date.parse(a.date))
  return { ...result, items: rank(result.items), marketWatch: rank(result.marketWatch), preferences: Object.fromEntries(weights), personalization: 'Your explicit topic preferences; no model training.' }
}
