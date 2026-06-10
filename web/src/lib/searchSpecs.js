// Configurable "spec" search for the Steals page.
//
// When a user's query mentions a known category (e.g. "laptop"), the Steals
// search reveals dropdowns for that category's attributes (brand, CPU, memory,
// storage…). Their picks refine the query we hand to /api/best-prices so the
// web hunt targets the exact configuration instead of a vague "laptop".
//
// Purely declarative + extensible — add a category by adding one entry below.

export const SEARCH_SPECS = {
  laptop: {
    label: 'Laptop',
    keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'ultrabook'],
    fields: [
      { key: 'brand',   label: 'Brand',        options: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Microsoft', 'MSI', 'Razer', 'Samsung'] },
      { key: 'cpu',     label: 'CPU',          options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M3', 'Apple M3 Pro', 'Apple M4'] },
      { key: 'memory',  label: 'Memory (RAM)', options: ['8 GB', '16 GB', '24 GB', '32 GB', '64 GB'] },
      { key: 'storage', label: 'Storage',      options: ['256 GB SSD', '512 GB SSD', '1 TB SSD', '2 TB SSD'] },
      { key: 'screen',  label: 'Screen',       options: ['13"', '14"', '15"', '16"', '17"'] },
    ],
  },
  phone: {
    label: 'Phone',
    keywords: ['phone', 'iphone', 'galaxy', 'pixel', 'smartphone'],
    fields: [
      { key: 'brand',   label: 'Brand',   options: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Motorola', 'Nothing'] },
      { key: 'storage', label: 'Storage', options: ['128 GB', '256 GB', '512 GB', '1 TB'] },
      { key: 'color',   label: 'Color',   options: ['Black', 'White', 'Blue', 'Green', 'Pink', 'Titanium'] },
    ],
  },
  tv: {
    label: 'TV',
    keywords: ['tv', 'television', 'oled', 'qled', 'smart tv'],
    fields: [
      { key: 'brand',      label: 'Brand',      options: ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Vizio'] },
      { key: 'size',       label: 'Size',       options: ['43"', '50"', '55"', '65"', '75"', '85"'] },
      { key: 'resolution', label: 'Resolution', options: ['4K UHD', '8K', '1080p'] },
      { key: 'panel',      label: 'Panel',      options: ['OLED', 'QLED', 'Mini-LED', 'LED'] },
    ],
  },
  monitor: {
    label: 'Monitor',
    keywords: ['monitor', 'display'],
    fields: [
      { key: 'brand',      label: 'Brand',      options: ['Dell', 'LG', 'Samsung', 'ASUS', 'Acer', 'BenQ', 'HP'] },
      { key: 'size',       label: 'Size',       options: ['24"', '27"', '32"', '34" Ultrawide', '49" Ultrawide'] },
      { key: 'resolution', label: 'Resolution', options: ['1080p', '1440p (QHD)', '4K UHD'] },
      { key: 'refresh',    label: 'Refresh',    options: ['60 Hz', '120 Hz', '144 Hz', '165 Hz', '240 Hz'] },
    ],
  },
  tablet: {
    label: 'Tablet',
    keywords: ['tablet', 'ipad'],
    fields: [
      { key: 'brand',   label: 'Brand',   options: ['Apple', 'Samsung', 'Microsoft', 'Lenovo', 'Amazon'] },
      { key: 'storage', label: 'Storage', options: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'] },
      { key: 'size',    label: 'Screen',  options: ['8"', '10"', '11"', '12.9"'] },
    ],
  },
  headphones: {
    label: 'Headphones',
    keywords: ['headphone', 'headphones', 'earbuds', 'airpods', 'earphones', 'headset'],
    fields: [
      { key: 'brand',    label: 'Brand',   options: ['Apple', 'Sony', 'Bose', 'Samsung', 'Sennheiser', 'JBL', 'Beats'] },
      { key: 'type',     label: 'Type',    options: ['Over-ear', 'On-ear', 'In-ear / Earbuds'] },
      { key: 'features', label: 'Feature', options: ['Noise cancelling', 'Wireless', 'Wired'] },
    ],
  },
}

export const SEARCH_CATEGORY_KEYS = Object.keys(SEARCH_SPECS)

/** Detect a category key from freeform query text, or null. Word-boundary match. */
export function detectCategory(query) {
  const q = (query || '').toLowerCase()
  if (!q) return null
  for (const [key, spec] of Object.entries(SEARCH_SPECS)) {
    if (spec.keywords.some(k => new RegExp(`(^|\\W)${k}(\\W|$)`, 'i').test(q))) return key
  }
  return null
}

/**
 * Build a refined search string from base text + chosen specs.
 * e.g. ('laptop', {brand:'Dell', cpu:'Intel Core i7', memory:'16 GB', storage:'512 GB SSD'})
 *   → 'Dell laptop Intel Core i7 16 GB RAM 512 GB SSD'
 * Falls back to the raw base query when nothing is selected.
 */
export function buildRefinedQuery(baseQuery, categoryKey, specs = {}) {
  const spec = SEARCH_SPECS[categoryKey]
  const base = (baseQuery || '').trim()
  if (!spec) return base
  const lower = base.toLowerCase()

  // The freeform text is authoritative: if the user typed something, start
  // from it. Otherwise build the query from the dropdowns alone.
  const parts = base ? [base] : []
  if (!base) {
    if (specs.brand) parts.push(specs.brand)
    parts.push(spec.label.toLowerCase())
  } else if (specs.brand && !lower.includes(String(specs.brand).toLowerCase())) {
    parts.push(specs.brand)
  }

  for (const f of spec.fields) {
    if (f.key === 'brand') continue
    const v = specs[f.key]
    if (!v) continue
    // Don't override a value the user already typed. If the freeform text
    // already mentions a value for this field (e.g. "Intel Core i7"), skip
    // the (possibly stale) dropdown for that field — so typing i7 isn't
    // overridden by a left-over i9 selection.
    const fieldAlreadyTyped = base && (f.options || []).some(o => lower.includes(String(o).toLowerCase()))
    if (fieldAlreadyTyped) continue
    const val = f.key === 'memory' ? `${v} RAM` : v
    if (!lower.includes(String(val).toLowerCase())) parts.push(val)
  }

  const refined = parts.filter(Boolean).join(' ').trim()
  return refined || base
}

/** Short human label for a saved search chip, e.g. "Dell laptop · 16 GB · 512 GB SSD". */
export function specSummary(categoryKey, specs = {}) {
  const spec = SEARCH_SPECS[categoryKey]
  if (!spec) return ''
  const vals = spec.fields.map(f => specs[f.key]).filter(Boolean)
  return vals.join(' · ')
}
