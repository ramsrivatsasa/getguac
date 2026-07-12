'use client'
// Guacdle — Wordle-style daily word game, GetGuac edition. Every answer is a
// 5-letter money/receipts/savings word, and each reveals a one-line savings
// tip tying it back to the product. Daily word is deterministic from the date;
// board + stats persist in localStorage. A free-play practice mode unlocks
// after (or alongside) the daily.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, GameFrame } from './arcadeKit'

const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ABSENT = '#9CA69E'
const INK = '#15281C'

// Answer pool — every word is 5 letters, money/shopping/receipts themed.
const ANSWERS = [
  { w: 'PRICE', tip: 'GetGuac tracks item prices across receipts so you can see them creep.' },
  { w: 'SAVED', tip: 'Rate a purchase "not worth it" and GetGuac counts what you stop wasting as saved.' },
  { w: 'SPEND', tip: 'The dashboard splits spend by store and category — heat bars show where it burns.' },
  { w: 'STORE', tip: 'Spending by store shows which shops quietly take the biggest bite.' },
  { w: 'MONEY', tip: 'GuacMoney grows with every receipt you scan — 1000 GM tracks $1 of value.' },
  { w: 'TOTAL', tip: 'Receipt totals are extracted automatically — no typing, just snap.' },
  { w: 'TAXES', tip: 'GetGuac tallies the tax on every receipt — most people underestimate it 2×.' },
  { w: 'BILLS', tip: 'The Bills calendar projects recurring subscriptions to their due dates.' },
  { w: 'DEALS', tip: 'Steals hunts live deals on things you actually buy.' },
  { w: 'STEAL', tip: 'A Steal is a price so good it beats your own purchase history.' },
  { w: 'SMASH', tip: 'Smash days are days you logged every receipt. Keep the run alive.' },
  { w: 'CENTS', tip: 'Rounding errors on receipts are real — GetGuac reconciles to the cent.' },
  { w: 'PENNY', tip: 'A penny tracked is a penny you can refuse to spend twice.' },
  { w: 'CHEAP', tip: 'Cheap and worth-it are different — the Worth-It rating knows which is which.' },
  { w: 'SPREE', tip: 'One spree shows up as a spike on your month view. See it before it repeats.' },
  { w: 'DEBIT', tip: 'Bank-statement import matches card debits to paper receipts automatically.' },
  { w: 'FUNDS', tip: 'The emergency-fund calculator tells you how many months you can cover.' },
  { w: 'SPARE', tip: 'Spare change adds up — GetGuac shows your smallest recurring leaks.' },
  { w: 'STASH', tip: 'Your Stash holds every rated purchase — the good, the bad, the never-again.' },
  { w: 'WORTH', tip: 'Worth-It ratings turn regret into a number you can act on.' },
  { w: 'VALUE', tip: 'GuacMoney measures real value created — your own money, tracked.' },
  { w: 'CHECK', tip: 'Check your receipts against statements — duplicates hide in plain sight.' },
  { w: 'GOODS', tip: 'Every line item is categorized, so goods vs. services is one glance.' },
  { w: 'AISLE', tip: 'Impulse buys live at the end of the aisle. Your Smashlist keeps you on-plan.' },
  { w: 'BRAND', tip: 'Brand switching is the quietest saving there is — compare unit prices.' },
  { w: 'LABEL', tip: 'Unit-price labels beat pack-size tricks. GetGuac does the math per ounce.' },
  { w: 'PURSE', tip: 'Whatever you call your wallet, receipts are its flight recorder.' },
  { w: 'YIELD', tip: 'The retirement calculator compounds your monthly saving at your chosen yield.' },
  { w: 'BUYER', tip: 'A good buyer knows the price history. You have it — in your receipts.' },
  { w: 'SALES', tip: '"Sale" only counts if it beats the price you actually paid last time.' },
  { w: 'OFFER', tip: 'Coupons and offers are aggregated per store on the Coupons page.' },
  { w: 'QUOTE', tip: 'Get a second quote — Steals pulls live prices from across the web.' },
  { w: 'SWIPE', tip: 'Every swipe leaves a trail. GetGuac turns the trail into a map.' },
  { w: 'VAULT', tip: 'Receipts are stored private-by-default — your data is not for sale.' },
  { w: 'COINS', tip: 'Small coins, big totals: micro-purchases are a top-3 leak for most users.' },
  { w: 'RATES', tip: 'Loan and savings rates change everything — model them in Calculators.' },
  { w: 'ASSET', tip: 'A tracked refund is an asset. An untracked one is a donation.' },
  { w: 'AUDIT', tip: 'GetGuac audits your month automatically: duplicates, spikes, missed refunds.' },
  { w: 'BONUS', tip: 'Referrals earn GuacMoney — sharing the app is the easiest win.' },
  { w: 'GROSS', tip: 'Gross vs. net: the dashboard shows spending before and after refunds.' },
  { w: 'LOANS', tip: 'The loan calculator shows the true cost of "low monthly payments."' },
  { w: 'LEASE', tip: 'Lease-vs-buy is a math problem, not a vibe. Run the numbers.' },
  { w: 'BUCKS', tip: 'Big bucks hide in small habits — the heat bars point at the habit.' },
  { w: 'DIMES', tip: 'Nickel-and-dimed? Fees and add-ons get their own category.' },
  { w: 'ORDER', tip: 'Online orders email you receipts — forward them, GetGuac files them.' },
  { w: 'ITEMS', tip: 'Line items, not just totals: GetGuac reads every row of the receipt.' },
  { w: 'SPENT', tip: '"Where did it go?" is a solved problem when every receipt is scanned.' },
  { w: 'OWNED', tip: 'You already own it — the Smashlist predictor stops accidental re-buys.' },
  { w: 'TALLY', tip: 'The running tally beats the month-end surprise every time.' },
  { w: 'SAVER', tip: 'Savers are made by systems, not willpower. Receipts are the system.' },
]

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫']
const EPOCH = Date.UTC(2026, 0, 1) // Guacdle #1 = 2026-01-01

