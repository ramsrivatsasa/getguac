// Per-product "GuacScore impact" — a small directional number we can
// show on the Stash card so the user sees how rating a product moves
// their overall score. Not a mathematically perfect derivative of
// calculateGuacoScore (which weighs categories, recency, rating
// volume, and bank-fee penalties). Just a directional readout the
// rater can use as feedback: 5★ pushes the score up, 1★ pulls it
// down, 3★ is neutral.
//
// Values were chosen so a row of all-5s pushes the score noticeably
// higher than a row of all-3s, but no single rating can swing the
// score by more than ~5 points. Matches the "rate to unlock" loop
// from /validate without needing to actually re-run the full score
// calc on every click.

const IMPACT_BY_RATING = {
  1: -5,
  2: -2,
  3:  0,
  4: +2,
  5: +5,
}

export function guacImpactForRating(rating) {
  if (rating == null) return null
  const r = Number(rating)
  if (!Number.isFinite(r)) return null
  return IMPACT_BY_RATING[Math.round(r)] ?? 0
}

// Quick "label + tone" pair for rendering the chip. Caller picks the
// emerald/rose accent based on tone, and `delta` formats with a sign
// so the chip reads "GuacScore +5" / "GuacScore −2" / "neutral".
export function guacImpactChip(rating) {
  const delta = guacImpactForRating(rating)
  if (delta == null) return null
  if (delta === 0) return { delta: 0, label: 'neutral', tone: 'gray' }
  const sign = delta > 0 ? '+' : '−'
  return {
    delta,
    label: `GuacScore ${sign}${Math.abs(delta)}`,
    tone: delta > 0 ? 'emerald' : 'rose',
  }
}
