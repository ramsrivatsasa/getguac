import {COUNTRY_CODES} from './registration-region.mjs'
export const PLAN_LOCATION_MESSAGE='We need your postal code, city, state or region, and country to provide the best alternative options.'
export function missingPlanLocation(metadata={}) {
 return ['country_code','city','address_region','postal_code'].filter(key=>!String(metadata[key]||'').trim()||(key==='country_code'&&!COUNTRY_CODES.includes(String(metadata[key]).trim().toUpperCase())))
}
