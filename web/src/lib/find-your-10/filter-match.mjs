export const isAirFilter = title => /\b(?:air|furnace|hvac)\s+filters?\b/i.test(title)
export function filterDimensions(title) {
  return String(title).toLowerCase().replace(/["″]/g,'').replace(/\b(?:inches|inch|in)\b\.?/g,'').match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/)?.slice(1).map(Number).join('x')
}
export function packSize(title) {
  const text=String(title)
  const count=text.match(/(\d+)\s*-?\s*(?:pack|pk|count|ct|filters)\b/i)||text.match(/(?:pack|set)\s+of\s+(\d+)/i)
  return count?Number(count[1]):1
}
export function matchingFilter(baseline,title) {
  if(!isAirFilter(title)||!filterDimensions(baseline)||filterDimensions(baseline)!==filterDimensions(title)||packSize(baseline)!==packSize(title))return false
  for(const rating of ['MERV','MPR','FPR']) {
    const pattern=new RegExp(`\\b${rating}\\s*(\\d+)`,'i')
    const required=baseline.match(pattern)?.[1]
    if(required&&title.match(pattern)?.[1]!==required)return false
  }
  return true
}
