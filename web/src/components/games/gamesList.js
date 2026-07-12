// Single source of truth for the Guac Arcade catalog — the /games hub,
// each game page's rails, and the sitemap all read from here.
// g1/g2 are the cover-art gradient, `motifs` are the floating cover emoji,
// `cat` groups the hub rows: arcade | goal | puzzle.
// `bestKey` is the game's own localStorage key (best score / saved progress);
// the hub's "Pick up where you left off" row is driven by its presence.
export const GAMES = [
  // ── classics ──────────────────────────────────────────────────────────────
  {
    href: '/games/muncher', emoji: '🥑', name: 'Guac Muncher', tag: 'Arcade classic', cat: 'arcade', isNew: true,
    g1: '#0F766E', g2: '#022C22', motifs: ['👻', '🪙'], bestKey: 'gg-muncher-best-v1',
    desc: 'Chomp every coin in the maze and dodge the ghosts — power coins let you bite back.',
  },
  {
    href: '/games/rocks', emoji: '🚀', name: 'Space Rocks', tag: 'Arcade classic', cat: 'arcade', isNew: true,
    g1: '#6366F1', g2: '#1E1B4B', motifs: ['☄️', '🛸'], bestKey: 'gg-rocks-best-v1',
    desc: 'Rotate, thrust, fire — blast the asteroids before they crush your starship.',
  },
  {
    href: '/games/darts', emoji: '🎯', name: 'Bullseye Darts', tag: 'Arcade classic', cat: 'arcade', isNew: true,
    g1: '#EF4444', g2: '#7F1D1D', motifs: ['🎪', '✨'], bestKey: 'gg-darts-best-v1',
    desc: 'Time the swaying crosshair and hit trebles, doubles and the bullseye. Ten darts.',
  },
  {
    href: '/games/bubbles', emoji: '🫧', name: 'Bubble Pop', tag: 'Arcade', cat: 'arcade',
    g1: '#38BDF8', g2: '#1D4ED8', motifs: ['💥', '🫧'], bestKey: 'gg-bubbles-best-v1',
    desc: 'Aim, shoot, match three — pop the spending bubbles before the wall reaches your wallet.',
  },
  {
    href: '/games/slicer', emoji: '🥷', name: 'Waste Slicer', tag: 'Arcade', cat: 'arcade',
    g1: '#10B981', g2: '#064E3B', motifs: ['⚔️', '💸'], bestKey: 'gg-slicer-best-v1',
    desc: 'Fees and impulse buys fly — slice them mid-air. Spare the essentials.',
  },
  {
    href: '/games/stacker', emoji: '🧾', name: 'Receipt Stacker', tag: 'Arcade', cat: 'arcade',
    g1: '#FB7185', g2: '#9F1239', motifs: ['🧱', '📄'], bestKey: 'gg-stacker-best-v1',
    desc: 'Falling expenses, classic stacking rules. Balance the receipt line by line.',
  },
  // ── goal games ────────────────────────────────────────────────────────────
  {
    href: '/games/breaker', emoji: '🧱', name: 'Debt Breaker', tag: 'Debt-free goal', cat: 'goal', isNew: true,
    g1: '#F97316', g2: '#9A3412', motifs: ['💳', '💥'], bestKey: 'gg-breaker-best-v1',
    desc: 'The brick wall is your debt. Paddle, ball, power-ups — smash your way to debt-free.',
  },
  {
    href: '/games/nestegg', emoji: '🪺', name: 'Nest Egg Climb', tag: 'Retirement goal', cat: 'goal', isNew: true,
    g1: '#34D399', g2: '#0D9488', motifs: ['🏖️', '📈'], bestKey: 'gg-nestegg-best-v1',
    desc: 'Bounce from platform to platform and grow the nest egg from $0 to a $1M retirement.',
  },
  {
    href: '/games/house', emoji: '🏡', name: 'Dream House Stack', tag: 'Home goal', cat: 'goal', isNew: true,
    g1: '#A78BFA', g2: '#6D28D9', motifs: ['🏗️', '🌇'], bestKey: 'gg-house-best-v1',
    desc: 'Drop the swinging floors dead-center and stack your way to the dream house.',
  },
  {
    href: '/games/tuition', emoji: '🎓', name: 'Tuition Invaders', tag: 'College goal', cat: 'goal', isNew: true,
    g1: '#60A5FA', g2: '#1E40AF', motifs: ['📚', '🚌'], bestKey: 'gg-tuition-best-v1',
    desc: 'Waves of tuition bills descend on the college fund — clear each semester to graduate.',
  },
  // ── puzzle & word ─────────────────────────────────────────────────────────
  {
    href: '/games/guacdle', emoji: '🟩', name: 'Guacdle', tag: 'Daily word', cat: 'puzzle',
    g1: '#16A34A', g2: '#14532D', motifs: ['🔤', '💡'], bestKey: 'guacdle-day-v1',
    desc: 'Guess the 5-letter money word in 6 tries. One new word every day.',
  },
  {
    href: '/games/price-check', emoji: '🏷️', name: 'Price Check', tag: 'Quick play', cat: 'puzzle',
    g1: '#F59E0B', g2: '#92400E', motifs: ['🛒', '❓'], bestKey: 'gg-pricecheck-best-v1',
    desc: 'Higher or lower? Call the typical price of everyday stuff and keep the run alive.',
  },
  {
    href: '/games/merge', emoji: '💰', name: 'Money Merge', tag: 'Puzzle', cat: 'puzzle',
    g1: '#FCD34D', g2: '#B45309', motifs: ['🧮', '✨'], bestKey: 'gg-merge-best-v1',
    desc: 'Equal dollars merge and double. Compound a single $1 into $2,048.',
  },
  {
    href: '/games/rope', emoji: '🪢', name: 'Guac Drop', tag: 'Physics puzzle', cat: 'puzzle',
    g1: '#2DD4BF', g2: '#115E59', motifs: ['✂️', '🫙'], bestKey: 'gg-guacdrop-v1',
    desc: 'Cut the ropes at the right moment and swing the avocado into the savings jar.',
  },
  {
    href: '/games/chess', emoji: '♟️', name: 'Guac Chess', tag: 'Strategy', cat: 'puzzle',
    g1: '#64748B', g2: '#1E293B', motifs: ['👑', '🏁'], // no local save — never in "continue playing"
    desc: 'Savers vs. Spenders. Full chess, three difficulties — every capture has a price tag.',
  },
]

export const CATEGORIES = [
  { id: 'arcade', title: 'Arcade classics', emoji: '🕹️', blurb: 'Mazes, asteroids, darts, bubbles — the greats, free in your browser.' },
  { id: 'goal', title: 'Goal games', emoji: '🏁', blurb: 'Debt-free, dream house, college fund, retirement — play the goals you’re saving for.' },
  { id: 'puzzle', title: 'Puzzle, word & strategy', emoji: '🧩', blurb: 'Daily words, price instincts and slow-burn strategy.' },
]

export const FEATURED_HREF = '/games/muncher'

// Hub hero: the featured 2×2 tile + these covers = "Jump into our most
// popular games". Hand-ordered, not data-driven (no analytics yet).
export const POPULAR_HREFS = [
  '/games/bubbles', '/games/rocks', '/games/breaker', '/games/darts',
  '/games/merge', '/games/guacdle', '/games/slicer', '/games/nestegg',
]

// game_scores/leaderboard id for a catalog entry — the href slug, with the
// one legacy exception (price-check saves as 'price').
export const gameIdFor = (href) => (href === '/games/price-check' ? 'price' : href.split('/').pop())
