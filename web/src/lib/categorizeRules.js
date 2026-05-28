// Rule-based store-name → category guesser. Free, instant, covers the
// 80% case (the recognizable retail chains and well-known patterns). Anything
// it can't match returns null, and the caller can fall back to AI.
//
// Returns one of the category slugs from lib/categories.js, or null.

// ─────────────────────────────────────────────────────────────────────────
// Gas-station detection — exported so the save pipeline + the backfill
// endpoint can apply this rule consistently. "If it's a fuel purchase,
// it's gas-up, period" — even at warehouse-club stations (Costco / Sam's /
// BJ's), which the AI sometimes routes to 'grub' because the store IS
// a grocery store. Override happens AFTER AI + Tier-2 inference but
// BEFORE user_category — user pick still wins.
//
// Detection: store-name brand match OR item-name fuel keywords. Either
// signal is enough.
// ─────────────────────────────────────────────────────────────────────────
export const GAS_STATION_STORE_RE = /\b(shell|chevron|exxon|exxonmobil|mobil|bp\b|sunoco|valero|texaco|arco|conoco|phillips ?66|76 (gas|station)|marathon|amoco|citgo|circle k|wawa|sheetz|pilot (flying ?j|travel)|flying ?j|loves? travel|race ?trac|raceway|kwik trip|kwik star|maverik|murphy (usa|express)|costco gas|costco gasoline|costco fuel|sams? gas|sam'?s club gas|bj'?s gas|bj gas|gas station|gasoline|fuel ?(station|stop|center|center))\b/i
export const GAS_ITEM_RE = /\b(unleaded|regular ?gas|premium ?gas|mid[- ]?grade|diesel|gasoline|gallons?|pump ?\d|fuel grade|fuel \d|gas pump)\b/i

/**
 * True when this receipt is a gas-station fill-up.
 *
 * Detection order — ITEMS FIRST, STORE SECOND:
 *   1. Any item name matches fuel keywords (unleaded, gallons, …).
 *   2. Store name matches a known gas-station brand.
 *
 * Items take priority because a "Costco" receipt with an "UNLEADED" line
 * is unambiguously a gas-station purchase even though Costco itself is
 * a grocery store. The store check is the fallback for receipts where
 * the item list is empty or non-specific ("Pump 5", "Transaction").
 */
export function isGasStationReceipt(storeName, items = []) {
  // 1) Item-name check first.
  if (Array.isArray(items)) {
    for (const it of items) {
      const name = String(it?.item_name || it || '')
      if (name && GAS_ITEM_RE.test(name)) return true
    }
  }
  // 2) Store-name fallback.
  if (storeName && GAS_STATION_STORE_RE.test(String(storeName))) return true
  return false
}

// ─────────────────────────────────────────────────────────────────────────
// CENTRAL CATEGORIZATION ENGINE
//
// One function, one place: `applyCategoryRules(receipt, items)`. Every
// surface that needs to decide "what category is this receipt?" calls
// this — the save pipeline, the backfill endpoints, the future cron
// re-categorizer. Each rule checks ITEMS first then STORE so a "Costco"
// gas-pump receipt routes to gas-up, not grub.
//
// Returns a category slug (one of lib/categories.js) or null if no rule
// fires. Callers fall back to AI / Tier-2 / user pick when null.
//
// To add a new rule: append to RULE_ORDER below. Keep more-specific
// rules earlier so they win against generic ones.
// ─────────────────────────────────────────────────────────────────────────
const RULE_ORDER = [
  { cat: 'gas-up', test: isGasStationReceipt },
  // Future: { cat: 'eats', test: isRestaurantReceipt },
  //         { cat: 'bank-fees', test: isBankChargeReceiptDeep },
  //         ... — each test takes (storeName, items), returns boolean.
]

