// Third-party game providers — the registry that lets the arcade carry games
// from more than one network without the rest of the app knowing which is which.
//
// Every one of these networks works the same way: they host an HTML5 game, we
// drop it in an <iframe>, they serve ads inside that iframe and pay us a share.
// What differs is only (a) the URL you build and (b) the domain the frame comes
// from — so that's all this file holds. A game record carries
// `{ provider, embedId }` and everything downstream (catalog, routes, the
// player component, CSP) reads the provider entry instead of hardcoding a host.
//
// Adding a network later = one entry here + its ads.txt block (public/ads.txt)
// + a redeploy. No component changes.
//
// ⚠️ Each provider ALSO needs its seller ids in public/ads.txt or it will serve
// ads and never pay. Keep the two files in sync.

export const PROVIDERS = {
  gamemonetize: {
    id: 'gamemonetize',
    label: 'GameMonetize',
    // The games are served from .co — the .com host only serves thumbnails.
    // Getting this wrong is a silent empty box (CSP kills the frame with no
    // console error you'd notice), so both are listed and the frame host is
    // deliberately first.
    frameHosts: ['https://html5.gamemonetize.co', 'https://html5.gamemonetize.com'],
    imageHosts: ['https://img.gamemonetize.com'],
    // Public catalog feed — no key, no auth. `format=0` is JSON.
    // Fields per game: id,title,description,instructions,url,category,tags,thumb,width,height
    feedUrl: ({ num = 100, page = 1, category = '' } = {}) =>
      `https://gamemonetize.com/feed.php?format=0&num=${num}&page=${page}` +
      (category ? `&category=${encodeURIComponent(category)}` : ''),
    // The feed hands back an absolute embed URL, so there's nothing to build.
    embedUrl: (game) => game.embed,
  },

  gamedistribution: {
    id: 'gamedistribution',
    label: 'GameDistribution',
    frameHosts: ['https://html5.gamedistribution.com'],
    imageHosts: ['https://img.gamedistribution.com'],
    feedUrl: null,  // catalog is browsed in their dashboard; ids are pasted in
    // GD wants the page the game is embedded on, for their own reporting.
    // Without gd_sdk_referrer_url the session may not attribute to us.
    embedUrl: (game, { referrer } = {}) =>
      `https://html5.gamedistribution.com/${game.embedId}/` +
      (referrer ? `?gd_sdk_referrer_url=${encodeURIComponent(referrer)}` : ''),
  },
}

export const providerFor = (id) => PROVIDERS[id] || null

// Resolve a catalog entry to the URL that goes in the iframe src.
// Returns null for an unknown provider rather than rendering a broken frame.
export function embedUrlFor(game, { referrer } = {}) {
  const p = providerFor(game?.provider)
  if (!p) return null
  return p.embedUrl(game, { referrer })
}

// Every host any provider needs in CSP frame-src. next.config.mjs can't import
// from src/ (it loads before the app), so the CSP list there is maintained by
// hand — this export is the source of truth to copy from, and the check script
// diffs the two so they can't silently drift.
export const ALL_FRAME_HOSTS = Object.values(PROVIDERS).flatMap((p) => p.frameHosts)
export const ALL_IMAGE_HOSTS = Object.values(PROVIDERS).flatMap((p) => p.imageHosts)
