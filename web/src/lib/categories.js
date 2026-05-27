// Spending categories with catchy short names + emojis + colors.
// These live in one place so the picker, badge, parser, and analytics agree.
//
// health_tier on each preset is the default healthiness signal that flows into
// the future Guac Health Score. Per-item override lives on receipt_items.health_tier.
// Tiers: 'healthy' | 'neutral' | 'treat' | 'harmful'.
export const HEALTH_TIERS = ['healthy', 'neutral', 'treat', 'harmful']

export const CATEGORIES = [
  { slug: 'grub',          label: 'Grub',          emoji: '🥑', desc: 'Groceries & food shopping',                color: 'emerald', health_tier: 'neutral' },
  { slug: 'eats',          label: 'Eats',          emoji: '🍽️', desc: 'Restaurants & dining',                      color: 'orange',  health_tier: 'neutral' },
  { slug: 'bars',          label: 'Bars',          emoji: '🍻', desc: 'Bars, beer, wine & spirits',                color: 'fuchsia', health_tier: 'treat'   },
  { slug: 'tea',           label: 'Tea',           emoji: '🍵', desc: 'Tea & matcha',                              color: 'emerald', health_tier: 'healthy' },
  { slug: 'drinks',        label: 'Drinks',        emoji: '🥤', desc: 'Coffee, sodas, juice, shakes — non-tea, non-alcohol beverages', color: 'red',  health_tier: 'treat' },
  { slug: 'subs',          label: 'Subs',          emoji: '🔁', desc: 'Streaming + recurring subscriptions',       color: 'violet',  health_tier: 'neutral' },
  { slug: 'bills',         label: 'Bills',         emoji: '💡', desc: 'Utilities — mobile, internet, power',       color: 'sky',     health_tier: 'neutral' },
  { slug: 'tech',          label: 'Tech',          emoji: '📱', desc: 'Electronics, gadgets, computers',           color: 'sky',     health_tier: 'neutral' },
  { slug: 'big-stuff',     label: 'Big Stuff',     emoji: '🔌', desc: 'Appliances & large purchases',              color: 'indigo',  health_tier: 'neutral' },
  { slug: 'fix-it',        label: 'Fix-It',        emoji: '🛠️', desc: 'Home maintenance, hardware, tools',         color: 'amber',   health_tier: 'neutral' },
  { slug: 'outdoors',      label: 'Outdoors',      emoji: '🌳', desc: 'Garden, yard, plants',                      color: 'lime',    health_tier: 'healthy' },
  { slug: 'supplies',      label: 'Supplies',      emoji: '📎', desc: 'Stationery, office & school supplies',      color: 'indigo',  health_tier: 'neutral' },
  { slug: 'fits',          label: 'Fits',          emoji: '👔', desc: 'Clothing & shoes',                          color: 'fuchsia', health_tier: 'neutral' },
  { slug: 'pharmacy',      label: 'Pharmacy',      emoji: '💊', desc: 'Rx, OTC meds, first aid',                   color: 'rose',    health_tier: 'healthy' },
  { slug: 'health',        label: 'Health',        emoji: '🥗', desc: 'Vitamins, supplements, protein, sports nutrition', color: 'emerald', health_tier: 'healthy' },
  { slug: 'personal-care', label: 'Personal Care', emoji: '🪥', desc: 'Toothpaste, soap, shampoo, deodorant, skincare', color: 'pink', health_tier: 'neutral' },
  { slug: 'household',     label: 'Household',     emoji: '🧻', desc: 'Bath tissue, paper towels, dish soap, detergent, cleaning', color: 'amber', health_tier: 'neutral' },
  { slug: 'gas-up',        label: 'Gas Up',        emoji: '⛽', desc: 'Fuel & auto service',                       color: 'red',     health_tier: 'neutral' },
  { slug: 'fun',           label: 'Fun',           emoji: '🎬', desc: 'Entertainment, concerts, gaming',           color: 'violet',  health_tier: 'neutral' },
  { slug: 'gifting',       label: 'Gifting',       emoji: '🎁', desc: 'Gifts for others',                          color: 'pink',    health_tier: 'neutral' },
  { slug: 'charity',       label: 'Charity',       emoji: '❤️', desc: 'Donations, tithes, contributions',          color: 'rose',    health_tier: 'neutral' },
  { slug: 'misc',          label: 'Misc',          emoji: '📦', desc: 'Anything else',                             color: 'gray',    health_tier: 'neutral' },
]

