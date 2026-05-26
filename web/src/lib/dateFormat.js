// Shared date formatter so every list/detail view renders dates the same way.
// Backend stores dates as ISO yyyy-MM-dd; users want dd-MMM-yyyy (25-May-2026).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Render an ISO date string (yyyy-MM-dd) or Date as dd-MMM-yyyy.
 * Falls back to the raw input if it can't be parsed (so a bad row at least
 * shows _something_ instead of "Invalid Date").
 */
export function formatDateShort(input) {
  if (!input) return ''
  // Avoid the Date constructor for plain yyyy-MM-dd strings — it would
  // interpret them in UTC and the user could see a day-off depending on TZ.
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const [, y, mm, dd] = m
      const monthIdx = parseInt(mm, 10) - 1
      if (monthIdx >= 0 && monthIdx < 12) return `${dd}-${MONTHS[monthIdx]}-${y}`
    }
  }
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = MONTHS[d.getMonth()]
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}
