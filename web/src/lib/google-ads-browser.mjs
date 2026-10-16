// Public registration measurement only. Never send form values or account IDs.
export const GOOGLE_ADS_ID = 'AW-18328674297'
export const GOOGLE_ADS_SIGNUP = `${GOOGLE_ADS_ID}/Yj6GCN67np4dEPm_5aNE`
export const GOOGLE_ADS_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_ADS_ENABLED === '1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isGoogleAdsPage = path => ['/', '/join', '/start', '/register', '/register/complete'].includes(path)

export function adsAllowed(win, nav, doc, enabled) {
  return enabled && ['getguac.app', 'www.getguac.app'].includes(win.location.hostname)
    && isGoogleAdsPage(win.location.pathname)
    && nav.doNotTrack !== '1' && !nav.globalPrivacyControl
    && !doc.cookie.split(';').some(c => c.trim() === 'guac_embedded=1')
}

export function adsPageLocation(win) {
  const current = new URL(win.location.href)
  let click = {}
  try { click = JSON.parse(win.sessionStorage.getItem('gg_ads_click') || '{}') } catch {}
  for (const key of ['gclid', 'gbraid', 'wbraid']) {
    const value = current.searchParams.get(key)
    if (value && /^[\w.~-]{1,256}$/.test(value)) click[key] = value
  }
  const safe = new URL(current.pathname, current.origin)
  for (const key of ['gclid', 'gbraid', 'wbraid']) {
    if (typeof click[key] === 'string' && /^[\w.~-]{1,256}$/.test(click[key])) safe.searchParams.set(key, click[key])
  }
  try { win.sessionStorage.setItem('gg_ads_click', JSON.stringify(click)) } catch {}
  return safe.href
}

export function startGoogleAds({ win = window, nav = navigator, doc = document, enabled = GOOGLE_ADS_ENABLED } = {}) {
  if (!adsAllowed(win, nav, doc, enabled)) return false
  if (win.__ggAdsReady) return true
  win.dataLayer = win.dataLayer || []
  win.gtag = win.gtag || function () { win.dataLayer.push(arguments) }
  // Cookieless measurement; no enhanced conversions or ad personalization.
  win.gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  win.gtag('js', new Date())
  let referrer = ''
  try { referrer = new URL(doc.referrer).origin } catch {}
  win.gtag('config', GOOGLE_ADS_ID, {
    send_page_view: false, allow_google_signals: false, allow_enhanced_conversions: false,
    allow_ad_personalization_signals: false, ads_data_redaction: true,
    page_location: adsPageLocation(win), page_referrer: referrer,
  })
  const script = doc.createElement('script')
  script.id = 'getguac-google-ads'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`
  doc.head.appendChild(script)
  win.__ggAdsReady = true
  return true
}

export async function sendGoogleSignup(id, options = {}) {
  try {
    if (!UUID.test(id || '')) return false
    const win = options.win || window
    if (!startGoogleAds(options)) return false
    const key = `gg_ads_signup_sent:${id}`
    win.__ggAdsSent = win.__ggAdsSent || new Set()
    let stored = false
    try { stored = win.sessionStorage.getItem(key) === '1' } catch {}
    if (stored || win.__ggAdsSent.has(id)) return false
    win.__ggAdsSent.add(id)
    try { win.sessionStorage.setItem(key, '1') } catch {}
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 2000)
      win.gtag('event', 'conversion', {
        send_to: GOOGLE_ADS_SIGNUP, transaction_id: id, value: 0, currency: 'USD',
        page_location: adsPageLocation(win),
        event_callback: () => { clearTimeout(timeout); resolve() },
        event_timeout: 1800,
      })
    })
    return true
  } catch { return false } // Measurement must never break registration.
}

export function pendingGoogleSignup(doc = document) {
  const value = doc.cookie.split(';').map(c => c.trim()).find(c => c.startsWith('gg_ads_signup='))?.slice('gg_ads_signup='.length)
  return UUID.test(value || '') ? value : null
}

export async function finishGoogleSignup(options = {}) {
  const doc = options.doc || document
  const id = pendingGoogleSignup(doc)
  if (!id) return false
  doc.cookie = 'gg_ads_signup=; Path=/register; Max-Age=0; SameSite=Lax'
  await sendGoogleSignup(id, options)
  return true
}
