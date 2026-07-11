'use client'
// Price Check — higher-or-lower price guessing, GetGuac edition. You see what
// one everyday item costs; guess whether the next one costs more or less.
// Sudden death: one wrong call ends the run. Trains exactly the instinct the
// app is about — knowing what things actually cost.
import { useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine } from './arcadeKit'

const GREEN = '#65A30D'
const INK = '#15281C'

// Typical US prices, rounded from 2025-26 averages — close enough for a game.
const ITEMS = [
  ['Dozen large eggs', '🥚', 3.79], ['Gallon of whole milk', '🥛', 4.09],
  ['One avocado', '🥑', 1.49], ['Sourdough loaf', '🍞', 4.99],
  ['Rotisserie chicken', '🍗', 5.99], ['Ground beef (1 lb)', '🥩', 5.49],
  ['Pizza night, delivered', '🍕', 28], ['Movie ticket', '🎬', 13.5],
  ['Large movie popcorn', '🍿', 9.5], ['Cafe latte', '☕', 5.75],
  ['Fast-food burger', '🍔', 5.99], ['Burrito bowl', '🌯', 10.7],
  ['Rideshare to the airport', '🚗', 38], ['Gallon of gas', '⛽', 3.45],
  ['Oil change', '🛢️', 59], ['Monthly bus pass', '🚌', 64],
  ['Wireless earbuds (name brand)', '🎧', 249], ['Latest phone (base model)', '📱', 799],
  ['65" 4K TV', '📺', 448], ['Game console', '🎮', 499],
  ['Yoga mat', '🧘', 25], ['Running shoes', '👟', 120],
  ['Classic jeans', '👖', 69], ['Plain white tee', '👕', 12],
  ['Winter coat', '🧥', 129], ['Haircut', '✂️', 32],
  ['One-hour massage', '💆', 95], ['Gym membership (month)', '🏋️', 39],
  ['Streaming plan (month)', '🎞️', 17.99], ['Music plan (month)', '🎵', 11.99],
  ['Gas grill', '🔥', 199], ['Air fryer', '🍳', 89],
  ['Robot vacuum', '🤖', 279], ['Kitchen blender', '🥤', 49],
  ['Queen mattress', '🛏️', 599], ['Flat-pack bookshelf', '📚', 79],
  ['Office chair', '🪑', 189], ['Standing desk', '🖥️', 299],
  ['Dog food (20 lb)', '🐕', 34], ['Cat litter (20 lb)', '🐈', 18],
  ['Box of diapers', '👶', 42], ['Birthday cake', '🎂', 28],
  ['Bouquet of roses', '🌹', 45], ['Christmas tree', '🎄', 75],
  ['Domestic flight', '✈️', 278], ['Hotel night', '🏨', 162],
  ['Theme-park day ticket', '🎢', 139], ['Concert ticket', '🎤', 128],
  ['Pro football ticket', '🏈', 151], ['College textbook', '📖', 110],
  ['Mid-range laptop', '💻', 749], ['Electric toothbrush', '🪥', 59],
  ['Umbrella', '☂️', 18], ['Sunscreen', '🧴', 11],
  ['Board game', '🎲', 34], ['Big brick-building set', '🧱', 79],
  ['Commuter bicycle', '🚲', 389], ['Kayak', '🛶', 449],
  ['4-person tent', '⛺', 129], ['Wireless mouse', '🖱️', 29],
  ['Mechanical keyboard', '⌨️', 89], ['Sushi dinner for two', '🍣', 78],
  ['Decent bottle of wine', '🍷', 16], ['Craft beer 6-pack', '🍺', 12.5],
  ['Protein powder (2 lb)', '💪', 32], ['Bottle of vitamins', '💊', 14],
].map(([label, emoji, price]) => ({ label, emoji, price }))

const money = (n) => (Number.isInteger(n) ? `$${n.toLocaleString('en-US')}` : `$${n.toFixed(2)}`)
const draw = (excludeIdx) => {
  let i = Math.floor(Math.random() * ITEMS.length)
  while (i === excludeIdx) i = Math.floor(Math.random() * ITEMS.length)
  return i
}

