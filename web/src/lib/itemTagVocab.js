// Fixed-vocabulary semantic tags for receipt_items.ai_tag.
//
// Distinct from category — category answers "what spending bucket?" (grub,
// pharmacy, …). The tag answers "what HOUSEHOLD ROLE does this line item
// play?" (household, kid, health, treat, alcohol, food, beauty, tech,
// other). Two examples that look different through the two lenses:
//
//   • A bottle of children's Tylenol at Target is
//       category = 'pharmacy', ai_tag = 'kid'
//   • A protein shake at Whole Foods is
//       category = 'grub',      ai_tag = 'health'
//
// Kept small and fixed so the chip styling exhausts every possible value —
// the AI is constrained to emit only one of these slugs (the categorize-
// batch endpoint sanitizes anything else to null). Adding a new tag is a
// 3-line code change here + chip styling — that's intentional.

export const ITEM_TAG_SLUGS = [
  'household', 'kid', 'health', 'treat', 'alcohol', 'food', 'beauty', 'tech', 'other',
]

// Display metadata for the chip — emoji + tailwind tone. Tones reuse the
// same palette family as lib/categories.js so chips don't visually clash
// with category chips on the same row.
export const ITEM_TAG_META = {
  household: { emoji: '🧻', label: 'Household', tone: 'bg-amber-100 text-amber-900 border-amber-200' },
  kid:       { emoji: '🧒', label: 'Kid',       tone: 'bg-pink-100 text-pink-800 border-pink-200' },
  health:    { emoji: '🥗', label: 'Health',    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  treat:     { emoji: '🍩', label: 'Treat',     tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  alcohol:   { emoji: '🍷', label: 'Alcohol',   tone: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  food:      { emoji: '🥗', label: 'Food',      tone: 'bg-lime-100 text-lime-800 border-lime-200' },
  beauty:    { emoji: '💄', label: 'Beauty',    tone: 'bg-pink-100 text-pink-700 border-pink-200' },
  tech:      { emoji: '📱', label: 'Tech',      tone: 'bg-sky-100 text-sky-800 border-sky-200' },
  other:     { emoji: '📦', label: 'Other',     tone: 'bg-gray-100 text-gray-700 border-gray-200' },
}

// Idempotent sanitizer — returns the slug if it's in the vocab, null
// otherwise. Both the API route and any future writer should call this
// before persisting so an off-vocab AI hallucination never reaches the DB.
export function sanitizeItemTag(slug) {
  if (typeof slug !== 'string') return null
  const s = slug.trim().toLowerCase()
  return ITEM_TAG_SLUGS.includes(s) ? s : null
}
