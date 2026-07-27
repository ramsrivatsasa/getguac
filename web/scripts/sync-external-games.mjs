// Sync third-party games into the arcade catalog.
//
//   node scripts/sync-external-games.mjs                    # preview, writes nothing
//   node scripts/sync-external-games.mjs --write            # rewrite the catalog
//   node scripts/sync-external-games.mjs --write --pages 40 # portal-scale pull
//
// OUTPUT IS TWO FILES, and the split is load-bearing:
//   externalGames.json       full records — embed URL, description, size.
//                            Imported ONLY by the server-rendered game route.
//   externalGamesIndex.json  href/name/cat/thumb/tag — what the hub needs to
//                            draw a tile.
// gamesList.js is imported by GamesHub.jsx, which is a CLIENT component, so
// anything reaching it is shipped to every visitor's browser. The full records
// are ~844 bytes/game: at portal scale that's 3+ MB of JS on the arcade hub.
// The index is a fraction of that. Never import externalGames.json from a
// client component.
//
// WHY THIS IS A SCRIPT AND NOT A RUNTIME FETCH
// The provider feed is an unfiltered firehose of whatever the network onboarded
// this week. A live fetch would mean a stranger's upload can appear on GetGuac
// — a personal-finance app with an App Store listing — with nobody having
// looked at it. So the feed is pulled deliberately, filtered, and the result is
// COMMITTED to git. Adding games is then a reviewable diff, page renders stay
// offline-deterministic, and a provider outage can't break a build.
//
// Re-run it when you want new titles, read the diff, commit.

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'src', 'components', 'games', 'externalGames.json')

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const NUM = Number(args[args.indexOf('--num') + 1]) || 100

// ── Brand safety ───────────────────────────────────────────────────────────
// GetGuac is a money app used by families and listed on both app stores. The
// arcade sits one tap from a user's real receipts, so the bar for what we host
// is "would this be fine next to someone's bank data", not "is it legal".
//
// Categories we take. Anything not listed is dropped — an allowlist fails
// closed, so a category the network invents next month can't slip in.
const ALLOW_CATEGORIES = new Set([
  'Puzzle', 'Hypercasual', 'Arcade', 'Racing', 'Sports', 'Soccer', 'Basketball',
  'Boardgames', 'Cards', 'Bejeweled', 'Match3', 'Clicker', 'Strategy', 'Cooking',
  'Educational', 'Care', 'Jigsaw', 'Mahjong', 'Bubbleshooter', 'Endless runner',
])

// Hard blocks on title/tags regardless of category — the feed mis-files things
// constantly (a shooter tagged "Hypercasual" is routine), so this is the real
// filter and the category allowlist is just the first pass.
//
// ⚠️ These match on WORD BOUNDARIES, not substrings. Naive `includes()` here
// rejects half the good catalog: 'kill' matches "skill", 'bet' matches
// "between", 'war' matches "reward", 'rob' matches "problem", 'gun' matches
// "begun". A first pass dropped 98 of 150 games, most of them fine, for exactly
// that reason. Multi-word entries are matched as phrases.
const BLOCK = [
  // violence / weapons
  'shoot', 'shooter', 'shooting', 'gun', 'guns', 'sniper', 'kill', 'kills', 'killer',
  'murder', 'blood', 'gore', 'war', 'warfare', 'weapon', 'weapons', 'knife', 'stab',
  'assassin', 'zombie', 'zombies', 'horror', 'scary', 'creepy', 'battle royale',
  'fight', 'fighting', 'fighter', 'combat', 'army', 'soldier', 'tank', 'death',
  'die', 'dead',
  // gambling — especially disqualifying for a *money* app
  'casino', 'slot', 'slots', 'poker', 'blackjack', 'roulette', 'bet', 'betting',
  'gamble', 'gambling', 'jackpot', 'lottery', 'spin to win',
  // adult / suggestive
  'sexy', 'hot girl', 'kiss', 'dating', 'lingerie', 'bikini', 'strip', 'nude',
  // substances — 'wine' caught "Tip Master Wine", a bartending game
  'drug', 'drugs', 'weed', 'smoke', 'cigarette', 'alcohol', 'beer', 'vodka',
  'wine', 'whiskey', 'cocktail', 'bartender', 'pub crawl',
  // crime / edgy themes that read badly beside financial data
  'mafia', 'gangster', 'thief', 'heist', 'prison', 'prank', 'revenge', 'backrooms',
]

