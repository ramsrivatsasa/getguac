const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
// Identity excludes receipt IDs, quote dates, prices and AI list positions.
export function suggestionKey(scope, subject, option) {
  let identity = option.selectedAlternative || option.key || option.id || option.choice
  if (scope === 'purchase') {
    if (option.feedbackIdentity) identity = option.feedbackIdentity
    else if (/^(home_coffee|home_meal|skip_once|brand_check|drink_swap|return_check)(:|$)/.test(identity)) identity = identity.split(':')[0]
    else if (option.editableHomeCost) identity = /coffee|latte|espresso/i.test(subject) ? 'home_coffee' : 'home_meal'
    else if (/^history:/.test(identity)) {
      const merchant=option.historyMerchant || option.choice?.match(/^Buy again at (.+)$/i)?.[1]
      identity=merchant?`history:${normalize(merchant)}`:option.choice
    }
    else if (/^menu:|^product:/.test(identity)) { /* Product/menu keys distinguish variants sharing a page. */ }
    else if (option.sourceUrl) {
      try { const url = new URL(option.sourceUrl); for (const key of [...url.searchParams.keys()]) if (/^(utm_|ref$|ref_|gclid$|fbclid$)/i.test(key)) url.searchParams.delete(key); url.hash='';url.searchParams.sort();identity=url.href } catch { identity=option.choice || identity }
    } else if (option.alternativeCents === 0) identity='skip_once'
  }
  return JSON.stringify([scope, normalize(subject), normalize(identity)])
}
export function suggestionHidden(progress, key) {
  return Boolean(progress?.suggestionFeedback?.some(f => !f.restoredAt && (f.key === key || (f.snapshot && suggestionKey(f.scope,f.subject,f.snapshot) === key))))
}
export function allowedSuggestions(progress, scope, subject, options) {
  return options.filter(o => !suggestionHidden(progress, suggestionKey(scope, subject, o)))
}
