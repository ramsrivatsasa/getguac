// Per-item non-returnable detection.
//
// Returning a physical product is a real action a user can take ("I'm
// taking these jeans back to Target"). For SERVICES — subscriptions,
// domain renewals, hosting fees, utility payments, bank charges — there
// is no merchant return; refunds (if any) happen via the provider's
// cancel flow. The Return button on those lines is wrong.
//
// This helper centralizes the decision so the receipts list, the
// receipt detail items table, and the returns page all agree on what
// counts as non-returnable.
//
// Two layers of signal:
//   1. Item-level facts: item.returned, item.category.
//   2. Item NAME keywords: "subscription", "domain fee", "hosting", etc.
//   3. Receipt-level facts: receipt.is_return (a refund row), receipt.
//      from_statement (a credit-card statement audit row).
//
// Returns true if the line should NOT show a Return action.

import { normalizeStoreName } from './store-name-normalize'

// Categories where the line item is consumed, paid as a service, or
// otherwise can't be physically returned.
const NON_RETURNABLE_ITEM_CATEGORIES = new Set([
  'eats',       // restaurant food — consumed
  'gas-up',     // fuel — pumped
  'bars',       // alcohol — consumed
  'tea',        // beverage — consumed
  'drinks',     // beverage — consumed (covers coffee, soda, juice, shakes)
  'subs',       // subscription
  'bills',      // utility — mobile, phone, internet, electric, gas, water, trash, insurance
  'cloud',      // hosting, domain, cloud infra (AWS/GCP/Azure), VPS, SSL/CDN, email hosting
  'bank-fees',  // interest, fees, finance charges
  'charity',    // donation
])

// Name-level keywords that mark a line as a service or recurring charge
// regardless of how Gemini categorized it. Covers the common cases users
// see on hosting / domain / cloud / SaaS receipts where the item line is
// generic ("Your purchase at IONOS Inc.") but a sibling line is more
// specific ("Domain renewal — 1y · .com").
const NON_RETURNABLE_NAME_RE = /\b(subscription|domain (fee|renewal|subscription|registration|transfer)|hosting (fee|plan|renewal|service)?|web ?hosting|shared hosting|vps|dedicated server|cloud (storage|hosting|service)|saas|software license|license (fee|renewal)?|annual (fee|renewal)|monthly (fee|service|maintenance)|recurring (fee|charge)|service charge|setup fee|membership (fee|renewal)|auto[- ]renew|prepaid plan|renewal|ssl certificate|email hosting|workspace plan)\b/i

// Fallback for receipts where Gemini left both the category and the item
// name too generic to classify (e.g. "Your purchase at IONOS Inc.") but
// the merchant is a well-known service provider. Normalized via
// normalizeStoreName so "ionos.com", "IONOS Inc.", "IONOS" all match.
const NON_RETURNABLE_SERVICE_STORES = new Set([
  // Hosting / domains
  'ionos', 'godaddy', 'namecheap', 'hostinger', 'bluehost', 'siteground',
  'dreamhost', 'name', // for "name.com"
  // Cloud / infra
  'cloudflare', 'vercel', 'netlify', 'digitalocean', 'linode',
  'aws', 'amazon web services', 'google cloud', 'gcp', 'azure', 'microsoft azure',
  // SaaS / dev tools
  'github', 'gitlab', 'notion', 'figma', 'slack', 'zoom', 'canva',
  'jetbrains', 'cursor', 'adobe', 'microsoft 365', 'office 365',
  // Streaming / media subscriptions
  'netflix', 'hulu', 'disney plus', 'disney +', 'hbo max', 'spotify',
  'apple music', 'youtube premium', 'amazon prime video', 'paramount plus',
  'peacock', 'sling tv',
  // AI tools
  'openai', 'anthropic', 'chatgpt', 'claude', 'midjourney', 'replicate', 'perplexity',
])

/**
 * @param {object} item   The receipt_items row: { item_name, category, returned, ... }
 * @param {object} receipt The parent receipt: { store_name, is_return, from_statement, ... }
 * @returns {boolean} true if the line should not offer a Return action.
 */
export function isItemNonReturnable(item, receipt) {
  if (!item) return false
  if (item.returned) return true
  if (receipt?.is_return) return true
  if (receipt?.from_statement) return true
  if (item.category && NON_RETURNABLE_ITEM_CATEGORIES.has(item.category)) return true
  if (item.item_name && NON_RETURNABLE_NAME_RE.test(item.item_name)) return true
  // Final fallback: known service merchant with no other product signal.
  if (receipt?.store_name) {
    const key = normalizeStoreName(receipt.store_name)
    if (key && NON_RETURNABLE_SERVICE_STORES.has(key)) return true
  }
  return false
}

/**
 * Convenience for the receipt-level banner: are ALL items non-returnable?
 * Returns the banner reason or null. Falls back to receipt.category when
 * there are no items (e.g. a stub receipt the AI couldn't parse).
 */
export function receiptBannerReason(receipt, items = []) {
  if (!receipt) return null
  if (receipt.is_return) return 'This receipt is itself a refund — no further returns.'
  if (receipt.from_statement) return 'Statement-imported row — refund via the issuer, not a return.'
  const list = Array.isArray(items) ? items : []
  if (list.length > 0) {
    const allBlocked = list.every(it => isItemNonReturnable(it, receipt))
    if (allBlocked) return 'Every line on this receipt is a non-returnable service / consumable.'
    return null
  }
  // No line items — fall back to the receipt-level category if it tells us anything.
  if (NON_RETURNABLE_ITEM_CATEGORIES.has(receipt.category)) {
    return `Category "${receipt.category}" is non-returnable.`
  }
  if (receipt.store_name && NON_RETURNABLE_SERVICE_STORES.has(normalizeStoreName(receipt.store_name))) {
    return `${receipt.store_name} is a service merchant — refund via their cancel flow.`
  }
  return null
}
