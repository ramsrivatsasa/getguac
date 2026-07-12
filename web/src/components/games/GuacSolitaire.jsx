'use client'
// Guac Solitaire — Klondike on the green felt, tap-to-move (mobile friendly):
// tap the stock to deal, tap any face-up card and it flows to the best legal
// home (foundation first, then tableau). Draw-1, unlimited recycles (−20),
// standard scoring, one-tap undo, and an auto-finish button once the stock
// is empty and every card is face up. DOM cards inside the shared GameFrame.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  SaveScoreLine, PrimaryButton, GhostButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-solitaire-best-v1'
const SUITS = ['♠', '♥', '♦', '♣']
const RED = new Set(['♥', '♦'])
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

let cid = 1
const makeDeck = () => {
  const deck = []
  for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ id: cid++, suit: s, rank: r, faceUp: false })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

const deal = () => {
  const deck = makeDeck()
  const tab = Array.from({ length: 7 }, () => [])
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r <= c; r++) tab[c].push(deck.pop())
    tab[c][tab[c].length - 1].faceUp = true
  }
  return { stock: deck, waste: [], found: [[], [], [], []], tab, score: 0, moves: 0 }
}

const clone = (g) => ({
  stock: g.stock.map((c) => ({ ...c })),
  waste: g.waste.map((c) => ({ ...c })),
  found: g.found.map((p) => p.map((c) => ({ ...c }))),
  tab: g.tab.map((p) => p.map((c) => ({ ...c }))),
  score: g.score, moves: g.moves,
})

const canFound = (card, pile) =>
  pile.length === 0 ? card.rank === 1 : pile[pile.length - 1].suit === card.suit && pile[pile.length - 1].rank === card.rank - 1
const canTab = (card, pile) =>
  pile.length === 0
    ? card.rank === 13
    : pile[pile.length - 1].faceUp &&
      pile[pile.length - 1].rank === card.rank + 1 &&
      RED.has(pile[pile.length - 1].suit) !== RED.has(card.suit)

