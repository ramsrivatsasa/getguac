// Single source of truth for the Guac Arcade catalog — the /games hub,
// each game page's "More games" strip, and the sitemap all read from here.
// g1/g2 are the cover-art gradient, `motifs` are the floating cover emoji,
// `cat` groups the hub rows: arcade | goal | puzzle | daily.
export const GAMES = [
  // ── classics ──────────────────────────────────────────────────────────────
  {
    href: '/games/muncher', emoji: '🥑', name: 'Guac Muncher', tag: 'Arcade classic', cat: 'arcade', isNew: true,
    g1: '#0F766E', g2: '#022C22', motifs: ['👻', '🪙'],
    desc: 'Chomp every coin in the maze and dodge the ghosts — power coins let you bite back.',
  },
  {
    href: '/games/rocks', emoji: '🚀', name: 'Space Rocks', tag: 'Arcade classic', cat: 'arcade', isNew: true,
    g1: '#6366F1', g2: '#1E1B4B', motifs: ['☄️', '🛸'],
    desc: 'Rotate, thrust, fire — blast the asteroids before they crush your starship.',
  },
  {
    href: '/games/darts', emoji: '🎯', name: 'Bullseye Darts', tag: 'Arcade classic', cat: 'arcade', isNew: true,
    g1: '#EF4444', g2: '#7F1D1D', motifs: ['🎪', '✨'],
    desc: 'Time the swaying crosshair and hit trebles, doubles and the bullseye. Ten darts.',
  },
  {
    href: '/games/bubbles', emoji: '🫧', name: 'Bubble Pop', tag: 'Arcade', cat: 'arcade',
    g1: '#38BDF8', g2: '#1D4ED8', motifs: ['💥', '🫧'],
    desc: 'Aim, shoot, match three — pop the spending bubbles before the wall reaches your wallet.',
  },
  {
    href: '/games/slicer', emoji: '🥷', name: 'Waste Slicer', tag: 'Arcade', cat: 'arcade',
    g1: '#10B981', g2: '#064E3B', motifs: ['⚔️', '💸'],
    desc: 'Fees and impulse buys fly — slice them mid-air. Spare the essentials.',
  },
  {
    href: '/games/stacker', emoji: '🧾', name: 'Receipt Stacker', tag: 'Arcade', cat: 'arcade',
    g1: '#FB7185', g2: '#9F1239', motifs: ['🧱', '📄'],
    desc: 'Falling expenses, classic stacking rules. Balance the receipt line by line.',
  },
  // ── goal games ────────────────────────────────────────────────────────────
  {
    href: '/games/breaker', emoji: '🧱', name: 'Debt Breaker', tag: 'Debt-free goal', cat: 'goal', isNew: true,
    g1: '#F97316', g2: '#9A3412', motifs: ['💳', '💥'],
    desc: 'The brick wall is your debt. Paddle, ball, power-ups — smash your way to debt-free.',
  },
  {
    href: '/games/nestegg', emoji: '🪺', name: 'Nest Egg Climb', tag: 'Retirement goal', cat: 'goal', isNew: true,
    g1: '#34D399', g2: '#0D9488', motifs: ['🏖️', '📈'],
    desc: 'Bounce from platform to platform and grow the nest egg from $0 to a $1M retirement.',
  },
  {
    href: '/games/house', emoji: '🏡', name: 'Dream House Stack', tag: 'Home goal', cat: 'goal', isNew: true,
    g1: '#A78BFA', g2: '#6D28D9', motifs: ['🏗️', '🌇'],
    desc: 'Drop the swinging floors dead-center and stack your way to the dream house.',
  },
  {
    href: '/games/tuition', emoji: '🎓', name: 'Tuition Invaders', tag: 'College goal', cat: 'goal', isNew: true,
    g1: '#60A5FA', g2: '#1E40AF', motifs: ['📚', '🚌'],
    desc: 'Waves of tuition bills descend on the college fund — clear each semester to graduate.',
  },
  // ── puzzle & word ─────────────────────────────────────────────────────────
  {
    href: '/games/guacdle', emoji: '🟩', name: 'Guacdle', tag: 'Daily word', cat: 'puzzle',
    g1: '#16A34A', g2: '#14532D', motifs: ['🔤', '💡'],
    desc: 'Guess the 5-letter money word in 6 tries. One new word every day.',
  },
  {
    href: '/games/price-check', emoji: '🏷️', name: 'Price Check', tag: 'Quick play', cat: 'puzzle',
    g1: '#F59E0B', g2: '#92400E', motifs: ['🛒', '❓'],
    desc: 'Higher or lower? Call the typical price of everyday stuff and keep the run alive.',
  },
  {
    href: '/games/merge', emoji: '💰', name: 'Money Merge', tag: 'Puzzle', cat: 'puzzle',
    g1: '#FCD34D', g2: '#B45309', motifs: ['🧮', '✨'],
    desc: 'Equal dollars merge and double. Compound a single $1 into $2,048.',
  },
  {
    href: '/games/rope', emoji: '🪢', name: 'Guac Drop', tag: 'Physics puzzle', cat: 'puzzle',
    g1: '#2DD4BF', g2: '#115E59', motifs: ['✂️', '🫙'],
    desc: 'Cut the ropes at the right moment and swing the avocado into the savings jar.',
  },
  {
    href: '/games/chess', emoji: '♟️', name: 'Guac Chess', tag: 'Strategy', cat: 'puzzle',
    g1: '#64748B', g2: '#1E293B', motifs: ['👑', '🏁'],
    desc: 'Savers vs. Spenders. Full chess, three difficulties — every capture has a price tag.',
  },
]

export const CATEGORIES = [
  { id: 'arcade', title: 'Arcade classics', blurb: 'Mazes, asteroids, darts, bubbles — the greats, free in your browser.' },
  { id: 'goal', title: 'Goal games', blurb: 'Debt-free, dream house, college fund, retirement — play the goals you’re saving for.' },
  { id: 'puzzle', title: 'Puzzle, word & strategy', blurb: 'Daily words, price instincts and slow-burn strategy.' },
]

export const FEATURED_HREF = '/games/muncher'

// game_scores/leaderboard id for a catalog entry — the href slug, with the
// one legacy exception (price-check saves as 'price').
export const gameIdFor = (href) => (href === '/games/price-check' ? 'price' : href.split('/').pop())
