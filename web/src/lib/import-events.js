const cleanText = (value, max = 500) =>
  value == null ? null : String(value).replace(/[\u0000-\u001f]/g, ' ').slice(0, max)

/** Best-effort audit logging. Import success must never depend on telemetry. */
export async function recordImportEvent(db, userId, event) {
  if (!db || !userId) return
  const row = {
    user_id: userId,
    source: event.source,
    provider: cleanText(event.provider, 80),
    retailer_id: cleanText(event.retailer_id, 80),
    status: event.status,
    attempted_count: Math.max(0, Number(event.attempted_count ?? 1) || 0),
    imported_count: Math.max(0, Number(event.imported_count || 0) || 0),
    updated_count: Math.max(0, Number(event.updated_count || 0) || 0),
    skipped_count: Math.max(0, Number(event.skipped_count || 0) || 0),
    receipt_ids: Array.isArray(event.receipt_ids) ? event.receipt_ids.slice(0, 100) : [],
    confidence_score: event.confidence_score == null ? null : Math.max(0, Math.min(100, Math.round(Number(event.confidence_score)))),
    error_code: cleanText(event.error_code, 80),
    error_message: cleanText(event.error_message),
    metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
  }
  const { error } = await db.from('import_events').insert(row)
  if (error && error.code !== '42P01') {
    console.warn('[import-events] write failed:', error.message)
  }
}