// Optional fine-grained tags per category. These live alongside the
// top-level category (a grocery receipt is `category: 'grub'` and may carry
// `tags: ['vegetables', 'meat']`). Designed for the receipt/item picker UI.
export const SUB_TAGS_BY_CATEGORY = {
  grub: [
    { slug: 'pantry',     emoji: '🥫', label: 'Pantry' },
    { slug: 'snacks',     emoji: '🍿', label: 'Snacks' },
    { slug: 'vegetables', emoji: '🥦', label: 'Veggies' },
    { slug: 'fruit',      emoji: '🍎', label: 'Fruit' },
    { slug: 'meat',       emoji: '🥩', label: 'Meat' },
    { slug: 'seafood',    emoji: '🐟', label: 'Seafood' },
    { slug: 'eggs',       emoji: '🥚', label: 'Eggs' },
    { slug: 'dairy',      emoji: '🧀', label: 'Dairy' },
    { slug: 'spices',     emoji: '🌶️', label: 'Spices' },
    { slug: 'baking',     emoji: '🥖', label: 'Baking' },
    { slug: 'frozen',     emoji: '🧊', label: 'Frozen' },
    { slug: 'beverages',  emoji: '🥤', label: 'Beverages' },
    { slug: 'household',  emoji: '🧻', label: 'Household' },
  ],
  bars: [
    { slug: 'beer',       emoji: '🍺', label: 'Beer' },
    { slug: 'wine',       emoji: '🍷', label: 'Wine' },
    { slug: 'cocktail',   emoji: '🍸', label: 'Cocktail' },
    { slug: 'spirits',    emoji: '🥃', label: 'Spirits' },
  ],
  bills: [
    { slug: 'mobile',      emoji: '📱', label: 'Mobile' },
    { slug: 'internet',    emoji: '📡', label: 'Internet' },
    { slug: 'electricity', emoji: '💡', label: 'Electric' },
    { slug: 'water',       emoji: '💧', label: 'Water' },
    { slug: 'natural-gas', emoji: '🔥', label: 'Gas' },
    { slug: 'trash',       emoji: '🗑️', label: 'Trash' },
    { slug: 'insurance',   emoji: '🛡️', label: 'Insurance' },
  ],
  subs: [
    { slug: 'streaming',   emoji: '📺', label: 'Streaming' },
    { slug: 'music',       emoji: '🎵', label: 'Music' },
    { slug: 'software',    emoji: '💻', label: 'Software' },
    { slug: 'cloud',       emoji: '☁️', label: 'Cloud' },
    { slug: 'news',        emoji: '📰', label: 'News' },
    { slug: 'gaming-sub',  emoji: '🎮', label: 'Gaming' },
    { slug: 'gym-sub',     emoji: '🏋️', label: 'Gym' },
    { slug: 'ai-tools',    emoji: '🤖', label: 'AI tools' },
  ],
  supplies: [
    { slug: 'office',      emoji: '🖥️', label: 'Office' },
    { slug: 'school',      emoji: '🎒', label: 'School' },
    { slug: 'stationery',  emoji: '🖊️', label: 'Stationery' },
    { slug: 'craft',       emoji: '🎨', label: 'Craft' },
    { slug: 'print',       emoji: '🖨️', label: 'Print/ink' },
  ],
  pharmacy: [
    { slug: 'otc',         emoji: '💊', label: 'OTC meds' },
    { slug: 'prescription', emoji: '📝', label: 'Prescription' },
    { slug: 'first-aid',   emoji: '🩹', label: 'First aid' },
    { slug: 'dental',      emoji: '🦷', label: 'Dental' },
    { slug: 'vision',      emoji: '👓', label: 'Vision' },
    { slug: 'medical',     emoji: '🩺', label: 'Medical' },
  ],
  health: [
    { slug: 'vitamins',    emoji: '🌿', label: 'Vitamins' },
    { slug: 'supplements', emoji: '💪', label: 'Supplements' },
    { slug: 'protein',     emoji: '🥤', label: 'Protein' },
    { slug: 'sports',      emoji: '🏃', label: 'Sports nutrition' },
    { slug: 'fitness',     emoji: '🏋️', label: 'Fitness gear' },
  ],
  'personal-care': [
    { slug: 'oral',        emoji: '🪥', label: 'Oral care' },
    { slug: 'bath',        emoji: '🧼', label: 'Bath & body' },
    { slug: 'hair',        emoji: '🧴', label: 'Hair care' },
    { slug: 'skincare',    emoji: '🧴', label: 'Skincare' },
    { slug: 'makeup',      emoji: '💄', label: 'Makeup' },
    { slug: 'feminine',    emoji: '🌸', label: 'Feminine care' },
    { slug: 'shaving',     emoji: '🪒', label: 'Shaving' },
  ],
  household: [
    { slug: 'paper-goods', emoji: '🧻', label: 'Paper goods' },
    { slug: 'cleaning',    emoji: '🧽', label: 'Cleaning' },
    { slug: 'laundry',     emoji: '🧺', label: 'Laundry' },
    { slug: 'dishwashing', emoji: '🍽️', label: 'Dishwashing' },
    { slug: 'pest',        emoji: '🪤', label: 'Pest control' },
    { slug: 'lighting',    emoji: '💡', label: 'Light bulbs' },
  ],
}

export const SUB_TAG_BY_SLUG = (() => {
  const m = new Map()
  for (const arr of Object.values(SUB_TAGS_BY_CATEGORY)) {
    for (const t of arr) m.set(t.slug, t)
  }
  return Object.fromEntries(m)
})()

export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map(c => [c.slug, c]))

// Light tailwind color map per category — for badges/pills.
const TONE = {
  emerald:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  orange:   'bg-orange-100 text-orange-800 border-orange-200',
  sky:      'bg-sky-100 text-sky-800 border-sky-200',
  indigo:   'bg-indigo-100 text-indigo-800 border-indigo-200',
  amber:    'bg-amber-100 text-amber-900 border-amber-200',
  lime:     'bg-lime-100 text-lime-800 border-lime-200',
  fuchsia:  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  rose:     'bg-rose-100 text-rose-700 border-rose-200',
  red:      'bg-red-100 text-red-700 border-red-200',
  violet:   'bg-violet-100 text-violet-800 border-violet-200',
  pink:     'bg-pink-100 text-pink-700 border-pink-200',
  gray:     'bg-gray-100 text-gray-700 border-gray-200',
}

export function categoryClass(slug) {
  const c = CATEGORY_BY_SLUG[slug]
  return TONE[c?.color || 'gray']
}

export function categoryLabel(slug) {
  const c = CATEGORY_BY_SLUG[slug]
  return c ? `${c.emoji} ${c.label}` : '— Uncategorized'
}

// Health tier of a preset slug. Returns 'neutral' as a safe default.
// Per-item overrides (receipt_items.health_tier) take precedence at the analytics layer.
export function healthTierFor(slug) {
  return CATEGORY_BY_SLUG[slug]?.health_tier || 'neutral'
}
