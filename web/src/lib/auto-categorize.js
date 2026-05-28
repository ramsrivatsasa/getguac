// Server-side keyword fallback for item-level categorization.
// Runs after Gemini/Groq returns parsed items. If the model didn't classify an
// item, regex on item_name maps common brands and kinds to a preset slug.
// Items still null after this stay null — the UI shows them as "Uncategorized".
//
// Order matters: more specific rules first (coke before generic soda, milkshake
// before milk, etc.). The first match wins.

// Order matters: more-specific rules first. The first match wins. Health
// (vitamins, protein) must come BEFORE pharmacy because "vitamin" used to
// route to wellness. Personal-care must come BEFORE household because
// "soap" matches both dish soap (household) and hand soap (personal-care)
// — keyword precedence handles the disambiguation.
const RULES = [
  { slug: 'tea',           re: /\b(tea|matcha|chai|oolong|earl ?grey|chamomile|green ?tea|black ?tea)\b/i },
  // Snacks — packaged dry goods, sweet/salty treats. Matched BEFORE 'grub'
  // and 'eats' so chips/popcorn/granola don't end up in generic grub.
  { slug: 'snacks',        re: /\b(chips|tortilla chips|pretzel|pretzels|crackers|cracker box|popcorn|pop[- ]?corn|granola bar|protein bar|trail mix|nuts mix|cashews|almonds|peanuts|pistachios|walnuts|jerky|beef jerky|fruit snacks?|gummy bears|gummies|candy|chocolate bar|kit ?kat|snickers|m&m|reese'?s|hershey|cookies|oreo|chips ahoy|goldfish crackers|cheez[- ]?its?|doritos|cheetos|fritos|lay'?s|ruffles|takis|pringles|sun chips)\b/i },
  { slug: 'drinks',        re: /\b(coffee|latte|espresso|mocha|cappuccino|americano|cold ?brew|frappuccino|starbucks|dunkin|peet'?s|nespresso|keurig|coca[- ]?cola|coke(?! ?zero)?|cherry coke|coke ?\d?l|pepsi|mountain ?dew|mtn ?dew|mtn-?dew|sprite|fanta|7[- ]?up|dr ?pepper|root ?beer|ginger ?ale|milk ?shake|frosty|smoothie king|juice|\boj\b|minute maid|tropicana|simply orange|naked juice|pomegranate juice|gatorade|powerade|vitamin ?water|red bull|monster|rockstar|celsius)\b/i },
  { slug: 'bars',          re: /\b(beer|ipa|lager|ale|stout|pilsner|porter|budweiser|coors|miller|heineken|guinness|wine|cabernet|merlot|chardonnay|sauvignon|pinot|tequila|vodka|whiskey|whisky|bourbon|scotch|gin|rum|cocktail|margarita|martini|mojito|champagne|prosecco|sake)\b/i },
  // Bank fees — anything the cardholder paid the bank itself for. Match
  // before generic "fee" so a "service fee" at a restaurant doesn't get
  // misrouted — the bank-fee keywords are specific to issuer statements.
  { slug: 'bank-fees',     re: /\b(balance ?transfer( fee)?|purchase interest|interest charge|finance charge|annual fee|late fee|overdraft( fee)?|atm fee|foreign transaction fee|cash advance fee|returned payment( fee)?|monthly (service|maintenance) fee|wire (transfer )?fee|nsf fee|over[- ]?limit fee)\b/i },
  // Cloud / web infrastructure — match the merchant name AND common item
  // line phrasings ("Domain renewal — 1y", ".com renewal", "Hosting plan").
  // Must come before generic 'subs' so domain/hosting fees don't end up in
  // streaming. Doesn't grab consumer SaaS (Adobe, Notion) — those stay subs.
  { slug: 'cloud',         re: /\b(ionos|godaddy|namecheap|hostinger|bluehost|siteground|dreamhost|name\.com|cloudflare|vercel|netlify|digitalocean|linode|aws|amazon web services|google cloud|gcp|microsoft azure|\bazure\b|domain (fee|renewal|registration|transfer|privacy)|\.com renewal|\.net renewal|\.org renewal|\.io renewal|web ?hosting( plan)?|shared hosting|vps|dedicated server|cloud (hosting|storage|server|compute|infra)|ssl certificate|cdn|email hosting|workspace plan|google workspace|microsoft 365 (business|enterprise)|prepaid (hosting|domain))\b/i },
  // Utilities — match common provider patterns AND keyword variants so
  // mobile/internet/electric/gas/water/trash/insurance bills route to bills.
  { slug: 'bills',         re: /\b(electric(ity)? bill|gas bill|natural gas|water bill|sewer|trash (service|bill|pickup)|garbage (service|bill|pickup)|mobile (service|bill|plan)|cell ?phone|cellular|wireless plan|landline|home phone|internet (bill|service|plan)|isp |fios|verizon (wireless|fios|fixed)|comcast|xfinity|att fiber|spectrum|t[- ]?mobile|sprint|cricket|metro pcs|google fi|mint mobile|consolidated edison|con ?edison|pse&g|pseg|national grid|dominion energy|duke energy|pg&e|conservation utility)\b/i },
  { slug: 'gas-up',        re: /\b(unleaded|regular gas|premium gas|diesel|fuel|gasoline|gallons?)\b/i },
  { slug: 'health',        re: /\b(vitamin|multivitamin|protein ?(powder|bar|shake)?|whey|creatine|bcaa|electrolyte|supplement|fish ?oil|omega[- ]?3|magnesium|biotin|collagen|melatonin|probiotic|elderberry|ashwagandha)\b/i },
  { slug: 'pharmacy',      re: /\b(advil|tylenol|aspirin|ibuprofen|acetaminophen|naproxen|aleve|benadryl|claritin|zyrtec|allegra|prescription|rx |pharmacy|band[- ]?aid|bandages?|antiseptic|hydrogen peroxide|cough drops?|nyquil|dayquil|sudafed|mucinex|robitussin)\b/i },
  { slug: 'personal-care', re: /\b(toothpaste|toothbrush|mouthwash|floss|dental floss|shampoo|conditioner|hair (gel|spray|wax)|body ?wash|hand ?soap|bar ?soap|dove|olay|cetaphil|cerave|moisturizer|lotion|sunscreen|deodorant|antiperspirant|razor|shaving|aftershave|tampon|pad |sanitary|makeup|lipstick|mascara|foundation|eyeliner|perfume|cologne|nail polish)\b/i },
  { slug: 'household',     re: /\b(toilet ?paper|bath ?tissue|paper ?towel|napkin|tissue paper|kleenex|aluminum foil|cling ?wrap|plastic wrap|ziploc|trash bag|garbage bag|laundry detergent|fabric softener|dryer sheet|dish ?soap|dishwashing|cascade|finish|all[- ]?purpose cleaner|windex|lysol|clorox|bleach|swiffer|mop|broom|sponge|paper plates?|paper cups?|aluminum can|light bulb|battery|batteries|aaa|aa battery)\b/i },
]

// Returns a shallow-cloned items array with `category` filled in where Gemini
// left it null. Items already classified are returned unchanged.
export function autoCategorize(items) {
  if (!Array.isArray(items)) return items
  return items.map(it => {
    if (!it || it.category) return it
    // Guard against item_name being non-string (object/array from a
    // malformed parse). Stringifying `{}` produces "[object Object]"
    // which can spuriously match permissive rules.
    if (typeof it.item_name !== 'string' || it.item_name.length === 0) return it
    const match = RULES.find(r => r.re.test(it.item_name))
    return match ? { ...it, category: match.slug } : it
  })
}
