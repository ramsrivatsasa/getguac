// Use the saved account country, not IP location or currency. Amazon is the
// owner's current international exception; unknown countries use that list too.
export function retailerAvailableInCountry(retailerId, countryCode) {
  return String(retailerId || '').trim().toLowerCase() === 'amazon' ||
    String(countryCode || '').trim().toUpperCase() === 'US'
}
