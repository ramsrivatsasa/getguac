import { COUNTRY_CODES } from './registration-region.mjs'

export function loginCountry(headers, hostedOnVercel) {
  if (!hostedOnVercel) return null
  const country = headers.get('x-vercel-ip-country')?.toUpperCase()
  return COUNTRY_CODES.includes(country) ? country : null
}