// Trademarked characters and franchises. The feed is full of knockoffs
// ("Mario Jetpack Rush", "Sofia Wedding Story", a dozen Wolfoo titles) and the
// network's own licence does NOT indemnify us for them. GetGuac is a
// commercial product with two app-store listings, so hosting someone else's
// character is a takedown or worse — this is a legal filter, not a taste one.
// Matched as substrings on purpose: "supermario", "elsa-frozen" etc.
const BLOCK_IP = [
  'mario', 'luigi', 'sonic', 'pokemon', 'pikachu', 'minecraft', 'roblox', 'obby',
  'among us', 'squid game', 'fortnite', 'gta', 'pubg', 'huggy', 'poppy playtime',
  'fnaf', "five nights", 'siren head', 'skibidi', 'wolfoo', 'peppa', 'bluey',
  'disney', 'frozen elsa', 'elsa', 'anna frozen', 'moana', 'sofia the first',
  'sofia wedding', 'barbie', 'spiderman', 'spider man', 'batman', 'superman',
  'marvel', 'avengers', 'hello kitty', 'subway surf', 'temple run', 'angry birds',
  'talking tom', 'baby shark', 'cocomelon', 'paw patrol', 'ben 10', 'naruto',
  'dragon ball', 'stumble guys', 'brawl stars', 'clash royale', 'kim jong',
  // Real people. Using a living person's name/likeness is a personality-rights
  // problem in its own right, and "Ronaldo Ball Rush" is not licensed by
  // anyone. Politicians additionally make the arcade look partisan.
  'ronaldo', 'messi', 'haaland', 'neymar', 'mbappe', 'lebron', 'trump', 'biden',
  'elon musk', 'putin', 'president',
]

// The feed ships raw HTML entities in titles ("GLIM &amp; GLO"), which would
// otherwise render literally on the page AND corrupt the slug (glim-amp-glo).
const decodeEntities = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

// Split letter/digit runs so a trailing number can't hide a blocked word from
// the boundary matcher — "Storm Fighter007" has no boundary after "fighter",
// so it read as clean. Normalising to "fighter 007" catches that whole class.
const haystack = (g) => `${g.title} ${g.tags} ${g.category} ${g.description}`
  .toLowerCase()
  .replace(/([a-z])(\d)/g, '$1 $2')
  .replace(/(\d)([a-z])/g, '$1 $2')

// Word-boundary test — \b won't work around non-ASCII, so bound explicitly on
// anything that isn't a letter or digit.
const hasWord = (hay, word) =>
  new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(hay)

function rejectReason(g) {
  // ALLOW_CATEGORIES is GameMonetize's Titlecase vocabulary. GamePix uses its
  // own lowercase slugs and is screened by GAMEPIX_BLOCK_CATEGORIES in the
  // adapter (a blocklist), so running it through this allowlist too would
  // reject the entire catalog.
  if (g.provider === 'gamemonetize' && !ALLOW_CATEGORIES.has(g.category)) return `category:${g.category}`
  const hay = haystack(g)
  const ip = BLOCK_IP.find((w) => hay.includes(w))
  if (ip) return `ip:${ip}`
  const bad = BLOCK.find((w) => hasWord(hay, w))
  if (bad) return `word:${bad}`
  return null
}

