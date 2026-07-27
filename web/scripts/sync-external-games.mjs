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
  if (!ALLOW_CATEGORIES.has(g.category)) return `category:${g.category}`
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
const CAT_MAP = {
  Puzzle: 'puzzle', Bejeweled: 'puzzle', Match3: 'puzzle', Jigsaw: 'puzzle',
  Mahjong: 'puzzle', Strategy: 'puzzle', Boardgames: 'classic', Cards: 'classic',
  Racing: 'racing', Sports: 'sports', Soccer: 'sports', Basketball: 'sports',
}

async function main() {
  const { PROVIDERS } = await import('../src/lib/gameProviders.js')
  const provider = PROVIDERS.gamemonetize

  const url = provider.feedUrl({ num: NUM })
  process.stdout.write(`Fetching ${url}\n`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`feed ${res.status} ${res.statusText}`)
  const raw = await res.json()

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
    let slug = slugify(g.title)
    if (!slug) continue
    // Never take a slug our own games own, and never collide with each other.
    if (reserved.has(slug) || seen.has(slug)) slug = `${slug}-${g.id}`
    if (reserved.has(slug) || seen.has(slug)) continue
    seen.add(slug)

    const [g1, g2] = GRADIENTS[kept.length % GRADIENTS.length]
    kept.push({
      href: `/games/${slug}`,
      name: g.title.replace(/\s+/g, ' ').trim(),
      provider: provider.id,
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
