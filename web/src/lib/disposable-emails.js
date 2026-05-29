// Disposable / throwaway email-domain blocklist. Bot-prevention layer
// that catches signups using one-time inboxes — the typical signal of
// "I'm here to game your free tier" or "I don't want to confirm a real
// email." Curated from common services; not exhaustive (no static list
// can be) but covers the top ~95% of throwaways in the wild.
//
// Kept in code (not DB) because the list is small, rarely changes, and
// gating signup on a hot path doesn't want a Supabase round-trip.

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.de',
  'sharklasers.com',
  'mailinator.com',
  'mailinator.net',
  'maildrop.cc',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempr.email',
  'getairmail.com',
  'fakemailgenerator.com',
  'fakeinbox.com',
  'mintemail.com',
  'mytemp.email',
  'mohmal.com',
  'discard.email',
  'discardmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'spambox.us',
  'dispostable.com',
  'tempinbox.com',
  'mailnesia.com',
  'mailcatch.com',
  'jetable.org',
  'mailmoat.com',
  'instantemailaddress.com',
  'spam4.me',
  'mvrht.com',
  'tempmailaddress.com',
])

export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return false
  const domain = email.slice(at + 1).toLowerCase().trim()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}