export default function PriceCheck() {
  const [phase, setPhase] = useState('idle') // idle | guessing | reveal | over
  const [known, setKnown] = useState(0)      // index of the item with the shown price
  const [mystery, setMystery] = useState(1)  // index of the item being guessed
  const [run, setRun] = useState(0)
  const [best, setBest] = useState(0)
  const [lastGuess, setLastGuess] = useState(null) // 'higher' | 'lower'
  const [shownPrice, setShownPrice] = useState(0)  // count-up display for the reveal
  const revealTimer = useRef(null)
  const { saveRes, save, resetSave } = useScoreSaver('price')

  useEffect(() => {
    try { setBest(Number(localStorage.getItem('gg-pricecheck-best-v1')) || 0) } catch {}
    return () => clearInterval(revealTimer.current)
  }, [])

  const start = () => {
    const a = draw(-1)
    setKnown(a); setMystery(draw(a)); setRun(0); setLastGuess(null); resetSave(); setPhase('guessing')
  }

  const guess = (dir) => {
    if (phase !== 'guessing') return
    setLastGuess(dir)
    setPhase('reveal')
    // Count the mystery price up from 0 for a little drama, then resolve.
    const target = ITEMS[mystery].price
    const t0 = performance.now()
    clearInterval(revealTimer.current)
    revealTimer.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / 700)
      setShownPrice(target * (1 - Math.pow(1 - p, 3)))
      if (p >= 1) {
        clearInterval(revealTimer.current)
        const a = ITEMS[known].price, b = target
        const correct = b === a || (dir === 'higher' ? b > a : b < a)
        setTimeout(() => {
          if (correct) {
            const r = run + 1
            setRun(r)
            if (r > best) { setBest(r); try { localStorage.setItem('gg-pricecheck-best-v1', String(r)) } catch {} }
            setKnown(mystery); setMystery(draw(mystery)); setPhase('guessing')
          } else {
            save(run, null) // run length is the score
            setPhase('over')
          }
        }, 900)
      }
    }, 16)
  }

  const a = ITEMS[known], b = ITEMS[mystery]

  const card = (item, price, sub) => (
    <div className="rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(20,83,45,0.10)', background: '#fff' }}>
      <div style={{ fontSize: 44 }}>{item.emoji}</div>
      <div className="font-semibold mt-1" style={{ color: INK }}>{item.label}</div>
      <div className="font-display font-extrabold text-3xl mt-1" style={{ color: price == null ? '#8a978d' : GREEN }}>
        {price == null ? '$ ?' : money(price)}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: '#8a978d' }}>{sub}</div>}
    </div>
  )

  return (
    <div className="mx-auto max-w-lg px-4 select-none">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3 text-sm font-semibold" style={{ color: '#5C6B60' }}>
        <span>Run: <span className="font-display font-extrabold" style={{ color: INK }}>{run}</span></span>
        <span>Best: <span className="font-display font-extrabold" style={{ color: INK }}>{best}</span></span>
      </div>

      {phase === 'idle' && (
        <div className="rounded-2xl p-6 text-center" style={{ background: '#f2fbf3', border: '1px solid rgba(20,83,45,0.10)' }}>
          <div style={{ fontSize: 44 }}>🏷️</div>
          <h2 className="font-display font-extrabold text-xl mt-1" style={{ color: INK }}>Price Check</h2>
          <p className="text-sm mt-2 mb-4" style={{ color: '#3d4a42' }}>
            One item&apos;s price is shown. Is the next item&apos;s typical price <b>higher</b> or <b>lower</b>?
            One wrong call ends the run — receipt instincts only.
          </p>
          <button onClick={start} className="font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Start</button>
        </div>
      )}

      {phase !== 'idle' && (
        <div className="space-y-3">
          {card(a, a.price, 'typical price')}
          <div className="text-center text-xs font-bold" style={{ color: '#8a978d' }}>— versus —</div>
          {card(b, phase === 'guessing' ? null : shownPrice, phase === 'guessing' ? 'your call' : lastGuess ? `you said ${lastGuess}` : '')}

          {phase === 'guessing' && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => guess('higher')} className="font-bold py-3 rounded-full text-white" style={{ background: GREEN }}>Higher ▲</button>
              <button onClick={() => guess('lower')} className="font-bold py-3 rounded-full" style={{ background: '#E7ECE8', color: INK }}>Lower ▼</button>
            </div>
          )}

          {phase === 'over' && (
            <div className="rounded-2xl p-5 text-center" style={{ background: '#fef3f2', border: '1px solid rgba(20,83,45,0.10)' }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
                {run >= 10 ? 'Legendary receipt instincts! 🥑' : run >= 5 ? 'Solid run! 🥑' : 'The register got you.'}
              </div>
              <p className="text-sm mt-1" style={{ color: '#3d4a42' }}>
                {ITEMS[mystery].label} runs about <b>{money(ITEMS[mystery].price)}</b> — you called {lastGuess}.
                Run of <b>{run}</b>{run === best && run > 0 ? ' — a new best!' : ''}.
              </p>
              <SaveScoreLine res={saveRes} />
              <button onClick={start} className="mt-3 font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Play again</button>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-center mt-5 mb-2" style={{ color: '#8a978d' }}>
        Prices are typical US averages, not live quotes. Ties count in your favor.
        GetGuac users get the real thing — price history from their own receipts.
      </p>
    </div>
  )
}
