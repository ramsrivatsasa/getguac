// A requested .limit(5000) can still be capped by PostgREST at 1000.
// Small explicit pages detect the real end; deterministic ordering is required.
export async function allRecords(query, label, pageSize = 500, maxRows = 50000) {
  const rows = []
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const result = await query.range(offset, offset + pageSize - 1)
    if (result.error) throw new Error(`${label} could not be loaded. Your existing records are unchanged.`)
    const page = result.data || []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
  throw new Error('There are more records than this analysis can load. Totals have not been shown as complete.')
}