function todayNumber() {
  const now = new Date()
  const localMidnightUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((localMidnightUTC - EPOCH) / 86400000) + 1
}
// Step through the pool with a stride coprime to its length → full cycle, no repeats
// until every word has been used.
function answerForDay(n) {
  return ANSWERS[((n * 17) + 7) % ANSWERS.length]
}

// Standard two-pass Wordle scoring: greens first, then yellows limited by
// remaining letter counts.
function scoreGuess(guess, answer) {
  const res = new Array(5).fill('absent')
  const remaining = {}
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct'
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === 'correct') continue
    if (remaining[guess[i]] > 0) { res[i] = 'present'; remaining[guess[i]] -= 1 }
  }
  return res
}

const TILE_BG = { correct: GREEN, present: AMBER, absent: ABSENT }

function loadJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback }
}

export default function Guacdle() {
  const dayNum = useMemo(() => todayNumber(), [])
  const [mode, setMode] = useState('daily') // 'daily' | 'practice'
  const [practiceWord, setPracticeWord] = useState(null)
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState('playing') // playing | won | lost
  const [toast, setToast] = useState('')
  const [stats, setStats] = useState({ played: 0, wins: 0, dist: [0, 0, 0, 0, 0, 0], run: 0, bestRun: 0, lastWinDay: 0 })
  const [shake, setShake] = useState(false)
  const [copied, setCopied] = useState(false)
  const toastTimer = useRef(null)
  const { saveRes, save } = useScoreSaver('guacdle')

  const answerEntry = mode === 'daily' ? answerForDay(dayNum) : practiceWord
  const answer = answerEntry?.w || ''

  // Hydrate today's board + stats once on mount.
  useEffect(() => {
    setStats(loadJSON('guacdle-stats-v1', { played: 0, wins: 0, dist: [0, 0, 0, 0, 0, 0], run: 0, bestRun: 0, lastWinDay: 0 }))
    const saved = loadJSON('guacdle-day-v1', null)
    if (saved && saved.day === dayNum) {
      setGuesses(saved.guesses || [])
      setStatus(saved.status || 'playing')
    }
  }, [dayNum])

  const persistDay = useCallback((g, s) => {
    try { localStorage.setItem('guacdle-day-v1', JSON.stringify({ day: dayNum, guesses: g, status: s })) } catch {}
  }, [dayNum])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }, [])

  const finishGame = useCallback((won, tries) => {
    if (mode !== 'daily') return
    // finished daily board = the day's play; wins score by speed, losses a token 5
    save(won ? (7 - tries) * 10 : 5, tries)
    setStats((prev) => {
      const next = { ...prev, played: prev.played + 1 }
      if (won) {
        next.wins = prev.wins + 1
        next.dist = prev.dist.map((d, i) => (i === tries - 1 ? d + 1 : d))
        next.run = prev.lastWinDay === dayNum - 1 ? prev.run + 1 : 1
        next.bestRun = Math.max(next.run, prev.bestRun)
        next.lastWinDay = dayNum
      } else {
        next.run = 0
      }
      try { localStorage.setItem('guacdle-stats-v1', JSON.stringify(next)) } catch {}
      return next
    })
  }, [mode, dayNum, save])

  const submit = useCallback(() => {
    if (status !== 'playing') return
    if (current.length < 5) {
      setShake(true); setTimeout(() => setShake(false), 400)
      showToast('Need 5 letters')
      return
    }
    const g = [...guesses, current]
    const won = current === answer
    const s = won ? 'won' : g.length >= 6 ? 'lost' : 'playing'
    setGuesses(g); setCurrent(''); setStatus(s)
    if (mode === 'daily') persistDay(g, s)
    if (s !== 'playing') finishGame(won, g.length)
  }, [status, current, guesses, answer, mode, persistDay, finishGame, showToast])

  const onKey = useCallback((k) => {
    if (status !== 'playing') return
    if (k === 'ENTER' || k === '⏎') submit()
    else if (k === 'BACKSPACE' || k === '⌫') setCurrent((c) => c.slice(0, -1))
    else if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < 5 ? c + k : c))
  }, [status, submit])

  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toUpperCase()
      if (k === 'ENTER' || k === 'BACKSPACE' || /^[A-Z]$/.test(k)) { e.preventDefault(); onKey(k) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onKey])

  // Best-known status per keyboard letter (correct > present > absent).
  const keyStatus = useMemo(() => {
    const rank = { absent: 1, present: 2, correct: 3 }
    const map = {}
    for (const g of guesses) {
      const sc = scoreGuess(g, answer)
      for (let i = 0; i < 5; i++) {
        if (!map[g[i]] || rank[sc[i]] > rank[map[g[i]]]) map[g[i]] = sc[i]
      }
    }
    return map
  }, [guesses, answer])

  const startPractice = () => {
    setPracticeWord(ANSWERS[Math.floor(Math.random() * ANSWERS.length)])
    setMode('practice'); setGuesses([]); setCurrent(''); setStatus('playing')
  }
  const backToDaily = () => {
    const saved = loadJSON('guacdle-day-v1', null)
    setMode('daily')
    setGuesses(saved && saved.day === dayNum ? saved.guesses : [])
    setStatus(saved && saved.day === dayNum ? saved.status : 'playing')
    setCurrent('')
  }

  const share = async () => {
    const rows = guesses.map((g) => scoreGuess(g, answer).map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬜')).join('')).join('\n')
    const text = `Guacdle #${dayNum} ${status === 'won' ? guesses.length : 'X'}/6\n\n${rows}\n\ngetguac.app/games/guacdle`
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { showToast('Copy failed') }
  }

  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  const maxDist = Math.max(1, ...stats.dist)

  return (
    <GameFrame inner={512}>
    <div className="mx-auto select-none">
      {/* Mode + day header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold" style={{ color: '#5C6B60' }}>
          {mode === 'daily' ? `Daily #${dayNum}` : 'Practice word'}
        </div>
        <div className="flex gap-2">
          {mode === 'daily'
            ? <button onClick={startPractice} className="text-xs font-bold px-3 py-1.5 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>Practice mode</button>
            : <>
                <button onClick={startPractice} className="text-xs font-bold px-3 py-1.5 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>New word</button>
                <button onClick={backToDaily} className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ background: GREEN }}>Back to daily</button>
              </>}
        </div>
      </div>

      {/* Board */}
      <div className={shake ? 'gg-shake' : ''} style={{ display: 'grid', gridTemplateRows: 'repeat(6, 1fr)', gap: 6, marginBottom: 14 }}>
        {Array.from({ length: 6 }).map((_, r) => {
          const g = guesses[r]
          const isCurrent = r === guesses.length && status === 'playing'
          const letters = g ? g.split('') : isCurrent ? current.padEnd(5).split('') : ['', '', '', '', '']
          const sc = g ? scoreGuess(g, answer) : null
          return (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {letters.map((ch, c) => (
                <div key={c} className="font-display" style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 800, borderRadius: 10, color: sc ? '#fff' : INK,
                  background: sc ? TILE_BG[sc[c]] : '#fff',
                  border: sc ? 'none' : `2px solid ${ch.trim() ? '#8a978d' : 'rgba(20,83,45,0.15)'}`,
                  transition: 'background .3s ease, transform .1s ease',
                  transitionDelay: sc ? `${c * 60}ms` : '0ms',
                }}>{ch.trim()}</div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      {toast && <div className="text-center text-sm font-bold mb-2 py-2 rounded-lg" style={{ background: INK, color: '#fff' }}>{toast}</div>}

      {/* Result card */}
      {status !== 'playing' && (
        <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: status === 'won' ? '#f2fbf3' : '#fef3f2', border: '1px solid rgba(20,83,45,0.10)' }}>
          <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
            {status === 'won' ? `Smashed it in ${guesses.length}! 🥑` : `The word was ${answer}`}
          </div>
          <p className="text-sm mt-1" style={{ color: '#3d4a42' }}>💡 {answerEntry?.tip}</p>
          {mode === 'daily' && <SaveScoreLine res={saveRes} />}
          <div className="flex justify-center gap-2 mt-3">
            {mode === 'daily' && (
              <button onClick={share} className="text-sm font-bold px-4 py-2 rounded-full text-white" style={{ background: GREEN }}>
                {copied ? 'Copied!' : 'Share result'}
              </button>
            )}
            <button onClick={startPractice} className="text-sm font-bold px-4 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
              Play a practice word
            </button>
          </div>
        </div>
      )}

      {/* Keyboard */}
      <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        {KEY_ROWS.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            {row.split('').map((k) => {
              const wide = k === '⏎' || k === '⌫'
              const st = keyStatus[k]
              return (
                <button key={k} onClick={() => onKey(k)} className="font-bold" style={{
                  flex: wide ? 1.6 : 1, maxWidth: wide ? 64 : 40, height: 50, borderRadius: 8,
                  fontSize: wide ? 18 : 14, border: 'none', cursor: 'pointer',
                  background: st ? TILE_BG[st] : '#E7ECE8', color: st ? '#fff' : INK,
                }}>{k}</button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(20,83,45,0.10)' }}>
        <div className="font-display font-extrabold text-sm mb-2" style={{ color: INK }}>Your record</div>
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          {[[stats.played, 'Played'], [`${winPct}%`, 'Win rate'], [stats.run, 'Smash run'], [stats.bestRun, 'Best run']].map(([v, l]) => (
            <div key={l}>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>{v}</div>
              <div className="text-[11px]" style={{ color: '#5C6B60' }}>{l}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {stats.dist.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#3d4a42' }}>
              <span className="w-3 font-bold">{i + 1}</span>
              <div className="h-4 rounded" style={{ width: `${Math.max(6, (d / maxDist) * 100)}%`, background: d ? GREEN : '#E7ECE8', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 5 }}>
                {d > 0 ? d : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-center mt-4 mb-2" style={{ color: '#8a978d' }}>
        Guess the 5-letter money word in 6 tries. Any 5 letters count as a guess.
        🟩 right spot · 🟨 in the word · one new word every day.
      </p>

      <style>{`
        .gg-shake { animation: ggshake .4s ease; }
        @keyframes ggshake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
      `}</style>
    </div>
    </GameFrame>
  )
}
