// Match the existing nightly predictor's frequency buckets while preserving
// the exact observed cadence in predicted_reason and cadence_days.
export function shoppingSelectionDetails(item) {
  const cadence = Number(item.predicted_avg_cadence_days)
  if (!Number.isFinite(cadence) || cadence <= 0) throw new Error('This suggestion needs a valid purchase cadence before adding.')
  const provenance = 'Receipt price; current price unverified'
  const reason = String(item.predicted_reason || '').trim()
  return {
    frequency: cadence <= 10 ? 'Weekly' : cadence <= 18 ? 'Biweekly' : 'Monthly',
    predicted_reason: reason.includes(provenance) ? reason : `${reason}${reason ? ' · ' : ''}${provenance}`,
  }
}
