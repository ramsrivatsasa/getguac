const NON_US_DMY = new Set([
  'GB','IE','FR','DE','ES','IT','PT','NL','BE','LU','SE','NO','DK','FI','IS',
  'PL','CZ','SK','HU','RO','BG','HR','SI','RS','GR','TR','AU','NZ','IN','ZA',
  'MX','BR','AR','CL','CO','PE','EC','UY','PY','VE','ID','MY','SG','TH','VN',
])

function year4(twoDigit, referenceYear) {
  const n = Number(twoDigit)
  const century = Math.floor(referenceYear / 100) * 100
  let y = century + n
  if (y > referenceYear + 1) y -= 100
  return y
}

function iso(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Resolve the exact printed receipt date using receipt country first and the
// device country only as a fallback. Handles IKEA-style MM/YY/DD dates such as
// 07/26/11, which must become 2026-07-11 rather than 2011-07-26.
export function normalizeReceiptDate({ raw, parsed, receiptCountry, deviceCountry, referenceDate = new Date() }) {
  const fallback = /^\d{4}-\d{2}-\d{2}$/.test(parsed || '') ? parsed : null
  const parts = String(raw || '').trim().match(/^(\d{1,4})[.\-/](\d{1,2})[.\-/](\d{1,4})$/)
  if (!parts) return fallback

  const a = Number(parts[1]), b = Number(parts[2]), c = Number(parts[3])
  const refYear = referenceDate.getUTCFullYear()
  let y, m, d

  if (parts[1].length === 4) {
    y = a; m = b; d = c
  } else if (parts[3].length === 4) {
    y = c
    const country = String(receiptCountry || deviceCountry || '').toUpperCase()
    if (a > 12 || (a <= 12 && b <= 12 && NON_US_DMY.has(country))) { d = a; m = b } else { m = a; d = b }
  } else {
    // MM/YY/DD: the middle component is the current/recent year and cannot be
    // a month. This is the IKEA case that previously collapsed into 2011.
    const middleYear = year4(b, refYear)
    if (b > 12 && a <= 12 && c <= 31 && Math.abs(middleYear - refYear) <= 10) {
      y = middleYear; m = a; d = c
    } else {
      y = year4(c, refYear)
      const country = String(receiptCountry || deviceCountry || '').toUpperCase()
      if (a > 12 || (a <= 12 && b <= 12 && NON_US_DMY.has(country))) { d = a; m = b } else { m = a; d = b }
    }
  }

  return iso(y, m, d) || fallback
}
