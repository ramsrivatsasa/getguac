// Server-side keyword fallback for item-level categorization.
// Runs after Gemini/Groq returns parsed items. If the model didn't classify an
// item, regex on item_name maps common brands and kinds to a preset slug.
// Items still null after this stay null — the UI shows them as "Uncategorized".
//
// Order matters: more specific rules first (coke before generic soda, milkshake
// before milk, etc.). The first match wins.

const RULES = [
  { slug: 'coffee',    re: /\b(coffee|latte|espresso|mocha|cappuccino|americano|cold ?brew|frappuccino|starbucks|dunkin|peet'?s|nespresso|keurig)\b/i },
  { slug: 'tea',       re: /\b(tea|matcha|chai|oolong|earl ?grey|chamomile|green ?tea|black ?tea)\b/i },
  { slug: 'coke',      re: /\b(coca[- ]?cola|coke(?! ?zero)?|cherry coke|coke ?\d?l|coca cola)\b/i },
  { slug: 'pepsi',     re: /\b(pepsi|mountain ?dew|mtn ?dew|mtn-?dew)\b/i },
  { slug: 'milkshake', re: /\b(milk ?shake|frosty|smoothie king)\b/i },
  { slug: 'juice',     re: /\b(juice|orange juice|\boj\b|apple juice|cranberry juice|minute maid|tropicana|simply orange|naked juice|pomegranate juice)\b/i },
  { slug: 'bars',      re: /\b(beer|ipa|lager|ale|stout|pilsner|porter|budweiser|coors|miller|heineken|guinness|wine|cabernet|merlot|chardonnay|sauvignon|pinot|tequila|vodka|whiskey|whisky|bourbon|scotch|gin|rum|cocktail|margarita|martini|mojito|champagne|prosecco|sake)\b/i },
  { slug: 'gas-up',    re: /\b(unleaded|regular gas|premium gas|diesel|fuel|gasoline|gallons?)\b/i },
  { slug: 'wellness',  re: /\b(advil|tylenol|aspirin|ibuprofen|acetaminophen|vitamin|multivitamin|prescription|rx |pharmacy)\b/i },
]

// Returns a shallow-cloned items array with `category` filled in where Gemini
// left it null. Items already classified are returned unchanged.
export function autoCategorize(items) {
  if (!Array.isArray(items)) return items
  return items.map(it => {
    if (!it || it.category) return it
    const name = String(it.item_name || '')
    const match = RULES.find(r => r.re.test(name))
    return match ? { ...it, category: match.slug } : it
  })
}
