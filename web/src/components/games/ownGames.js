// Our own games — the hand-built canvas/DOM titles with their own routes.
//
// Deliberately a SEPARATE module from gamesList.js, which merges these with
// externalGames.json (~416 KB of partner catalog). Anything that only needs
// our own games — the dashboard's arcade launcher, for one — imports this and
// stays out of that JSON. gamesList.js re-exports OWN_GAMES, so this is still
// the single source of truth for our catalog.
// game_scores/leaderboard id for a catalog entry — the href slug, with the one
// legacy exception (price-check saves as 'price'). Lives here rather than in
// gamesList.js so callers that only need the slug don't import the 416 KB
// partner catalog to get it.
export const gameIdFor = (href) => (href === '/games/price-check' ? 'price' : href.split('/').pop())

export const OWN_GAMES = [
  // ── your money (personalized — plays with your REAL spending) ──────────────
  {
    href: '/games/splurge', emoji: '🔪', name: 'Splurge Slicer', tag: 'Your spending', cat: 'money', isNew: true,
    g1: '#F97316', g2: '#7C2D12', motifs: ['💸', '🥑'], bestKey: 'gg-splurge-best-v1',
    desc: 'Slice your real splurges through a seven-round money journey — cut expenses, build savings, buy the house, invest, retire free.',
  },
  {
    href: '/games/invaders', emoji: '👾', name: 'Expense Invaders', tag: 'Your spending', cat: 'money', isNew: true,
    g1: '#6366F1', g2: '#1E1B4B', motifs: ['💸', '🛡️'], bestKey: 'gg-invaders-best-v1',
    desc: 'Your top spending categories descend as armored invaders — blast the biggest overspend across a seven-round money journey.',
  },
  {
    href: '/games/budget', emoji: '🧱', name: 'Budget Tetris', tag: 'Your spending', cat: 'money', isNew: true,
    g1: '#22C55E', g2: '#14532D', motifs: ['🧾', '📊'], bestKey: 'gg-budget-best-v1',
    desc: 'Your expenses fall as blocks sized by price — fill a row to bank it, one round of the money journey at a time.',
  },
  // ── racing & wheels ───────────────────────────────────────────────────────
  {
    href: '/games/climb', emoji: '🚙', name: 'Guac Hill Climb', tag: 'Hill racer', cat: 'racing', isNew: true,
    g1: '#7DD3FC', g2: '#166534', motifs: ['⛰️', '🪙'], bestKey: 'gg-climb-best-v1',
    desc: 'Drive the avocado buggy over the hills, grab the cash and don’t run out of fuel or flip.',
  },
  {
    href: '/games/bike', emoji: '🏍️', name: 'Guac Bike Racing', tag: 'Hill bike', cat: 'racing', isNew: true,
    g1: '#7DD3FC', g2: '#7C2D12', motifs: ['🏔️', '🪙'], bestKey: 'gg-bike-best-v1',
    desc: 'Wheelie the avocado motorbike over the hills — grab the cash and stick the landings.',
  },
  {
    href: '/games/nitro', emoji: '🏎️', name: 'Guac Nitro Run', tag: 'Street racer', cat: 'racing', isNew: true,
    g1: '#334155', g2: '#0F172A', motifs: ['🚗', '🪙'], bestKey: 'gg-nitro-best-v1',
    desc: 'Swerve between lanes, dodge the traffic and grab the cash as the speed keeps climbing.',
  },
  // ── arcade ────────────────────────────────────────────────────────────────
  {
    href: '/games/fruit', emoji: '🍉', name: 'Fruit Slice', tag: 'Swipe arcade', cat: 'arcade', isNew: true, featured: true,
    g1: '#F43F5E', g2: '#4a1320', motifs: ['🍉', '🍊'], bestKey: 'gg-fruit-best-v1',
    desc: 'Fruit flies, blades swipe. Chain slices for combos, dodge the bombs, and paint the screen in juice.',
  },
  {
    href: '/games/fling', emoji: '🏹', name: 'Guac Fling', tag: 'Physics arcade', cat: 'arcade', isNew: true,
    g1: '#F43F5E', g2: '#7C2D12', motifs: ['🏰', '💥'], bestKey: 'gg-fling-best-v1',
    desc: 'Slingshot avocados at the fee towers and topple every money-waster inside.',
  },
  {
    href: '/games/flappy', emoji: '🐤', name: 'Flappy Guac', tag: 'One-tap arcade', cat: 'arcade', isNew: true,
    g1: '#7DD3FC', g2: '#0369A1', motifs: ['🌵', '💸'], bestKey: 'gg-flappy-best-v1',
    desc: 'Tap to flap the winged avocado through the fee pipes. One touch, endless rage.',
  },
  {
    href: '/games/whack', emoji: '🔨', name: 'Whack-a-Fee', tag: 'Reflex arcade', cat: 'arcade', isNew: true,
    g1: '#D97706', g2: '#451A03', motifs: ['🕳️', '💸'], bestKey: 'gg-whack-best-v1',
    desc: 'Fees pop out of the holes — hammer them flat, but never bonk the piggy bank.',
  },
  {
    href: '/games/muncher', emoji: '🥑', name: 'Guac Muncher', tag: 'Arcade classic', cat: 'arcade',
    g1: '#0F766E', g2: '#022C22', motifs: ['👻', '🪙'], bestKey: 'gg-muncher-best-v1',
    desc: 'Chomp every coin in the maze and dodge the ghosts — power coins let you bite back.',
  },
  {
    href: '/games/rocks', emoji: '🚀', name: 'Space Rocks', tag: 'Arcade classic', cat: 'arcade',
    g1: '#6366F1', g2: '#1E1B4B', motifs: ['☄️', '🛸'], bestKey: 'gg-rocks-best-v1',
    desc: 'Rotate, thrust, fire — blast the asteroids before they crush your starship.',
  },
  {
    href: '/games/darts', emoji: '🎯', name: 'Bullseye Darts', tag: 'Arcade classic', cat: 'arcade',
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
  // ── sports ────────────────────────────────────────────────────────────────
  {
    href: '/games/penalty', emoji: '⚽', name: 'Penalty Shootout', tag: 'Soccer', cat: 'sports', isNew: true,
    g1: '#22C55E', g2: '#14532D', motifs: ['🥅', '🧤'], bestKey: 'gg-penalty-best-v1',
    desc: 'Ten penalties, one keeper with a grudge. Pick your corner, nail your timing, score.',
  },
  {
    href: '/games/hoops', emoji: '🏀', name: 'Hoop Shot', tag: 'Basketball', cat: 'sports', isNew: true,
    g1: '#FB923C', g2: '#7C2D12', motifs: ['🏆', '🔥'], bestKey: 'gg-hoops-best-v1',
    desc: 'Drag, aim, swish. Sixty seconds on the clock — three in a row sets the ball on fire.',
  },
  // ── classic favorites ─────────────────────────────────────────────────────
  {
    href: '/games/solitaire', emoji: '🃏', name: 'Guac Solitaire', tag: 'Card classic', cat: 'classic', isNew: true,
    g1: '#059669', g2: '#064E3B', motifs: ['♠️', '♥️'], bestKey: 'gg-solitaire-best-v1',
    desc: 'Klondike on the green felt — tap to move, build the foundations, clear the deck.',
  },
  {
    href: '/games/sweeper', emoji: '💣', name: 'Fee Sweeper', tag: 'Logic classic', cat: 'classic', isNew: true,
    g1: '#64748B', g2: '#0F172A', motifs: ['🚩', '💥'], bestKey: 'gg-sweeper-best-v1',
    desc: 'The board is seeded with hidden fees. Read the numbers, flag the traps, clear it.',
  },
  {
    href: '/games/snake', emoji: '🐍', name: 'Coin Snake', tag: 'Arcade classic', cat: 'classic', isNew: true,
    g1: '#84CC16', g2: '#365314', motifs: ['🪙', '💎'], bestKey: 'gg-snake-best-v1',
    desc: 'Eat coins, grow long, don’t bite yourself. The classic, with a money twist.',
  },
  {
    href: '/games/pong', emoji: '🏓', name: 'Penny Pong', tag: 'Retro classic', cat: 'classic', isNew: true,
    g1: '#0EA5E9', g2: '#0C4A6E', motifs: ['🕹️', '⚡'], bestKey: 'gg-pong-best-v1',
    desc: 'First to seven against a computer that never blinks. The original video game, remixed.',
  },
  {
    href: '/games/pairs', emoji: '🎴', name: 'Money Match', tag: 'Memory classic', cat: 'classic', isNew: true,
    g1: '#E879F9', g2: '#701A75', motifs: ['🧠', '✨'], bestKey: 'gg-pairs-best-v1',
    desc: 'Flip two cards, find the pair, remember everything. Fewer moves, bigger score.',
  },
  {
    href: '/games/simon', emoji: '🚦', name: 'Guac Says', tag: 'Memory classic', cat: 'classic', isNew: true,
    g1: '#8B5CF6', g2: '#4C1D95', motifs: ['🎵', '💡'], bestKey: 'gg-simon-best-v1',
    desc: 'Watch the pads light up, replay the sequence. Each round adds one more step.',
  },
  // ── goal games ────────────────────────────────────────────────────────────
  {
    href: '/games/breaker', emoji: '🧱', name: 'Debt Breaker', tag: 'Debt-free goal', cat: 'goal',
    g1: '#F97316', g2: '#9A3412', motifs: ['💳', '💥'], bestKey: 'gg-breaker-best-v1',
    desc: 'The brick wall is your debt. Paddle, ball, power-ups — smash your way to debt-free.',
  },
  {
    href: '/games/nestegg', emoji: '🪺', name: 'Nest Egg Climb', tag: 'Retirement goal', cat: 'goal',
    g1: '#34D399', g2: '#0D9488', motifs: ['🏖️', '📈'], bestKey: 'gg-nestegg-best-v1',
    desc: 'Bounce from platform to platform and grow the nest egg from $0 to a $1M retirement. Chapter 6 of the money journey.',
  },
  {
    href: '/games/house', emoji: '🏡', name: 'Dream House Stack', tag: 'Home goal', cat: 'goal',
    g1: '#A78BFA', g2: '#6D28D9', motifs: ['🏗️', '🌇'], bestKey: 'gg-house-best-v1',
    desc: 'Drop the swinging floors dead-center and stack your way to the dream house. Chapter 5 of the money journey.',
  },
  {
    href: '/games/tuition', emoji: '🎓', name: 'Tuition Invaders', tag: 'College goal', cat: 'goal',
    g1: '#60A5FA', g2: '#1E40AF', motifs: ['📚', '🚌'], bestKey: 'gg-tuition-best-v1',
    desc: 'Waves of tuition bills descend on the college fund — clear each semester to graduate. Chapter 7 of the money journey.',
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
    href: '/games/crush', emoji: '💎', name: 'Guac Crush', tag: 'Match-3', cat: 'puzzle', isNew: true,
    g1: '#F472B6', g2: '#831843', motifs: ['💰', '✨'], bestKey: 'gg-crush-best-v1',
    desc: 'Swap, match three, chain the cascades. Twenty-five moves to crush your best.',
  },
  {
    href: '/games/wordsearch', emoji: '🔎', name: 'Money Word Search', tag: 'Word puzzle', cat: 'puzzle', isNew: true,
    g1: '#06B6D4', g2: '#164E63', motifs: ['🔤', '📖'], bestKey: 'gg-wordsearch-best-v1',
    desc: 'Ten money words hide in the letter grid — drag to find them all, fast.',
  },
  {
    href: '/games/sudoku', emoji: '🔢', name: 'Guac Sudoku', tag: 'Number puzzle', cat: 'puzzle', isNew: true,
    g1: '#818CF8', g2: '#312E81', motifs: ['✏️', '🧮'], bestKey: 'gg-sudoku-best-v1',
    desc: 'A fresh solvable grid every game, three difficulties. Nine rows, no guessing.',
  },
  {
    href: '/games/chess', emoji: '♟️', name: 'Guac Chess', tag: 'Strategy', cat: 'puzzle',
    g1: '#64748B', g2: '#1E293B', motifs: ['👑', '🏁'], // no local save — never in "continue playing"
    desc: 'Savers vs. Spenders. Full chess, three difficulties — every capture has a price tag.',
  },
]
