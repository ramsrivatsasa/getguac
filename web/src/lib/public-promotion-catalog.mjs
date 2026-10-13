import { currentPromotions } from './promotion-presentation.mjs'
export async function publicPromotionCatalog(sb, user) {
  if (user.user_metadata?.country_code !== 'US' || user.user_metadata?.preferred_currency !== 'USD') return []
  // Read the database directly: an administrator's disable must not wait for
  // another server instance's in-memory shopping cache to expire.
  const { data, error } = await sb.from('shopping_cache').select('payload').eq('cache_key', 'major-promotions-public-v1').maybeSingle()
  const age = Date.now() - Date.parse(data?.payload?.checkedAt)
  if (error || !Number.isFinite(age) || age < 0 || age > 48 * 3600000) return []
  return currentPromotions((data.payload.offers || []).filter(offer => offer.status === 'active' && offer.verification_status === 'verified' && offer.metadata?.geography === 'US' && offer.expires_at && Date.now() - Date.parse(offer.last_checked_at) >= 0 && Date.now() - Date.parse(offer.last_checked_at) < 48 * 3600000)).slice(0, 40)
}