// ── Slugs ──────────────────────────────────────────────────────────────────
// External slugs live in the same /games/<slug> namespace as our 36 hand-built
// games, so a feed game called "Snake" MUST NOT take /games/snake away from
// Coin Snake. Next.js resolves static routes before dynamic ones, so a
// collision wouldn't 404 — it would silently keep serving our game while the
// catalog claims the external one, which is worse than an error. Reserved
// slugs are read straight out of gamesList.js so this can't drift.
function reservedSlugs() {
  const src = readFileSync(join(HERE, '..', 'src', 'components', 'games', 'gamesList.js'), 'utf8')
  return new Set([...src.matchAll(/href:\s*'\/games\/([^']+)'/g)].map((m) => m[1]))
}

const slugify = (s) => s.toLowerCase().trim()
  .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

// Cover art gradients, cycled so external tiles look like part of the arcade
// rather than a bolted-on grid of thumbnails.
const GRADIENTS = [
  ['#F97316', '#7C2D12'], ['#6366F1', '#1E1B4B'], ['#22C55E', '#14532D'],
  ['#38BDF8', '#1D4ED8'], ['#E879F9', '#701A75'], ['#F43F5E', '#4a1320'],
  ['#FCD34D', '#B45309'], ['#2DD4BF', '#115E59'], ['#A78BFA', '#6D28D9'],
]

// Feed category → our hub category. Unmapped ones land in 'arcade'.
// Covers both vocabularies: GameMonetize uses Titlecase words, GamePix uses
// lowercase slugs.
const CAT_MAP = {
  Puzzle: 'puzzle', Bejeweled: 'puzzle', Match3: 'puzzle', Jigsaw: 'puzzle',
  Mahjong: 'puzzle', Strategy: 'puzzle', Boardgames: 'classic', Cards: 'classic',
  Racing: 'racing', Sports: 'sports', Soccer: 'sports', Basketball: 'sports',
  puzzle: 'puzzle', 'match-3': 'puzzle', mahjong: 'puzzle', 'hidden-object': 'puzzle',
  memory: 'puzzle', trivia: 'puzzle', word: 'puzzle', block: 'puzzle', '2048': 'puzzle',
  educational: 'puzzle', drawing: 'puzzle', quiz: 'puzzle', strategy: 'puzzle',
  cards: 'classic', board: 'classic', retro: 'classic', solitaire: 'classic',
  racing: 'racing', car: 'racing', bike: 'racing', driving: 'racing',
  sports: 'sports', basketball: 'sports', football: 'sports', soccer: 'sports',
  golf: 'sports', pool: 'sports', ball: 'sports',
  arcade: 'arcade', kids: 'arcade', animal: 'arcade', fun: 'arcade',
  adventure: 'arcade', simulation: 'arcade', cooking: 'arcade', io: 'arcade',
}

// GamePix ships no tags and no description — the only text signal is a title
// and a one-word category slug, so the word-boundary filter has far less to
// chew on than it does for GameMonetize. Their categories are explicit though,
// so dropping unsafe ones outright does most of the work.
const GAMEPIX_BLOCK_CATEGORIES = new Set([
  'shooter', 'first-person-shooter', 'io-shooter', 'fighting', 'battle', 'war',
  'zombie', 'horror', 'gun', 'weapon', 'casino', 'card-casino', 'slots',
  'poker', 'stickman', 'boys', 'girls', 'dress-up',
])

// The GamePix feed is quality-ordered, so this mainly guards the tail of a
// deep pull, where the catalog turns into shovelware.
const MIN_QUALITY = 0.45

// ── Feed adapters ──────────────────────────────────────────────────────────
// Each returns records in ONE shape so the filter/slug/emit pipeline below
// stays provider-agnostic:
//   { id,title,description,instructions,url,category,tags,thumb,width,height,provider }

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`)
  return res.json()
}

async function fetchGameMonetize(provider, { pages }) {
  const out = []
  for (let page = 1; page <= pages; page++) {
    const url = provider.feedUrl({ num: 100, page })
    process.stdout.write(`  gamemonetize page ${page}\n`)
    const raw = await fetchJson(url)
    if (!raw.length) break
    for (const g of raw) out.push({ ...g, provider: 'gamemonetize' })
  }
  return out
}

async function fetchGamePix(provider, { pages, sid }) {
  const out = []
  for (let page = 1; page <= pages; page++) {
    // pagination is an ENUM (12|24|48|96) — 100 returns a 400 Validation Error.
    const url = provider.feedUrl({ sid, pagination: 96, page })
    process.stdout.write(`  gamepix page ${page}\n`)
    const raw = await fetchJson(url)
    const items = raw.items || []
    if (!items.length) break
    for (const g of items) {
      if (GAMEPIX_BLOCK_CATEGORIES.has(g.category)) continue
      if (typeof g.quality_score === 'number' && g.quality_score < MIN_QUALITY) continue
      out.push({
        id: g.id,
        title: g.title,
        // `description` is present on most but NOT all items (93/96 on the
        // first page), so it must be treated as optional — the very first game
        // I sampled happened to be one of the three without one.
        description: g.description || '',
        // No instructions field exists in this feed. Left empty rather than
        // inventing how-to copy for a game we haven't played.
        instructions: '',
        url: g.url,              // already carries our ?sid= for attribution
        category: g.category,
        tags: '',
        thumb: g.banner_image,
        width: g.width,
        height: g.height,
        slugHint: g.namespace,   // clean pre-made slug, better than slugifying
        // GamePix's own 0-1 editorial quality ranking. This is a REAL number
        // from the provider — it is NOT a like count, a play count or a user
        // rating, and must never be rendered as one.
        quality: typeof g.quality_score === 'number' ? Math.round(g.quality_score * 100) / 100 : null,
        // landscape | portrait | all. A quarter of the catalog is portrait, and
        // a portrait game stretched into a landscape stage looks broken, so the
        // player needs this to pick a frame shape.
        orientation: g.orientation || 'all',
        provider: 'gamepix',
      })
    }
  }
  return out
}

async function main() {
  const { PROVIDERS } = await import('../src/lib/gameProviders.js')

  const gmPages = Number(args[args.indexOf('--gm-pages') + 1]) || 2
  const gpPages = Number(args[args.indexOf('--gp-pages') + 1]) || 4
  const sid = args.includes('--sid') ? args[args.indexOf('--sid') + 1] : '581TT'

  process.stdout.write('Fetching feeds...\n')
  // One provider being down must not wipe the other's games out of the
  // catalog, so a failed feed is reported and skipped rather than thrown.
  const raw = []
  for (const [name, fn, opts] of [
    ['gamemonetize', fetchGameMonetize, { pages: gmPages }],
    ['gamepix', fetchGamePix, { pages: gpPages, sid }],
  ]) {
    try {
      const got = await fn(PROVIDERS[name], opts)
      process.stdout.write(`  ${name}: ${got.length} raw\n`)
      raw.push(...got)
    } catch (e) {
      process.stderr.write(`  ${name}: FEED FAILED (${e.message}) — skipping\n`)
    }
  }

  const reserved = reservedSlugs()
  const seen = new Set()
  const kept = []
  const dropped = []

  for (const raw_g of raw) {
    // Decode BEFORE filtering — an entity-escaped title could otherwise hide a
    // blocked word from the matcher.
    const g = {
      ...raw_g,
      title: decodeEntities(raw_g.title),
      description: decodeEntities(raw_g.description),
      instructions: decodeEntities(raw_g.instructions),
    }
    const reason = rejectReason(g)
    if (reason) { dropped.push({ ...g, reason }); continue }
    // GamePix publishes a clean `namespace` slug; prefer it over slugifying the
    // display title, which is what it was derived from anyway.
    let slug = slugify(g.slugHint || g.title)
    if (!slug) continue
    // Never take a slug our own games own, and never collide with each other.
    if (reserved.has(slug) || seen.has(slug)) slug = `${slug}-${g.id}`
    if (reserved.has(slug) || seen.has(slug)) continue
    seen.add(slug)

    const [g1, g2] = GRADIENTS[kept.length % GRADIENTS.length]
    kept.push({
      href: `/games/${slug}`,
      name: g.title.replace(/\s+/g, ' ').trim(),
      provider: g.provider,
      embedId: g.id,
      embed: g.url,
      thumb: g.thumb,
      // The feed's own aspect ratio — the player uses it so a 1920x1080 game
      // isn't letterboxed into a square.
      width: Number(g.width) || 960,
      height: Number(g.height) || 600,
      cat: CAT_MAP[g.category] || 'arcade',
      tag: g.category,
      desc: (g.description || '').replace(/\s+/g, ' ').trim().slice(0, 320),
      instructions: (g.instructions || '').replace(/\s+/g, ' ').trim().slice(0, 240),
      ...(g.quality != null ? { quality: g.quality } : null),
      ...(g.orientation && g.orientation !== 'all' ? { orientation: g.orientation } : null),
      g1, g2,
    })
  }

  process.stdout.write(`\nfeed: ${raw.length}   kept: ${kept.length}   dropped: ${dropped.length}\n`)

  // Group the rejections so an over-eager blocklist word is obvious at a glance
  // rather than hiding inside a long list of individually-plausible drops.
  const byReason = {}
  for (const g of dropped) (byReason[g.reason] ||= []).push(g.title)
  process.stdout.write(`\nDropped by reason:\n`)
  for (const [reason, titles] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
    process.stdout.write(`  ${String(titles.length).padStart(3)} × ${reason.padEnd(22)} e.g. ${titles.slice(0, 2).join(' | ')}\n`)
  }
  process.stdout.write(`\nKept:\n`)
  for (const g of kept) process.stdout.write(`  ✓ [${g.cat.padEnd(7)}] ${g.name.padEnd(34)} → ${g.href}\n`)

  if (!WRITE) {
    process.stdout.write(`\nPreview only. Re-run with --write to update ${OUT}\n`)
    return
  }
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : []
  writeFileSync(OUT, `${JSON.stringify(kept, null, 2)}\n`)
  process.stdout.write(`\nWrote ${kept.length} games to externalGames.json (was ${prev.length}). Review the diff before committing.\n`)
}

main().catch((e) => { process.stderr.write(`FAILED: ${e.message}\n`); process.exit(1) })
