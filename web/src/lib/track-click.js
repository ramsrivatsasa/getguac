// Count a click on something that leaves the site.
//
// WHY: the /join landing page carries App Store and Google Play badges, and we
// had no way to tell whether anyone ever pressed them. Meta reports a "link
// click" for the ad, and the stores report installs, but nothing connected the
// two — a visitor who arrived, read the page and tapped Install was
// indistinguishable from one who bounced. That gap is the same one that made
// the original "21 clicks, 0 installs" impossible to diagnose.
//
// HOW: it reuses the first-party visit counter rather than adding a table. A
// click is recorded as a pageview of a synthetic path, `/click/<name>`, so it
// lands in site_visits alongside real paths and shows up in site_top_paths with
// no migration, no new endpoint and no second thing to keep working.
//
// Synthetic paths all live under /click/ so they are trivially separable from
// real routes when reading the table, and /click is not a real route.
//
// PRIVACY: identical to a pageview — the server derives the same daily-rotating
// visitor hash and stores no identifier. Nothing about the click is recorded
// beyond its name.

const SAFE = /^[a-z0-9-]{1,40}$/

export function trackClick(name) {
  if (typeof window === 'undefined') return
  // The name is interpolated into a path the server length-checks but does not
  // sanitise, so keep it to a known-safe shape here rather than trusting every
  // future call site to pass something sensible.
  if (!SAFE.test(name)) return
  const body = JSON.stringify({ path: `/click/${name}` })
  try {
    // sendBeacon survives the navigation this click is about to cause — a
    // plain fetch is cancelled when the page unloads, which for an outbound
    // store link is every single time, i.e. exactly the clicks we want.
    if (navigator.sendBeacon?.('/api/visit', new Blob([body], { type: 'application/json' }))) return
  } catch { /* fall through */ }
  fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