export default function GuacSolitaire() {
  const [game, setGame] = useState(null)
  const [status, setStatus] = useState('idle')   // idle | playing | won
  const [seconds, setSeconds] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [shake, setShake] = useState(0)          // card id to wiggle on illegal tap
  const historyRef = useRef([])

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('solitaire')

  const sfx = (name) => {
    switch (name) {
      case 'deal': tone({ f0: 340, f1: 240, t: 0.05, type: 'triangle', g: 0.06 }); break
      case 'move': tone({ f0: 460, f1: 560, t: 0.05, type: 'triangle', g: 0.07 }); break
      case 'found': tone({ f0: 700, f1: 1050, t: 0.09, type: 'square', g: 0.1 }); break
      case 'flip': tone({ f0: 520, f1: 660, t: 0.06, type: 'square', g: 0.07 }); break
      case 'nope': tone({ f0: 180, f1: 120, t: 0.09, type: 'sawtooth', g: 0.08 }); break
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f0: f, t: 0.14, g: 0.14, at: i * 0.09 })); break
      default: break
    }
  }

  useEffect(() => {
    if (status !== 'playing') return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const start = () => {
    historyRef.current = []
    setGame(deal())
    setSeconds(0)
    resetSave()
    setStatus('playing')
  }

  const push = (g) => {
    historyRef.current.push(clone(g))
    if (historyRef.current.length > 30) historyRef.current.shift()
  }

  const undo = () => {
    const prev = historyRef.current.pop()
    if (prev) { setGame(prev); sfx('deal') }
  }

  const winCheck = (g) => {
    if (g.found.every((p) => p.length === 13)) {
      const bonus = 300 + Math.max(0, 700 - seconds)
      g.score += bonus
      const sc = g.score
      setFinalScore(sc)
      submitBest(sc)
      save(sc, null)
      setStatus('won')
      sfx('win')
    }
  }

  const nope = (id) => { setShake(id); sfx('nope'); setTimeout(() => setShake(0), 350) }

  const tapStock = () => {
    if (status !== 'playing') return
    const g = clone(game)
    push(game)
    if (g.stock.length) {
      const c = g.stock.pop()
      c.faceUp = true
      g.waste.push(c)
      sfx('deal')
    } else if (g.waste.length) {
      g.stock = g.waste.reverse().map((c) => ({ ...c, faceUp: false }))
      g.waste = []
      g.score = Math.max(0, g.score - 20)
      sfx('deal')
    } else { historyRef.current.pop(); return }
    g.moves++
    setGame(g)
  }

  // move the top waste card (foundation → tableau)
  const tapWaste = () => {
    if (status !== 'playing' || !game.waste.length) return
    const g = clone(game)
    const c = g.waste[g.waste.length - 1]
    const fi = g.found.findIndex((p) => canFound(c, p))
    if (fi >= 0) {
      push(game)
      g.found[fi].push(g.waste.pop())
      g.score += 10; g.moves++
      setGame(g); sfx('found'); winCheck(g)
      return
    }
    const ti = g.tab.findIndex((p) => canTab(c, p))
    if (ti >= 0) {
      push(game)
      g.tab[ti].push(g.waste.pop())
      g.score += 5; g.moves++
      setGame(g); sfx('move')
      return
    }
    nope(c.id)
  }

  // tap a face-up tableau card: top card tries foundation, any card tries
  // to bring its run to another column; exposing a face-down card flips it.
  const tapTab = (col, idx) => {
    if (status !== 'playing') return
    const pile = game.tab[col]
    const card = pile[idx]
    if (!card.faceUp) {
      // tapping the top face-down card flips it (only reachable when exposed)
      if (idx === pile.length - 1) {
        const g = clone(game)
        push(game)
        g.tab[col][idx].faceUp = true
        g.score += 5; g.moves++
        setGame(g); sfx('flip')
      }
      return
    }
    const isTop = idx === pile.length - 1
    if (isTop) {
      const g = clone(game)
      const fi = g.found.findIndex((p) => canFound(card, p))
      if (fi >= 0) {
        push(game)
        g.found[fi].push(g.tab[col].pop())
        g.score += 10; g.moves++
        const under = g.tab[col][g.tab[col].length - 1]
        if (under && !under.faceUp) { under.faceUp = true; g.score += 5 }
        setGame(g); sfx('found'); winCheck(g)
        return
      }
    }
    // move the run starting at idx to the first legal column
    for (let t = 0; t < 7; t++) {
      if (t === col) continue
      // don't shuffle a king between empty columns forever
      if (game.tab[t].length === 0 && card.rank === 13 && idx === 0) continue
      if (canTab(card, game.tab[t])) {
        const g = clone(game)
        push(game)
        const run = g.tab[col].splice(idx)
        g.tab[t].push(...run)
        const under = g.tab[col][g.tab[col].length - 1]
        if (under && !under.faceUp) { under.faceUp = true; g.score += 5 }
        g.moves++
        setGame(g); sfx('move')
        return
      }
    }
    nope(card.id)
  }

  // auto-finish once nothing is hidden and the stock is done
  const canAutoFinish =
    status === 'playing' && game && game.stock.length === 0 && game.waste.length <= 1 &&
    game.tab.every((p) => p.every((c) => c.faceUp)) && game.found.some((p) => p.length < 13)

  const autoFinish = () => {
    const g = clone(game)
    push(game)
    let moved = true
    while (moved) {
      moved = false
      if (g.waste.length) {
        const c = g.waste[g.waste.length - 1]
        const fi = g.found.findIndex((p) => canFound(c, p))
        if (fi >= 0) { g.found[fi].push(g.waste.pop()); g.score += 10; moved = true }
      }
      for (let col = 0; col < 7; col++) {
        const p = g.tab[col]
        if (!p.length) continue
        const c = p[p.length - 1]
        const fi = g.found.findIndex((f) => canFound(c, f))
        if (fi >= 0) { g.found[fi].push(p.pop()); g.score += 10; moved = true }
      }
    }
    g.moves++
    setGame(g)
    sfx('found')
    winCheck(g)
  }

  // ─── card chrome ──────────────────────────────────────────────────────────
  const Card = ({ card, onClick, style }) => {
    const red = RED.has(card.suit)
    return (
      <button
        type="button"
        onClick={onClick}
        className="absolute left-0 right-0 rounded-lg text-left"
        style={{
          aspectRatio: '2.5 / 3.6',
          border: '1px solid rgba(20,40,28,0.28)',
          background: card.faceUp ? '#fff' : 'repeating-linear-gradient(135deg, #15803d, #15803d 6px, #166534 6px, #166534 12px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          animation: shake === card.id ? 'ggshake .3s ease' : 'none',
          ...style,
        }}
      >
        {card.faceUp && (
          <span className="absolute top-0.5 left-1.5 font-display font-extrabold leading-none" style={{ color: red ? '#dc2626' : '#111827', fontSize: 'clamp(10px, 2.4vw, 15px)' }}>
            {RANKS[card.rank]}<span className="ml-0.5">{card.suit}</span>
          </span>
        )}
        {card.faceUp && (
          <span className="absolute inset-0 flex items-end justify-end pr-1 pb-0.5" style={{ color: red ? '#dc2626' : '#111827', fontSize: 'clamp(13px, 3.4vw, 22px)' }}>
            {card.suit}
          </span>
        )}
      </button>
    )
  }

  const slotStyle = {
    aspectRatio: '2.5 / 3.6',
    border: '1.5px dashed rgba(255,255,255,0.35)',
    borderRadius: 8,
  }

  const g = game
  return (
    <div
      className="w-full select-none rounded-2xl"
      style={{
        minHeight: 'clamp(430px, calc(100dvh - 240px), 720px)',
        padding: '20px 12px 28px',
        background: 'radial-gradient(120% 120% at 50% 0%, #17925c 0%, #0b6e42 55%, #085633 100%)',
        border: '1px solid rgba(20,83,45,0.15)',
      }}
    >
      <div className="mx-auto" style={{ maxWidth: 620 }}>
        {/* HUD */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Score </span>
              <span className="font-display font-extrabold text-lg text-white">{g ? fmt(g.score) : 0}</span>
            </div>
            <div className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>⏱ {seconds}s · {g ? g.moves : 0} moves</div>
          </div>
          <div className="flex items-center gap-2">
            {canAutoFinish && (
              <button type="button" onClick={autoFinish} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: '#fde047', color: '#3F3206' }}>
                ✨ Auto-finish
              </button>
            )}
            <button type="button" onClick={undo} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white" style={{ color: INK }} aria-label="Undo">↩ Undo</button>
            <button type="button" onClick={toggleMute} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white" style={{ color: INK }} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {status !== 'idle' && g && (
          <>
            {/* top row: stock, waste, spacer, foundations */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4">
              <div className="relative" style={{ minHeight: 10 }}>
                <button type="button" onClick={tapStock} className="w-full rounded-lg flex items-center justify-center" style={{
                  ...slotStyle,
                  border: g.stock.length ? '1px solid rgba(20,40,28,0.28)' : slotStyle.border,
                  background: g.stock.length ? 'repeating-linear-gradient(135deg, #15803d, #15803d 6px, #166534 6px, #166534 12px)' : 'transparent',
                }}>
                  {!g.stock.length && <span className="text-white/70 text-lg">↻</span>}
                </button>
              </div>
              <div className="relative">
                {g.waste.length
                  ? <Card card={g.waste[g.waste.length - 1]} onClick={tapWaste} style={{ position: 'relative' }} />
                  : <div style={slotStyle} />}
              </div>
              <div />
              {g.found.map((p, i) => (
                <div key={i} className="relative">
                  {p.length
                    ? <Card card={p[p.length - 1]} onClick={() => {}} style={{ position: 'relative' }} />
                    : <div style={slotStyle} className="flex items-center justify-center"><span className="text-white/50 text-base sm:text-lg">{SUITS[i]}</span></div>}
                </div>
              ))}
            </div>

            {/* tableau */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {g.tab.map((pile, col) => {
                // stack offsets: tighter for face-down cards
                let y = 0
                const tops = pile.map((c) => { const t = y; y += c.faceUp ? 24 : 10; return t })
                const need = pile.length ? tops[pile.length - 1] + 130 : 130
                return (
                  <div key={col} className="relative" style={{ minHeight: Math.max(300, need) }}>
                    {pile.length === 0 && <div style={slotStyle} onClick={() => {}} />}
                    {pile.map((c, idx) => (
                      <Card key={c.id} card={c} onClick={() => tapTab(col, idx)} style={{ top: tops[idx] }} />
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* overlays */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="text-4xl mb-1">🃏</div>
            <div className="font-display font-extrabold text-2xl text-white">Guac Solitaire</div>
            <p className="text-sm mt-2 mb-1 max-w-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Klondike, tap-to-move: tap the stock to deal, tap any face-up card and it flies to the best legal
              spot — foundations first.
            </p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Build the four foundations A → K to win. Undo is free; recycling the stock costs 20.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: '#fde047' }}>Best game: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Deal me in</PrimaryButton>
          </div>
        )}

        {status === 'won' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(8,18,14,0.7)' }}>
            <div className="rounded-2xl bg-white p-6 text-center w-full" style={{ maxWidth: 400, border: '1px solid rgba(20,83,45,0.10)' }}>
              <div className="text-3xl mb-1">🃏🎉</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Deck cleared!</div>
              <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(finalScore)}</div>
              <div className="text-[11px] font-semibold" style={{ color: MUTED }}>in {seconds}s · best {fmt(best)}</div>
              {newBest && <div className="text-xs font-bold mt-1" style={{ color: AMBER }}>New best! 🥑</div>}
              <SaveScoreLine res={saveRes} />
              <div className="mt-4 flex justify-center gap-2">
                <PrimaryButton onClick={start}>Deal again</PrimaryButton>
                <GhostButton onClick={() => setStatus('idle')}>Close</GhostButton>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center mt-6 mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Tap stock to deal · tap a card to auto-move it (runs move together) · foundations pay 10, reveals pay 5 · A→K wins.
        </p>
      </div>
      <style>{`@keyframes ggshake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }`}</style>
    </div>
  )
}