/**
 * Decide the rule-tier category for a receipt. Item-first, store-second
 * inside each test; rules tried in declared order.
 *
 * @param {{store_name?: string}} receipt
 * @param {Array<{item_name?: string}>} items
 * @returns {string|null} category slug or null when no rule fires
 */
export function applyCategoryRules(receipt, items = []) {
  const storeName = receipt?.store_name ?? receipt
  for (const r of RULE_ORDER) {
    if (r.test(storeName, items)) return r.cat
  }
  return null
}

// Order matters when patterns overlap (e.g. "shell gas" should hit gas-up
// before any other match). Higher-priority rules come first.
const RULES = [
  // ── Subscriptions (catch BEFORE tech so Netflix doesn't fall into tech)
  { cat: 'subs', re: /\b(netflix|spotify|apple music|apple\.com\/bill|itunes\.com\/bill|youtube premium|youtube music|amazon prime video|prime video|hulu|disney\+|disney plus|hbo max|max\.com|paramount\+|peacock|crunchyroll|funimation|sling tv|fubotv|directv stream|sirius ?xm|audible|kindle unlimited)\b/i },
  { cat: 'subs', re: /\b(dropbox|google one|google workspace|microsoft 365|office 365|icloud\+?|backblaze|carbonite|1password|lastpass|bitwarden)\b/i },
  { cat: 'subs', re: /\b(adobe|creative cloud|figma|notion|canva|github|gitlab|grammarly|evernote|todoist|trello|asana|airtable|webflow|squarespace|wix\.com|wordpress\.com|substack)\b/i },
  { cat: 'subs', re: /\b(openai|chatgpt|chat ?gpt|claude\.ai|anthropic|midjourney|runway|elevenlabs|perplexity|cursor\.com|copilot subscription)\b/i },
  { cat: 'subs', re: /\b(playstation plus|psn\b|xbox game pass|nintendo switch online|ea play|ubisoft\+)\b/i },
  { cat: 'subs', re: /\b(nyt\b|new york times|wsj\b|wall street journal|washington post|economist|bloomberg subscription|medium subscription|patreon|onlyfans)\b/i },
  { cat: 'subs', re: /\b(subscription|recurring|monthly plan|annual plan|membership renewal)\b/i },

  // ── Utility bills — strong brand match
  { cat: 'bills', re: /\b(verizon wireless|verizon fios|at&?t wireless|at&?t mobility|t-?mobile|sprint|mint mobile|google fi|cricket wireless|boost mobile|metro pcs|metropcs|us cellular|tracfone|straight talk|consumer cellular|xfinity mobile|spectrum mobile|visible|ting mobile)\b/i },
  { cat: 'bills', re: /\b(comcast|xfinity|spectrum (internet|cable)|cox (communications|internet)|rcn|frontier (communications|fios)|optimum|altice|centurylink|earthlink|google fiber|sonic\.net|starlink|hughesnet|viasat|ziply)\b/i },
  { cat: 'bills', re: /\b(pg&?e|pacific gas|sce\b|southern california edison|con ?ed|coned|consolidated edison|com ?ed|comed|duke energy|florida power & light|fpl\b|dominion energy|national grid|nstar|eversource|xcel energy|ameren|nipsco|austin energy|ladwp|seattle city light|tva\b|tampa electric)\b/i },
  { cat: 'bills', re: /\b(water (department|utility|bill)|sewer (department|bill)|trash (service|pickup)|waste management|republic services)\b/i },
  { cat: 'bills', re: /\b(geico|progressive|state farm|allstate|liberty mutual|farmers insurance|usaa|metlife|aaa insurance|nationwide|esurance|the general)\b/i },
  { cat: 'bills', re: /\b(utility|utilities|electric bill|water bill|sewer|broadband|wi[- ]?fi service)\b/i },

  // ── Office / school / stationery
  { cat: 'supplies', re: /\b(staples|office depot|office ?max|the office store|paper source|the container store|michaels|jo-?ann( fabric)?|hobby lobby|blick art|dick blick|aaron brothers|the art store)\b/i },
  { cat: 'supplies', re: /\b(office supplies?|stationery|stationary store|school supplies|printer ink|toner cartridge|pens? & pencils?)\b/i },

  // Gas / fuel — distinctive brands, easy
  { cat: 'gas-up', re: GAS_STATION_STORE_RE },

  // Restaurants / fast food / coffee — strong eats indicators
  { cat: 'eats',   re: /\b(starbucks|peet's|peets coffee|dunkin|tim hortons|caribou|philz|blue bottle)\b/i },
  { cat: 'eats',   re: /\b(mcdonald|burger king|wendy|taco bell|chipotle|qdoba|panera|panda express|kfc|popeyes|chick-?fil-?a|subway|jimmy john|jersey mike|five guys|in-?n-?out|shake shack|culvers|raising cane|whataburger|sonic drive|domino|papa john|pizza hut|little caesars|round table pizza|papa murphy)\b/i },
  { cat: 'eats',   re: /\b(olive garden|red lobster|applebee|chili's|tgi friday|outback|cheesecake factory|texas roadhouse|cracker barrel|denny|ihop|waffle house|p\.?f\.? chang|cheesecake|the cheesecake factory)\b/i },
  { cat: 'eats',   re: /\b(restaurant|cafe|café|bistro|grill|kitchen|diner|bakery|deli|sushi|ramen|pho|taqueria|cantina|brewing|brewery|pub\b|tavern|bar & grill|steakhouse|pizzeria|coffee shop|food truck|catering|bbq|barbecue|noodle|dumpling)\b/i },
  { cat: 'eats',   re: /\b(doordash|uber eats|grubhub|postmates|seamless|caviar|instacart restaurants)\b/i },

  // Groceries / food shopping
  { cat: 'grub',   re: /\b(whole foods|trader joe|sprouts|safeway|kroger|publix|wegmans|h-?e-?b|albertsons|food lion|giant eagle|stop ?& ?shop|shoprite|winn[- ]?dixie|aldi|lidl|fairway|raleys|fred meyer|smith's|harris teeter|pavilions|vons|ralph's|gelson|bristol farms|erewhon|new seasons|fresh market|the fresh market|99 ranch|h mart|patel brothers|mitsuwa|nijiya|seafood city|cermak|jewel[- ]osco|food 4 less)\b/i },
  { cat: 'grub',   re: /\b(grocery|supermarket|food mart|market\b|farmers market|farm stand|produce|butcher)\b/i },
  { cat: 'grub',   re: /\b(instacart|amazon fresh|amazon grocery|gopuff|getir|jokr|shipt)\b/i },

  // Tech / electronics — one-time hardware purchases. Subscriptions are
  // caught by the `subs` rules above, so they never reach here.
  { cat: 'tech',   re: /\b(apple store|best buy|micro center|microcenter|b&h photo|adorama|frys electronics|fry's electronics|newegg|tigerdirect|gamestop|game stop)\b/i },
  { cat: 'tech',   re: /\b(electronics|computer|laptop|gadget|smartphone|console|gaming)\b/i },

  // Home / hardware / appliances
  { cat: 'big-stuff', re: /\b(best buy.*appliance|home depot.*appliance|lowes.*appliance|appliances?|refrigerator|washer dryer|dishwasher|hvac|furnace)\b/i },
  { cat: 'fix-it',    re: /\b(home depot|lowes|lowe's|menards|ace hardware|harbor freight|true value|tractor supply|do it best|northern tool)\b/i },
  { cat: 'fix-it',    re: /\b(hardware|tools|paint|plumbing|electrical supply|lumber)\b/i },

  // Outdoors / garden / plants
  { cat: 'outdoors', re: /\b(rei|backcountry|cabela|bass pro|dick's sporting|academy sports|big 5|columbia sports|patagonia|north face|llbean|l\.l\. ?bean|orvis|moosejaw)\b/i },
  { cat: 'outdoors', re: /\b(garden|nursery|landscape|hardscape|sod|mulch|seed|sod farm|plant store|orchard supply)\b/i },

  // Clothes
  { cat: 'fits',     re: /\b(nordstrom|macy's|macys|kohls|kohl's|tj ?maxx|tjmaxx|marshall's|marshalls|ross dress|burlington|nordstrom rack|saks|neiman|bloomingdale|j ?crew|jcrew|gap\b|old navy|banana republic|h&m|h ?and ?m|uniqlo|zara|forever 21|express|american eagle|aerie|hollister|abercrombie|levi|levi's|nike|adidas|under armour|lululemon|athleta|footlocker|foot locker|champs sports|finish line|dsw|shoe carnival|payless|famous footwear)\b/i },
  { cat: 'fits',     re: /\b(clothing|apparel|fashion|boutique|shoes|sneaker|outerwear|menswear|womenswear|kids? clothing)\b/i },

  // Wellness / pharmacy / fitness
  { cat: 'wellness', re: /\b(cvs|walgreens|rite aid|rite-aid|walmart pharmacy|costco pharmacy|kaiser pharmacy|good?rx|amazon pharmacy)\b/i },
  { cat: 'wellness', re: /\b(planet fitness|24 hour fitness|equinox|life ?time fitness|orange ?theory|crossfit|soul ?cycle|peloton|gym|yoga|pilates|barre|chiropractor|dental|dentist|optometrist|vision center|lenscrafters|warby parker|pearle vision)\b/i },
  { cat: 'wellness', re: /\b(pharmacy|drug store|drugstore|vitamin|supplement|wellness|clinic|urgent care|hospital|medical)\b/i },

  // Entertainment / fun
  { cat: 'fun',      re: /\b(amc theatres?|amc theater|regal cinema|cinemark|alamo drafthouse|landmark theatres|imax|drive-?in|movie theater)\b/i },
  { cat: 'fun',      re: /\b(disneyland|disney world|universal studios|six flags|cedar point|knotts berry|sea ?world|legoland|magic kingdom|epcot|hollywood studios|animal kingdom)\b/i },
  { cat: 'fun',      re: /\b(ticketmaster|stubhub|seatgeek|vivid seats|axs\b|live nation|concert|arena|stadium)\b/i },
  { cat: 'fun',      re: /\b(steam|epic games|playstation store|nintendo eshop|xbox live|battle\.net|twitch)\b/i },

  // Gifting — harder, mostly inferred from items, skip in v1

  // General-purpose / department stores → misc (parser may have items hint)
  { cat: 'misc',     re: /\b(target|walmart|costco|sams club|sam's club|bjs|bj's wholesale|amazon\.com|amazon\.|amzn|aliexpress|temu|ebay|etsy|wayfair|ikea|pier 1|world market|bed bath|container store)\b/i },
]

// ─────────────────────────────────────────────────────────────────────────
// Per-item sub-tag guesser. Used to enrich grocery / bills / subs receipts
// with fine-grained tags (pantry / vegetables / mobile / streaming / …).
// Pure name-based, returns a sub-tag slug from SUB_TAGS_BY_CATEGORY or null.
// ─────────────────────────────────────────────────────────────────────────
const SUB_TAG_RULES = {
  // ── Grub line items ──
  grub: [
    { tag: 'vegetables', re: /\b(broccoli|spinach|kale|lettuce|romaine|arugula|carrot|onion|garlic|potato|pepper|tomato|cucumber|celery|zucchini|cauliflower|cabbage|asparagus|brussel sprouts?|sweet potato|yam|squash|pumpkin|mushroom|avocado|beet|leek|radish|turnip|eggplant|corn|bok choy|chard|fennel|salad mix)\b/i },
    { tag: 'fruit',      re: /\b(apple|banana|orange|grape|berry|berries|strawberr|blueberr|raspberr|blackberr|peach|nectarine|plum|cherry|cherries|mango|pineapple|kiwi|melon|watermelon|cantaloupe|honeydew|pear|lemon|lime|grapefruit|pomegranate|fig|date)\b/i },
    { tag: 'meat',       re: /\b(beef|chicken|pork|bacon|sausage|turkey|lamb|veal|ground beef|ribeye|sirloin|brisket|tenderloin|chuck|chop|ham\b|jerky|pepperoni|salami|prosciutto)\b/i },
    { tag: 'seafood',    re: /\b(salmon|tuna|cod|halibut|tilapia|trout|mahi|swordfish|sardines?|anchov|shrimp|prawn|lobster|crab|clam|mussel|oyster|squid|calamari|octopus|scallop)\b/i },
    { tag: 'eggs',       re: /\beggs?\b/i },
    { tag: 'dairy',      re: /\b(milk|cream|butter|cheese|cheddar|mozzarella|parmesan|gouda|brie|feta|gruyere|yogurt|yoghurt|sour cream|cottage cheese|kefir|half ?and ?half)\b/i },
    { tag: 'spices',     re: /\b(salt|pepper|paprika|cumin|coriander|turmeric|cinnamon|nutmeg|clove|cardamom|basil|oregano|thyme|rosemary|sage|bay leaf|saffron|chili powder|garam masala|spice|seasoning)\b/i },
    { tag: 'baking',     re: /\b(flour|sugar|brown sugar|powdered sugar|baking soda|baking powder|yeast|vanilla extract|cocoa powder|chocolate chips?|oats?|cornstarch|breadcrumbs?|cake mix|pie crust|bread\b|baguette|loaf|tortilla|pita)\b/i },
    { tag: 'frozen',     re: /\b(frozen|ice cream|popsicle|sorbet|gelato|frozen pizza|frozen meal|tv dinner|frozen vegetable|frozen fruit)\b/i },
    { tag: 'snacks',     re: /\b(chips?|crackers?|cookie|popcorn|pretzel|nuts?|almonds?|cashews?|peanuts?|trail mix|granola bar|protein bar|candy|chocolate bar|gum\b|jerky|fruit snack)\b/i },
    { tag: 'beverages',  re: /\b(water bottle|sparkling water|seltzer|soda|cola|pepsi|sprite|juice|orange juice|apple juice|cranberry juice|smoothie|kombucha|coffee\b|tea\b|matcha|energy drink|red bull|monster|gatorade|powerade|wine\b|beer\b|cider|liquor|spirits)\b/i },
    { tag: 'pantry',     re: /\b(rice|pasta|noodle|spaghetti|macaroni|quinoa|couscous|lentil|bean|chickpea|canned|soup|broth|stock|sauce|ketchup|mustard|mayonnaise|olive oil|vegetable oil|vinegar|soy sauce|hot sauce|salsa|peanut butter|jam\b|jelly|honey|maple syrup|cereal|oatmeal)\b/i },
    { tag: 'household',  re: /\b(toilet paper|paper towel|napkin|tissue|kleenex|laundry detergent|dish soap|sponge|trash bag|aluminum foil|plastic wrap|ziploc|cling film|paper plate)\b/i },
  ],
  // ── Bills line items ──
  bills: [
    { tag: 'mobile',      re: /\b(verizon wireless|at&?t wireless|t-?mobile|sprint|mint mobile|google fi|cricket|boost|metro pcs|tracfone|cellular|wireless plan|mobile (plan|service|bill))\b/i },
    { tag: 'internet',    re: /\b(comcast|xfinity|spectrum (internet|cable)|cox internet|fios|frontier internet|optimum|centurylink|google fiber|sonic\.net|starlink|hughesnet|viasat|broadband|wi[- ]?fi)\b/i },
    { tag: 'electricity', re: /\b(electric|electricity|pg&?e|sce|coned|comed|duke energy|fpl|dominion|national grid|xcel|ameren|ladwp|seattle city light|tva)\b/i },
    { tag: 'water',       re: /\b(water (department|utility|bill)|sewer)\b/i },
    { tag: 'natural-gas', re: /\b(natural gas|gas (bill|utility|service)|pse&?g|nicor|southwest gas|atmos)\b/i },
    { tag: 'trash',       re: /\b(trash|garbage|waste management|republic services|recycle pickup)\b/i },
    { tag: 'insurance',   re: /\b(insurance|geico|progressive|state farm|allstate|liberty mutual|usaa|farmers insurance)\b/i },
  ],
  // ── Subs line items ──
  subs: [
    { tag: 'streaming',  re: /\b(netflix|hulu|disney\+|hbo|max\.com|paramount\+|peacock|prime video|crunchyroll|youtube tv|sling|fubo|sirius ?xm)\b/i },
    { tag: 'music',      re: /\b(spotify|apple music|youtube music|tidal|deezer|pandora|audible)\b/i },
    { tag: 'software',   re: /\b(adobe|creative cloud|microsoft 365|office 365|figma|notion|canva|github|gitlab|grammarly|1password|lastpass)\b/i },
    { tag: 'cloud',      re: /\b(dropbox|google one|icloud|backblaze|carbonite|aws\b|gcp\b|azure)\b/i },
    { tag: 'news',       re: /\b(nyt|new york times|wsj|wall street journal|washington post|economist|bloomberg|substack|medium)\b/i },
    { tag: 'gaming-sub', re: /\b(playstation plus|psn|xbox game pass|nintendo switch online|ea play|ubisoft\+)\b/i },
    { tag: 'ai-tools',   re: /\b(openai|chatgpt|chat ?gpt|claude\.ai|anthropic|midjourney|runway|elevenlabs|perplexity|cursor)\b/i },
  ],
  // ── Supplies line items ──
  supplies: [
    { tag: 'stationery', re: /\b(pen|pencil|notebook|notepad|stationery|sticky note|post[- ]?it|highlighter|marker|eraser|ruler|stapler|paperclip|binder|folder)\b/i },
    { tag: 'print',      re: /\b(ink|toner|cartridge|printer paper|copy paper)\b/i },
    { tag: 'school',     re: /\b(backpack|lunchbox|crayon|colored pencil|glue stick|safety scissors|composition book|index card|construction paper)\b/i },
    { tag: 'craft',      re: /\b(yarn|fabric|sewing|knitting|paint brush|canvas|easel|sketchbook|clay|bead|ribbon)\b/i },
    { tag: 'office',     re: /\b(desk|monitor stand|office chair|keyboard|mouse pad|filing cabinet|shredder|laminator|whiteboard)\b/i },
  ],
}

// Returns a Set of sub-tag slugs detected across the given item names for
// the given category. Best-effort — empty Set if nothing matched.
export function guessSubTags(category, itemNames = []) {
  const rules = SUB_TAG_RULES[category]
  if (!rules || !Array.isArray(itemNames) || itemNames.length === 0) return new Set()
  const tags = new Set()
  for (const name of itemNames) {
    if (!name) continue
    for (const r of rules) if (r.re.test(name)) tags.add(r.tag)
  }
  return tags
}

export function guessCategory(storeName, items = []) {
  if (!storeName) return null
  const haystack = String(storeName).trim()
  for (const r of RULES) {
    if (r.re.test(haystack)) return r.cat
  }
  // Item-level second pass — if any line items have a category, take the
  // mode. Useful when the store name is generic but items are tagged.
  if (Array.isArray(items) && items.length > 0) {
    const counts = new Map()
    for (const it of items) {
      if (!it?.category) continue
      counts.set(it.category, (counts.get(it.category) || 0) + 1)
    }
    if (counts.size > 0) {
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    }
  }
  return null
}
