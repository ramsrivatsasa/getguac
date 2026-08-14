'use client'
// Splurge Slicer — Fruit-Ninja for your own spending, now a guided FINANCIAL
// JOURNEY. Your REAL purchases get tossed up in arcs; swipe to slice the
// splurges (things you rated not-worth-it or discretionary wants) and the
// dollars you free up bank toward the round's money goal. Don't cut the
// essentials — rent, groceries, meds cost you an avocado.
//
// The seven rounds are the shared, educative money curriculum (lib/financialJourney):
// cut expenses → savings → car → house → invest → education → freedom.
// Each round opens with a lesson + a goal ($ target to bank), splits into stages
// that tighten as you go, and the whole thing rides on the auto-learning
// difficulty engine (lib/adaptiveDifficulty) — the game watches how you actually
// play and tunes the next round to you. SCORE IS GAME-ONLY — slicing never
// changes the real rating or GuacScore. First finished round/day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useScoreSaver, SaveScoreLine, ArcadeHud,
  spawnBurst, updateBurst, drawBurst, confettiBurst, updateConfetti, drawConfetti,
} from './arcadeKit'
import { usePlayerSpending } from '../../lib/playerSpending'
import { JOURNEY, journeyTargets, roundValueMul, stageFor, withBudgetBump } from '../../lib/financialJourney'
import {
  useJourney, useAdaptive,
  JourneyBar,
} from './journeyKit'
import SplurgePhaserArena from './SplurgePhaserArena'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const BODY_FONT = "'Outfit', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Nunito', 'Bricolage Grotesque', ui-sans-serif, sans-serif"

// Each financial goal is a real level with its own arena. The palettes stay
// dark enough for a bright blade trail while the landmarks quietly reinforce
// what the player is working toward.
const ROUND_SCENES = {
  cut:     { top: '#2a140b', mid: '#743018', bottom: '#170b08', accent: '#fb923c', glow: '#fbbf24', label: 'Clear the clutter' },
  save:    { top: '#062d3b', mid: '#08705f', bottom: '#061b24', accent: '#5eead4', glow: '#86efac', label: 'Build the safety net' },
  car:     { top: '#20134f', mid: '#6d28a5', bottom: '#120d2d', accent: '#fbbf24', glow: '#f0abfc', label: 'Road to the keys' },
  house:   { top: '#102f20', mid: '#397326', bottom: '#081b11', accent: '#bef264', glow: '#fde68a', label: 'Raise the roof' },
  invest:  { top: '#042f2e', mid: '#0f766e', bottom: '#041d1c', accent: '#5eead4', glow: '#a7f3d0', label: 'Let time compound' },
  edu:     { top: '#18163d', mid: '#3730a3', bottom: '#0d1027', accent: '#a5b4fc', glow: '#facc15', label: 'Fund the future' },
  freedom: { top: '#4b1d34', mid: '#b45309', bottom: '#073d35', accent: '#fde68a', glow: '#bef264', label: 'Buy back your time' },
}

function roundScene(id) {
  return ROUND_SCENES[id] || ROUND_SCENES.cut
}

function drawRoundBackground(ctx, w, h, cfg, now, stage) {
  const scene = roundScene(cfg.id)
  const t = now / 1000
  ctx.save()

  const base = ctx.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, scene.top)
  base.addColorStop(0.58, scene.mid)
  base.addColorStop(1, scene.bottom)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // Slow moving light gives the arena life without distracting from targets.
  const glowX = w * (0.5 + Math.sin(t * 0.22 + cfg.n) * 0.22)
  const glowY = h * (0.25 + Math.cos(t * 0.17 + cfg.n) * 0.08)
  const aura = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(w, h) * 0.55)
  aura.addColorStop(0, `${scene.accent}42`)
  aura.addColorStop(0.46, `${scene.glow}16`)
  aura.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = aura
  ctx.fillRect(0, 0, w, h)

  // Ninja-dojo beams and speed lines become a little more energetic by stage.
  ctx.globalAlpha = 0.06 + stage * 0.012
  ctx.strokeStyle = scene.glow
  ctx.lineWidth = 1
  for (let i = -3; i < 12; i++) {
    const x = ((i * 113 + t * (10 + stage * 2)) % (w + 220)) - 110
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + h * 0.5, h)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // A unique, abstract landmark for every money goal.
  ctx.save()
  ctx.globalAlpha = 0.2
  ctx.fillStyle = scene.accent
  ctx.strokeStyle = scene.glow
  ctx.lineWidth = Math.max(2, w * 0.004)
  if (cfg.id === 'cut') {
    for (let i = 0; i < 4; i++) {
      const rw = w * (0.11 + i * 0.018), rh = h * 0.29
      ctx.fillRect(w * (0.08 + i * 0.22), h * 0.66, rw, rh)
      ctx.clearRect(w * (0.095 + i * 0.22), h * 0.7, rw * 0.7, 3)
      ctx.clearRect(w * (0.095 + i * 0.22), h * 0.75, rw * 0.55, 3)
    }
  } else if (cfg.id === 'save') {
    for (let i = 0; i < 7; i++) {
      const r = 8 + (i % 3) * 7
      const x = w * (0.1 + i * 0.14)
      const y = h - ((t * (18 + i * 2) + i * 91) % (h * 0.7))
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.84, w * 0.22, h * 0.1, 0, 0, Math.PI * 2); ctx.fill()
  } else if (cfg.id === 'car') {
    ctx.beginPath(); ctx.moveTo(w * 0.42, h); ctx.lineTo(w * 0.49, h * 0.48); ctx.lineTo(w * 0.56, h); ctx.closePath(); ctx.fill()
    ctx.setLineDash([22, 18]); ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.5, h * 0.48); ctx.stroke(); ctx.setLineDash([])
  } else if (cfg.id === 'house') {
    for (let i = 0; i < 5; i++) {
      const x = w * (0.04 + i * 0.2), y = h * (0.69 + (i % 2) * 0.06)
      ctx.fillRect(x, y, w * 0.16, h - y)
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + w * 0.08, y - h * 0.12); ctx.lineTo(x + w * 0.17, y); ctx.closePath(); ctx.fill()
    }
  } else if (cfg.id === 'invest') {
    ctx.globalAlpha = 0.14
    for (let x = 0; x < w; x += 54) { ctx.beginPath(); ctx.moveTo(x, h * 0.38); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = h * 0.42; y < h; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    ctx.globalAlpha = 0.34; ctx.lineWidth = 5
    ctx.beginPath(); ctx.moveTo(w * 0.05, h * 0.82); ctx.lineTo(w * 0.24, h * 0.7); ctx.lineTo(w * 0.42, h * 0.75); ctx.lineTo(w * 0.61, h * 0.53); ctx.lineTo(w * 0.84, h * 0.35); ctx.stroke()
  } else if (cfg.id === 'edu') {
    ctx.globalAlpha = 0.14
    for (let y = h * 0.46; y < h; y += 38) { ctx.beginPath(); ctx.moveTo(w * 0.08, y); ctx.lineTo(w * 0.92, y); ctx.stroke() }
    ctx.globalAlpha = 0.28
    ctx.beginPath(); ctx.moveTo(w * 0.22, h * 0.76); ctx.lineTo(w * 0.5, h * 0.56); ctx.lineTo(w * 0.78, h * 0.76); ctx.lineTo(w * 0.5, h * 0.9); ctx.closePath(); ctx.fill()
  } else {
    const sun = ctx.createRadialGradient(w * 0.5, h * 0.58, 3, w * 0.5, h * 0.58, h * 0.18)
    sun.addColorStop(0, scene.glow); sun.addColorStop(1, 'rgba(253,230,138,0)')
    ctx.fillStyle = sun; ctx.fillRect(0, h * 0.34, w, h * 0.48)
    ctx.fillStyle = scene.accent
    ctx.fillRect(0, h * 0.78, w, h * 0.22)
  }
  ctx.restore()

  // Floating motes make swipe motion easier to read.
  for (let i = 0; i < 20; i++) {
    const x = (i * 97 + Math.sin(t * 0.5 + i) * 34 + w) % w
    const y = h - ((t * (7 + i % 4) + i * 71) % h)
    const r = 1 + (i % 3) * 0.65
    ctx.globalAlpha = 0.12 + (i % 4) * 0.035
    ctx.fillStyle = i % 2 ? scene.accent : '#ffffff'
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1

  const vignette = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.16, w / 2, h * 0.48, Math.max(w, h) * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

const GRAVITY = 680          // gentler arc — items hang longer, easier to read + slice
const MIN_CUT_SPEED = 0.45
const TRAIL_MS = 120
const COMBO_MS = 350
const BEST_KEY = 'gg-splurge-best-v1'

// Original, synthesized arcade audio. Keeping this in Web Audio avoids copied
// game assets and makes every swipe react instantly without downloading files.
function createSlicerAudio() {
  let ac = null
  const ctx = () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)()
    if (ac.state === 'suspended') ac.resume()
    return ac
  }
  const tone = (freq, endFreq, duration, type = 'sine', gain = 0.08, delay = 0) => {
    const c = ctx(), t = c.currentTime + delay
    const o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + duration)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + duration + 0.03)
  }
  const noise = (duration = 0.09, gain = 0.08, highpass = 900) => {
    const c = ctx(), n = Math.max(1, Math.floor(c.sampleRate * duration)), b = c.createBuffer(1, n, c.sampleRate)
    const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = b; f.type = 'highpass'; f.frequency.value = highpass
    g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration)
    s.connect(f).connect(g).connect(c.destination); s.start()
  }
  return {
    unlock: () => ctx(),
    swipe: () => { noise(0.075, 0.035, 1300); tone(760, 210, 0.09, 'triangle', 0.025) },
    good: (combo = 1) => { noise(0.12, 0.07, 650); tone(180 + combo * 18, 520 + combo * 28, 0.16, 'triangle', 0.08); tone(620, 980, 0.1, 'sine', 0.035, 0.045) },
    bad: () => { noise(0.2, 0.1, 140); tone(150, 48, 0.3, 'sawtooth', 0.09) },
    stage: () => { [0, 0.07, 0.14].forEach((d, i) => tone(330 * (1 + i * 0.25), 520 * (1 + i * 0.25), 0.16, 'triangle', 0.05, d)) },
    clear: () => { [0, 0.08, 0.16, 0.25].forEach((d, i) => tone([392, 523, 659, 784][i], [520, 680, 840, 980][i], 0.24, 'sine', 0.065, d)) },
  }
}

// Per-round slicer difficulty. Spread the shared JOURNEY round + how THIS game
// interprets it: spawns get faster, more essentials sneak in (more risk), each
// round's dollars carry more weight (valueMul, so a $25k finale doesn't take
// twenty minutes), and every round splits into `stages` that step the pace up
// mid-round. `par` is how long we expect the round to take — the auto-learning
// engine compares your real time against it.
const SLICER_ROUNDS = JOURNEY.map((r, i) => ({
  ...r,
  spawnMul: [1, 1.3, 1.46, 1.62, 1.8, 2, 2.2][i],
  splurgeProb: [0.76, 0.72, 0.7, 0.67, 0.65, 0.62, 0.6][i], // rest are essentials to dodge
  valueMul: roundValueMul(i),
  par: [40, 50, 55, 60, 65, 70, 75][i],
}))

const freshSim = () => ({
  items: [], slices: [], bursts: [], floats: [], confetti: [], trail: [], rings: [], cutIdx: 0,
  strokeCuts: [], comboBest: 0, down: false,
  roundBanked: 0, runBanked: 0, missed: 0, lives: 3, elapsed: 0, stage: 1,
  spawnIn: 650, slowUntil: 0, vignette: 0, shake: 0, lastT: null,
  roundT0: 0, roundLivesLost: 0, goodCuts: 0, badCuts: 0,
})

function segHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy || 1
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const px = x1 + t * dx - cx, py = y1 + t * dy - cy
  return px * px + py * py <= r * r
}

export default function SplurgeSlicer() {
  const canvasRef = useRef(null)
  const audioRef = useRef(null)
  const phaserBankRef = useRef(0)
  const soundRef = useRef(true)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 640, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const dataRef = useRef(null)
  const comboTimer = useRef(null)
  const clearTimer = useRef(null)
  const targetsRef = useRef(journeyTargets(null))
  const roundRef = useRef({ cfg: SLICER_ROUNDS[0], target: targetsRef.current[0], idx: 0 })
  const isLastRef = useRef(false)

  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ runBanked: 0, missed: 0, lives: 3 })
  const [roundHud, setRoundHud] = useState({ banked: 0, target: withBudgetBump(targetsRef.current[0]), stage: 1 })
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const { saveRes, save, resetSave } = useScoreSaver('splurge')
  const { data, loading } = usePlayerSpending()
  const journey = useJourney('splurge', { count: SLICER_ROUNDS.length })
  const { roundIdx, round, furthest, isLast, startFrom, advance } = journey
  // Auto-learning difficulty: reads how the player actually performs and hands
  // back multipliers for spawn pressure and the round goal.
  const { diff, diffRef, record } = useAdaptive('splurge')
  const cfg = SLICER_ROUNDS[roundIdx]
  const scene = roundScene(cfg.id)
  // The goal the player actually plays against = the curriculum target nudged
  // by how well they've been doing (±15%).
  const target = withBudgetBump(Math.max(10, Math.round((targetsRef.current[roundIdx] * diff.targetMul) / 10) * 10))
  const nextRound = SLICER_ROUNDS[roundIdx + 1] || null

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => () => { clearTimeout(comboTimer.current); clearTimeout(clearTimer.current) }, [])

  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  // Round targets scale gently with the signed-in player's monthly spend.
  useEffect(() => {
    targetsRef.current = journeyTargets(data)
  }, [data])

  // Keep the loop's view of the current round + adapted target fresh.
  useEffect(() => {
    roundRef.current = { cfg: SLICER_ROUNDS[roundIdx], target, idx: roundIdx }
    isLastRef.current = isLast
    setRoundHud((h) => ({ ...h, target }))
  }, [roundIdx, isLast, target])

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10)
      if (v > 0) { bestRef.current = v; setBest(v) }
    } catch {}
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const parent = canvas.parentElement
      if (!parent || !canvas.isConnected) return
      const box = parent.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: box.width, h: box.height }
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const pause = () => { if (statusRef.current === 'playing') setStatus('paused') }
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', vis) }
  }, [setStatus])

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({ runBanked: st.runBanked, missed: st.missed, lives: st.lives })
      setRoundHud({ banked: st.roundBanked, target: roundRef.current.target, stage: st.stage })
    }

    // Hand the round's result to the auto-learning engine. `accuracy` here is
    // how clean the swiping was: splurges cut vs essentials wrongly cut.
    const learn = (cleared) => {
      const st = sim.current
      const cuts = st.goodCuts + st.badCuts
      record({
        cleared,
        seconds: st.roundT0 ? (performance.now() - st.roundT0) / 1000 : 0,
        par: roundRef.current.cfg.par || 60,
        livesLost: st.roundLivesLost,
        accuracy: cuts > 0 ? st.goodCuts / cuts : null,
      })
    }

    const endRun = (win) => {
      const st = sim.current
      if (!win) learn(false)
      // Stop the playfield cleanly before showing the result card. Without
      // this reset, the last impact's shake value is frozen because simulation
      // updates pause on game over, leaving the entire arena vibrating.
      st.down = false
      st.shake = 0
      st.vignette = 0
      st.slowUntil = 0
      st.items = []
      st.slices = []
      st.trail = []
      st.rings = []
      st.bursts = []
      save(st.runBanked, roundRef.current.idx + 1)
      if (st.runBanked > bestRef.current) {
        bestRef.current = st.runBanked
        setBest(st.runBanked)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.runBanked)) } catch {}
      }
      setCombo(0)
      setStatus(win ? 'journeydone' : 'over')
    }

    const clearRound = () => {
      const st = sim.current
      const { w } = sizeRef.current
      learn(true)
      confettiBurst(st.confetti, w)
      if (soundRef.current) audioRef.current?.clear()
      st.down = false
      setCombo(0)
      setStatus('clearing')
      clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => {
        if (isLastRef.current) endRun(true)
        else setStatus('roundclear')
      }, 850)
    }

    const pickPurchase = () => {
      const pool = dataRef.current?.purchases || []
      if (pool.length === 0) return { name: 'Impulse buy', price: 20, emoji: '🛍️', splurge: true }
      const splurges = pool.filter((p) => p.splurge)
      const essentials = pool.filter((p) => !p.splurge)
      const wantSplurge = Math.random() < roundRef.current.cfg.splurgeProb || essentials.length === 0
      const list = wantSplurge && splurges.length ? splurges : (essentials.length ? essentials : pool)
      return list[Math.floor(Math.random() * list.length)]
    }

    const spawnItem = (st) => {
      const { w, h } = sizeRef.current
      const p = pickPurchase()
      const r = w < 520 ? 32 : 38
      const x = r + Math.random() * (w - 2 * r)
      const grow = Math.min(0.14, st.elapsed * 0.0016)
      const frac = 0.52 + Math.random() * 0.26 + grow
      st.items.push({
        splurge: !!p.splurge, e: p.emoji || '🛍️', label: p.name, amt: Math.max(1, Math.round(p.price)),
        x, y: h + r, r,
        vx: (w / 2 - x) * (0.35 + Math.random() * 0.4) + (Math.random() - 0.5) * 60,
        vy: -Math.sqrt(2 * GRAVITY * Math.min(h - 40, h * frac)),
        rot: 0, spin: (Math.random() - 0.5) * 1.6,
      })
    }

    const splitTarget = (st, it, now) => {
      for (const side of [-1, 1]) {
        st.slices.push({
          side, e: it.e, splurge: it.splurge, amt: it.amt, r: it.r,
          x: it.x, y: it.y, vx: it.vx + side * 135, vy: it.vy - 65,
          rot: it.rot, spin: side * (3.4 + Math.random() * 1.8), t0: now,
        })
      }
    }

    const onSlice = (it) => {
      const st = sim.current
      const now = performance.now()
      const { w, h } = sizeRef.current
      const rc = roundRef.current
      splitTarget(st, it, now)
      st.rings.push({ x: it.x, y: it.y, t0: now, color: it.splurge ? '#bef264' : '#fb7185' })
      if (it.splurge) {
        // Later rounds move bigger money per slice — that's what keeps the
        // $25,000 finale from turning into a grind.
        const amt = Math.max(1, Math.round(it.amt * (rc.cfg.valueMul || 1)))
        st.goodCuts += 1
        st.roundBanked += amt
        st.runBanked += amt
        st.shake = Math.max(st.shake, 4)
        spawnBurst(st.bursts, it.x, it.y, { count: 20, color: rc.cfg.color || '#4ade80', speed: 245, life: 0.65, size: 4, gravity: 300 })
        spawnBurst(st.bursts, it.x, it.y, { count: 12, color: '#ffffff', speed: 170, life: 0.38, size: 2.2, gravity: 90 })
        st.floats.push({ x: it.x, y: it.y - it.r, text: `+$${amt.toLocaleString()}`, t0: now, life: 850, size: 18, color: '#ecfccb' })
        st.strokeCuts.push(now)
        const n = st.strokeCuts.filter((t) => now - t <= COMBO_MS).length
        if (soundRef.current) audioRef.current?.good(n)
        if (n >= 3) {
          setCombo(n)
          clearTimeout(comboTimer.current)
          comboTimer.current = setTimeout(() => setCombo(0), 1000)
          // Combos are flair only — they pay nothing. Money is banked for the
          // cut itself and nothing else, so the goal bar moves only when an
          // expense actually goes.
          if (n > st.comboBest) {
            st.floats.push({ x: w / 2, y: h * 0.28, text: `COMBO ×${n} — GUAC FRENZY!`, t0: now, life: 1300, size: 22, color: INK, banner: true })
            st.comboBest = n
          }
        }
        // Stage ramp inside the round — each round splits into stages that
        // step the pace up as the goal bar fills.
        const stages = rc.cfg.stages || 1
        if (stages > 1) {
          const want = stageFor(rc.idx, st.roundBanked, rc.target)
          if (want > st.stage) {
            st.stage = want
            if (soundRef.current) audioRef.current?.stage()
            st.floats.push({ x: w / 2, y: h * 0.4, text: `⚡ Stage ${want} — heating up!`, t0: now, life: 1100, size: 20, color: '#b45309', banner: true })
          }
        }
        syncHud()
        if (st.roundBanked >= rc.target) { clearRound(); return }
      } else {
        if (soundRef.current) audioRef.current?.bad()
        st.lives -= 1
        st.roundLivesLost += 1
        st.badCuts += 1
        st.vignette = 1
        st.shake = Math.max(st.shake, 12)
        st.slowUntil = now + 300
        spawnBurst(st.bursts, it.x, it.y, { count: 10, color: '#fb7185', speed: 170, life: 0.5, size: 3.4, gravity: 320 })
        st.floats.push({ x: it.x, y: it.y - it.r, text: 'Need it! −1', t0: now, life: 900, size: 16, color: '#be123c' })
        if (st.lives <= 0) { syncHud(); endRun(false); return }
        syncHud()
      }
    }

    const update = (st, realMs, now) => {
      const ts = now < st.slowUntil ? 0.3 : 1
      const dt = (realMs * ts) / 1000
      const { w, h } = sizeRef.current
      // Spawn pressure = the round's own ramp × the stage inside it × what the
      // auto-learning engine thinks this player can handle. Clamped so the
      // late rounds stay hard rather than unplayable.
      const mul = Math.max(0.6, Math.min(2.6,
        roundRef.current.cfg.spawnMul * (1 + (st.stage - 1) * 0.1) * diffRef.current.mul))
      st.elapsed += dt
      st.spawnIn -= realMs * ts * mul
      if (st.spawnIn <= 0) {
        const n = Math.min(4, 1 + Math.floor(Math.random() * Math.min(4, 1.4 + st.elapsed / 18)))
        for (let i = 0; i < n; i++) spawnItem(st)
        st.spawnIn = Math.max(600, 1500 - st.elapsed * 9) * (0.8 + Math.random() * 0.4) / mul
      }
      for (let i = st.items.length - 1; i >= 0; i--) {
        const it = st.items[i]
        it.vy += GRAVITY * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.spin * dt
        if (it.vy > 0 && it.y > h + it.r + 40) {
          st.items.splice(i, 1)
          if (it.splurge) { st.missed += it.amt; syncHud() }
        }
      }
      for (let i = st.slices.length - 1; i >= 0; i--) {
        const piece = st.slices[i]
        piece.vy += GRAVITY * 0.7 * dt
        piece.x += piece.vx * dt
        piece.y += piece.vy * dt
        piece.rot += piece.spin * dt
        if (now - piece.t0 > 900 || piece.y > h + piece.r * 2) st.slices.splice(i, 1)
      }
      updateBurst(st.bursts, dt)
      st.floats = st.floats.filter((f) => now - f.t0 < f.life)
      st.rings = st.rings.filter((r) => now - r.t0 < 420)
      if (st.vignette > 0) st.vignette = Math.max(0, st.vignette - realMs / 400)
      if (st.shake > 0) st.shake = Math.max(0, st.shake - realMs * 0.035)

      const tr = st.trail
      while (st.down && st.cutIdx < tr.length - 1) {
        const a = tr[st.cutIdx], b = tr[st.cutIdx + 1]
        st.cutIdx++
        const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t)
        if (speed < MIN_CUT_SPEED) continue
        for (let i = st.items.length - 1; i >= 0; i--) {
          const it = st.items[i]
          if (segHitsCircle(a.x, a.y, b.x, b.y, it.x, it.y, it.r)) {
            st.items.splice(i, 1)
            onSlice(it)
            if (statusRef.current !== 'playing') return
          }
        }
      }
      while (tr.length && now - tr[0].t > TRAIL_MS) { tr.shift(); st.cutIdx = Math.max(0, st.cutIdx - 1) }
    }

    const drawChip = (it, now) => {
      const bob = Math.sin(now * 0.006 + it.x * 0.02) * 2.4
      ctx.save()
      ctx.translate(it.x, it.y + bob)
      ctx.rotate(it.rot * 0.5)
      ctx.shadowColor = it.splurge ? 'rgba(251,113,133,0.5)' : 'rgba(74,222,128,0.46)'
      ctx.shadowBlur = 22
      ctx.shadowOffsetY = 7
      const face = ctx.createRadialGradient(-it.r * 0.28, -it.r * 0.35, 2, 0, 0, it.r)
      face.addColorStop(0, 'rgba(255,255,255,0.98)')
      face.addColorStop(0.64, it.splurge ? '#fff1f2' : '#ecfdf5')
      face.addColorStop(1, it.splurge ? '#fecdd3' : '#bbf7d0')
      ctx.fillStyle = face
      ctx.beginPath(); ctx.arc(0, 0, it.r, 0, Math.PI * 2); ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.strokeStyle = it.splurge ? '#fb7185' : '#4ade80'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.globalAlpha = 0.72
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(-it.r * 0.16, -it.r * 0.12, it.r * 0.7, Math.PI * 1.03, Math.PI * 1.72); ctx.stroke()
      ctx.globalAlpha = 1
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `${Math.round(it.r * 1.1)}px ${BODY_FONT}`
      ctx.fillText(it.e, 0, -it.r * 0.18)
      const badge = it.splurge ? `$${it.amt}` : 'ESSENTIAL'
      ctx.font = `800 ${it.splurge ? 14 : 11}px ${DISPLAY_FONT}`
      const bw = ctx.measureText(badge).width + 16, bh = 22
      const byy = it.r * 0.38
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(-bw / 2, byy, bw, bh, 11)
      else ctx.rect(-bw / 2, byy, bw, bh)
      ctx.fillStyle = it.splurge ? '#ef4444' : '#22c55e'; ctx.fill()
      ctx.fillStyle = it.splurge ? '#ffffff' : '#052e16'
      ctx.fillText(badge, 0, byy + bh / 2 + 0.5)
      ctx.restore()
    }

    const drawSliceHalf = (piece, now) => {
      const age = now - piece.t0
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - age / 900)
      ctx.translate(piece.x, piece.y)
      ctx.rotate(piece.rot)
      ctx.beginPath()
      if (piece.side < 0) ctx.arc(0, 0, piece.r, Math.PI / 2, Math.PI * 1.5)
      else ctx.arc(0, 0, piece.r, -Math.PI / 2, Math.PI / 2)
      ctx.closePath()
      ctx.clip()
      ctx.fillStyle = piece.splurge ? '#fff1f2' : '#ecfdf5'
      ctx.beginPath(); ctx.arc(0, 0, piece.r, 0, Math.PI * 2); ctx.fill()
      ctx.font = `${Math.round(piece.r * 1.1)}px ${BODY_FONT}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(piece.e, 0, -piece.r * 0.1)
      ctx.strokeStyle = piece.splurge ? '#fb7185' : '#4ade80'
      ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(0, 0, piece.r - 2, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    }

    const render = (st, now) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)
      drawRoundBackground(ctx, w, h, roundRef.current.cfg, now, st.stage)
      ctx.save()
      if (st.shake > 0) {
        ctx.translate(Math.sin(now * 0.11) * st.shake, Math.cos(now * 0.13) * st.shake * 0.65)
      }
      drawBurst(ctx, st.bursts)
      for (const ring of st.rings) {
        const p = Math.min(1, (now - ring.t0) / 420)
        ctx.globalAlpha = (1 - p) * 0.9
        ctx.strokeStyle = ring.color; ctx.lineWidth = 7 * (1 - p) + 1
        ctx.shadowColor = ring.color; ctx.shadowBlur = 18 * (1 - p)
        ctx.beginPath(); ctx.arc(ring.x, ring.y, 16 + p * 72, 0, Math.PI * 2); ctx.stroke()
        ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'
      }
      for (const piece of st.slices) drawSliceHalf(piece, now)
      for (const it of st.items) drawChip(it, now)
      const tr = st.trail
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (let i = 1; i < tr.length; i++) {
        const k = Math.max(0, 1 - (now - tr[i].t) / TRAIL_MS) * (i / tr.length)
        if (k <= 0) continue
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y)
        ctx.shadowColor = roundScene(roundRef.current.cfg.id).accent
        ctx.shadowBlur = 18 * k
        ctx.strokeStyle = `rgba(190,242,100,${0.5 * k})`; ctx.lineWidth = 5 + 16 * k; ctx.stroke()
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8 * k
        ctx.strokeStyle = `rgba(255,255,255,${0.98 * k})`; ctx.lineWidth = 1.5 + 6 * k; ctx.stroke()
        ctx.shadowColor = 'transparent'
      }
      for (const f of st.floats) {
        const age = now - f.t0
        ctx.globalAlpha = Math.max(0, 1 - age / f.life)
        ctx.font = `800 ${f.size}px ${DISPLAY_FONT}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        if (f.banner) {
          const tw = ctx.measureText(f.text).width
          ctx.fillStyle = 'rgba(255,255,255,0.94)'
          ctx.beginPath()
          if (ctx.roundRect) ctx.roundRect(f.x - tw / 2 - 14, f.y - age * 0.02 - 18, tw + 28, 36, 18)
          else ctx.rect(f.x - tw / 2 - 14, f.y - age * 0.02 - 18, tw + 28, 36)
          ctx.fill()
        }
        ctx.fillStyle = f.color
        ctx.fillText(f.text, f.x, f.y - age * (f.banner ? 0.02 : 0.05))
        ctx.globalAlpha = 1
      }
      drawConfetti(ctx, st.confetti)
      if (st.vignette > 0) {
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72)
        g.addColorStop(0, 'rgba(225,29,72,0)')
        g.addColorStop(1, `rgba(225,29,72,${0.4 * st.vignette})`)
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
      }
      ctx.restore()
    }

    const loop = (t) => {
      const st = sim.current
      const realMs = Math.min(50, st.lastT == null ? 16 : t - st.lastT)
      st.lastT = t
      const now = performance.now()
      if (statusRef.current === 'playing') update(st, realMs, now)
      updateConfetti(st.confetti, realMs / 1000, sizeRef.current.h)
      render(st, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [setStatus, save, record, diffRef])

  const addSample = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const tr = sim.current.trail
    tr.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() })
    if (tr.length > 10) { tr.shift(); sim.current.cutIdx = Math.max(0, sim.current.cutIdx - 1) }
  }
  const onDown = (e) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    const st = sim.current
    st.down = true
    st.trail = []; st.cutIdx = 0
    st.strokeCuts = []; st.comboBest = 0
    if (soundRef.current) audioRef.current?.swipe()
    addSample(e)
  }
  const onMove = (e) => { if (sim.current.down && statusRef.current === 'playing') addSample(e) }
  const onUp = () => { sim.current.down = false }

  // Start a brand-new run beginning at round `idx` (0 = from the top).
  const startRun = (idx = 0) => {
    Object.assign(sim.current, freshSim())
    setHud({ runBanked: 0, missed: 0, lives: 3 })
    setRoundHud({ banked: 0, target: withBudgetBump(targetsRef.current[idx]), stage: 1 })
    setCombo(0)
    setNewBest(false)
    resetSave()
    startFrom(idx)
    setStatus('intro')
  }
  // Player tapped Start on a round's intro card — drop the ball and play.
  const beginRound = () => {
    if (!audioRef.current) audioRef.current = createSlicerAudio()
    if (soundRef.current) audioRef.current.unlock()
    const st = sim.current
    st.items = []; st.slices = []; st.floats = []; st.bursts = []; st.confetti = []; st.rings = []
    st.roundBanked = 0; st.stage = 1; st.spawnIn = 650; st.lastT = null; st.down = false
    st.shake = 0; st.vignette = 0
    st.roundT0 = performance.now(); st.roundLivesLost = 0; st.goodCuts = 0; st.badCuts = 0
    phaserBankRef.current = 0
    roundRef.current = { cfg: SLICER_ROUNDS[roundIdx], target, idx: roundIdx }
    setRoundHud({ banked: 0, target, stage: 1 })
    setStatus('playing')
  }
  const onRoundNext = () => {
    if (isLast) { setStatus('journeydone'); return } // safety; last round routes via endRun
    advance()
    setStatus('intro')
  }
  const resume = () => { sim.current.lastT = null; sim.current.down = false; setStatus('playing') }
  const onPhaserEvent = (event) => {
    const st = sim.current
    if (event.type === 'impact') {
      if (soundRef.current) event.good ? audioRef.current?.good(event.combo) : audioRef.current?.bad()
      if (event.combo >= 3) { setCombo(event.combo); clearTimeout(comboTimer.current); comboTimer.current = setTimeout(() => setCombo(0), 900) }
    } else if (event.type === 'hud') {
      const delta = Math.max(0, event.banked - phaserBankRef.current)
      phaserBankRef.current = event.banked
      st.roundBanked = event.banked; st.runBanked += delta; st.missed = event.missed; st.lives = event.lives
      setHud({ runBanked: st.runBanked, missed: st.missed, lives: st.lives })
      setRoundHud((v) => ({ ...v, banked: event.banked }))
    } else if (event.type === 'clear') {
      setStatus('clearing'); clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setStatus(isLastRef.current ? 'journeydone' : 'roundclear'), 700)
    } else if (event.type === 'over') {
      save(st.runBanked, roundIdx + 1)
      if (st.runBanked > bestRef.current) { bestRef.current = st.runBanked; setBest(st.runBanked); setNewBest(true); try { localStorage.setItem(BEST_KEY, String(st.runBanked)) } catch {} }
      setStatus('over')
    }
  }
  const toggleSound = () => {
    const next = !soundRef.current
    soundRef.current = next
    setSoundOn(next)
    if (next) {
      if (!audioRef.current) audioRef.current = createSlicerAudio()
      audioRef.current.unlock()
      audioRef.current.stage()
    }
  }

  const real = data?.hasData
  const canContinue = furthest > 0

  return (
    <div className="mx-auto w-full select-none">
      <style>{`
        @keyframes gg-ring-spin { to { transform: rotate(360deg); } }
        @keyframes gg-ring-spin-back { to { transform: rotate(-360deg); } }
        @keyframes gg-token-float { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-18px) rotate(6deg); } }
        @keyframes gg-token-float-2 { 0%,100% { transform: translateY(0) rotate(6deg); } 50% { transform: translateY(16px) rotate(-7deg); } }
        @keyframes gg-icon-bob { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-7px) scale(1.06); } }
        @keyframes gg-glow-pulse { 0%,100% { filter: brightness(1); box-shadow: 0 0 22px rgba(190,242,100,.2); } 50% { filter: brightness(1.16); box-shadow: 0 0 45px rgba(190,242,100,.5); } }
        @keyframes gg-level-pop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        .gg-spin { animation: gg-ring-spin 7s linear infinite; }
        .gg-spin-back { animation: gg-ring-spin-back 9s linear infinite; }
        .gg-token-a { animation: gg-token-float 3.2s ease-in-out infinite; }
        .gg-token-b { animation: gg-token-float-2 3.8s ease-in-out infinite; }
        .gg-icon-bob { animation: gg-icon-bob 1.8s ease-in-out infinite; }
        .gg-glow { animation: gg-glow-pulse 2.2s ease-in-out infinite; }
        @media (min-width: 700px) {
          .gg-title-screen { display: block !important; padding: 0 !important; }
          .gg-player-card { right: 3.5% !important; top: 4% !important; width: 22% !important; z-index: 8; }
          .gg-game-logo { position: absolute; right: 7%; top: 23%; display: flex; gap: 8px; align-items: flex-start; transform: rotate(1deg); z-index: 6; }
          .gg-logo-word { display: flex !important; flex-direction: column; gap: 0 !important; }
          .gg-logo-word span { font-size: clamp(25px, 4.5vw, 48px) !important; line-height: .72 !important; }
          .gg-logo-slicer { display: flex; flex-direction: column; font-size: clamp(20px, 3.5vw, 38px) !important; line-height: .72 !important; letter-spacing: 0 !important; margin-top: 25px !important; }
          .gg-logo-subtitle { position: absolute; width: 220px; right: -6px; top: 245px; }
          .gg-mode-menu { position: absolute; inset: 0; display: block !important; pointer-events: none; }
          .gg-mode-menu > button { position: absolute !important; pointer-events: auto; }
          .gg-primary-mode { left: 30%; top: 36%; width: clamp(190px, 25vw, 245px) !important; height: clamp(190px, 25vw, 245px) !important; }
          .gg-fresh-mode { left: 10%; top: 55%; width: clamp(135px, 18vw, 175px) !important; height: clamp(135px, 18vw, 175px) !important; }
          .gg-sound-mode { left: 12%; top: 18%; width: 112px !important; height: 112px !important; }
          .gg-sound-mode > span:last-child { width: 96px !important; height: 96px !important; font-size: 34px !important; }
          .gg-token-a { left: 39% !important; top: 5% !important; width: 118px !important; height: 118px !important; }
          .gg-token-b { right: 34% !important; top: 66% !important; width: 108px !important; height: 108px !important; }
          .gg-level-rail { position: absolute; left: 22%; right: 22%; bottom: 3%; width: auto !important; z-index: 7; }
        }
        @media (prefers-reduced-motion: reduce) { .gg-spin,.gg-spin-back,.gg-token-a,.gg-token-b,.gg-icon-bob,.gg-glow { animation: none !important; } }
      `}</style>
      {/* Data source banner */}
      <div className="mb-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"
        style={{ background: real ? '#ecfdf3' : '#fff7ed', color: real ? '#065f46' : '#9a3412', border: CARD_BORDER }}>
        <span aria-hidden>{real ? '🟢' : '👀'}</span>
        {loading
          ? 'Loading your spending…'
          : real
            ? 'Playing with YOUR real purchases — slice the splurges toward each money goal.'
            : <span><a href="/register" className="underline font-bold">Sign in</a> to play with your real spending. Showing a demo for now.</span>}
      </div>

      {/* Goal-themed ninja arena */}
      <div className="relative rounded-[26px] overflow-hidden" style={{
        height: status === 'idle' ? 'auto' : 'clamp(500px, calc(100svh - 250px), 700px)',
        minHeight: status === 'idle' ? 0 : 500,
        aspectRatio: status === 'idle' ? '16 / 9' : undefined,
        background: `linear-gradient(rgba(45,18,4,0.04), rgba(45,18,4,0.12)), url('/games/splurge/wood-arena.png') center / cover no-repeat`,
        border: `1px solid ${scene.accent}55`,
        boxShadow: `0 28px 70px -34px ${scene.accent}, inset 0 0 0 1px rgba(255,255,255,0.08)`,
        transition: 'border-color .45s ease, box-shadow .45s ease',
      }}>
        <SplurgePhaserArena active={status === 'playing' || status === 'paused'} paused={status === 'paused'} purchases={data?.purchases || []} round={cfg} target={target} onEvent={onPhaserEvent} />

        {(status === 'playing' || status === 'clearing') && (
          <>
            <ArcadeHud
              dark
              score={hud.runBanked} scoreLabel="SAVED" scorePrefix="$" best={best > 0 ? best : null}
              status={combo >= 3 ? `COMBO ×${combo}` : null} statusTone="gold"
              lives={hud.lives}
              livesRenderer={({ filled }) => <img src="/games/splurge/guac-guardian.png" alt="" className="h-6 w-6 object-contain" style={{ opacity: filled ? 1 : .22, filter: filled ? 'none' : 'grayscale(1)' }} />}
              hint="Swipe to slice the splurges · let the green essentials fall"
              muted={!soundOn} onMute={toggleSound}
              plainControls
              onPause={status === 'playing' ? () => setStatus('paused') : undefined}
            />
            <JourneyBar round={round} banked={roundHud.banked} target={roundHud.target}
              stage={roundHud.stage} stages={cfg.stages} levelLabel="LEVEL " showIcon={false} />
            <div className="absolute left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase tracking-[0.18em] px-3 py-1 rounded-full"
              style={{ top: 130, color: '#fff', background: 'rgba(3,15,9,0.46)', border: `1px solid ${scene.accent}55`, zIndex: 14, pointerEvents: 'none' }}>
              {scene.label}
            </div>
          </>
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 bg-[#1b0c04]" aria-label="Splurge Slicer game menu">
            <img src="/games/splurge/title-screen-concept.png" alt="Splurge Slicer arcade menu" className="absolute inset-0 h-full w-full object-cover" draggable="false" />
            <button type="button" aria-label="Quick Slice" onClick={() => startRun(0)} disabled={loading} className="absolute left-[8.5%] top-[38%] h-[38%] w-[24%] rounded-full transition-all hover:bg-white/5 hover:shadow-[0_0_44px_rgba(251,113,133,.8)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" />
            <button type="button" aria-label={canContinue ? `Continue money journey at level ${furthest + 1}` : 'Start money journey'} onClick={() => startRun(canContinue ? furthest : 0)} disabled={loading} className="absolute left-[35%] top-[34%] h-[49%] w-[29%] rounded-full transition-all hover:bg-white/5 hover:shadow-[0_0_55px_rgba(34,211,238,.9)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" />
            <button type="button" aria-label="Goal Rush" onClick={() => startRun(canContinue ? furthest : 0)} disabled={loading} className="absolute left-[69%] top-[37%] h-[39%] w-[23%] rounded-full transition-all hover:bg-white/5 hover:shadow-[0_0_44px_rgba(245,158,11,.9)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" />
            <button type="button" aria-label={soundOn ? 'Mute game sounds' : 'Turn on game sounds'} onClick={toggleSound} className="absolute left-[25%] top-[72%] h-[26%] w-[17%] rounded-full transition-all hover:bg-white/5 hover:shadow-[0_0_40px_rgba(192,132,252,.9)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" />
            <button type="button" aria-label="Essentials challenge" onClick={() => startRun(0)} disabled={loading} className="absolute left-[58%] top-[72%] h-[26%] w-[18%] rounded-full transition-all hover:bg-white/5 hover:shadow-[0_0_40px_rgba(163,230,53,.9)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" />
          </div>
        )}

        {status === 'intro' && (
          <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(90deg,rgba(8,3,1,.2),rgba(8,3,1,.72)),url('/games/splurge/title-screen-concept.png') center / cover no-repeat" }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 52%,rgba(34,211,238,.16),transparent 32%),linear-gradient(rgba(4,12,7,.22),rgba(4,12,7,.58))' }} />
            <div className="absolute left-[4%] top-[6%] rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-100" style={{ background: 'linear-gradient(#4f260e,#241005)', border: '2px solid #c9892b', boxShadow: '0 8px 18px rgba(0,0,0,.4)' }}>Splurge Slicer · Money Journey</div>
            <div className="absolute left-[5%] top-[17%] w-[54%] max-w-[500px] px-7 py-6 text-left" style={{ background: 'linear-gradient(145deg,#fff3bf,#dfb965)', color: '#3b2814', border: '5px solid #6f3513', boxShadow: '0 24px 60px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,255,255,.35)', clipPath: 'polygon(2% 3%,98% 0,100% 94%,3% 100%,0 45%)' }}>
              <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: 'rgba(79,38,14,.22)' }}>
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-center text-white" style={{ background: `linear-gradient(145deg,${scene.glow},${scene.accent})`, border: '4px solid #fff3bf', boxShadow: `0 0 0 3px #6f3513,0 10px 22px rgba(0,0,0,.28)` }}><span><b className="block text-[9px] uppercase tracking-widest">Level</b><b className="block font-display text-2xl leading-none">{roundIdx + 1}</b></span></div>
                <div><div className="text-[10px] font-black uppercase tracking-[.2em] opacity-60">Goal {roundIdx + 1} of 7</div><div className="font-display text-[clamp(24px,4vw,38px)] font-black leading-none mt-1">{round.title}</div></div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-5">
                <div><div className="text-[9px] font-black uppercase tracking-[.18em] opacity-55">Money target</div><div className="font-display text-[clamp(34px,5vw,52px)] font-black leading-none text-green-800 mt-1">${target.toLocaleString()}</div></div>
                <div className="rounded-lg px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,.34)', border: '1px solid rgba(79,38,14,.15)' }}><div className="text-[8px] font-black uppercase tracking-widest opacity-55">Stage</div><div className="font-display text-xl font-black">1 / 2</div></div>
              </div>
              <p className="mt-4 text-sm font-bold leading-5">{round.lesson}</p>
              <div className="mt-3 rounded-lg px-4 py-3 text-[11px] font-semibold leading-4" style={{ background: 'rgba(112,69,16,.12)', borderLeft: `4px solid ${scene.accent}` }}><b className="uppercase tracking-wider">Guac tip:</b> {round.tip}</div>
            </div>
            <button onClick={beginRound} aria-label="Start slicing" className="group absolute right-[10%] top-[35%] h-[clamp(180px,24vw,245px)] w-[clamp(180px,24vw,245px)] rounded-full p-[11px] text-white transition-transform hover:scale-[1.045] active:scale-[.96]" style={{ background: `conic-gradient(${scene.glow},${scene.accent},#22d3ee,${scene.glow})`, boxShadow: `0 0 0 7px rgba(0,0,0,.3),0 24px 60px rgba(0,0,0,.58),0 0 48px ${scene.accent}70` }}>
              <span className="grid h-full w-full place-items-center rounded-full" style={{ background: 'radial-gradient(circle at 38% 28%,#245d3d,#06170d 72%)', border: '3px solid rgba(255,255,255,.2)' }}><span><img src="/games/splurge/guac-guardian.png" alt="" className="gg-icon-bob mx-auto h-[clamp(88px,12vw,126px)] w-[clamp(88px,12vw,126px)] object-contain drop-shadow-[0_12px_12px_rgba(0,0,0,.5)]" draggable="false" /><span className="block font-display text-sm font-black uppercase tracking-[.18em] mt-1">Start slicing</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-lime-200">Swipe to save</span></span></span>
            </button>
          </div>
        )}

        {status === 'roundclear' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center overflow-hidden" style={{ background: 'radial-gradient(circle, rgba(101,163,13,0.18), rgba(1,8,5,0.76) 70%)', backdropFilter: 'blur(3px)' }}>
            <div className="font-display font-black text-[clamp(34px,6vw,58px)] leading-none text-white" style={{ textShadow: '0 6px 0 rgba(0,0,0,0.3),0 14px 30px rgba(0,0,0,0.42)' }}>GOAL CRUSHED!</div>
            <div className="mt-2 text-xs font-black uppercase tracking-[0.2em]" style={{ color: scene.glow }}>Level {roundIdx + 1} · {cfg.title}</div>
            <div className="mt-5 w-44 h-44 rounded-full p-[9px]" style={{ background: `conic-gradient(${scene.glow},${scene.accent},${scene.glow})`, boxShadow: `0 0 50px ${scene.accent}35` }}>
              <div className="w-full h-full rounded-full grid place-items-center" style={{ background: 'radial-gradient(circle at 36% 28%,#2f6e45,#071b10 72%)' }}><div><div className="text-[9px] font-black uppercase tracking-widest text-lime-200">Total saved</div><div className="font-display font-black text-4xl text-white mt-1">${hud.runBanked.toLocaleString()}</div><div className="mx-auto mt-2 h-2 w-16 rounded-full bg-lime-300 shadow-[0_0_18px_#bef264]" /></div></div>
            </div>
            <button onClick={onRoundNext} className="mt-5 px-7 py-3.5 rounded-full text-sm font-black uppercase tracking-wider transition-transform hover:scale-105" style={{ color: '#17310b', background: 'linear-gradient(135deg,#d9f99d,#84cc16)', boxShadow: '0 14px 34px rgba(0,0,0,0.34)' }}>Next: {nextRound?.emoji} {nextRound?.title} →</button>
          </div>
        )}

        {status === 'journeydone' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 45%,rgba(250,204,21,0.24),rgba(3,12,8,0.82) 72%)', backdropFilter: 'blur(4px)' }}>
            <img src="/games/splurge/guac-guardian.png" alt="" className="h-28 w-28 object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,.45)]" /><div className="font-display font-black text-[clamp(32px,6vw,56px)] text-white leading-none mt-2" style={{ textShadow: '0 6px 0 rgba(0,0,0,0.3)' }}>FINANCIAL FREEDOM</div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-yellow-200 mt-3">Seven goals conquered</div>
            <div className="font-display font-black text-5xl text-lime-200 mt-5">${hud.runBanked.toLocaleString()}</div><div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Total money saved</div>
            <button onClick={() => startRun(0)} className="mt-6 w-28 h-28 rounded-full p-[7px] text-white transition-transform hover:scale-105" style={{ background: 'conic-gradient(#fde68a,#f59e0b,#65a30d,#fde68a)', boxShadow: '0 18px 48px rgba(0,0,0,0.44)' }}><span className="w-full h-full rounded-full grid place-items-center" style={{ background: '#153b25' }}><span><span className="block text-2xl">↻</span><span className="text-[9px] font-black uppercase tracking-wider">Play again</span></span></span></button>
          </div>
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4" style={{ background: 'radial-gradient(circle at 50% 48%,rgba(74,30,5,.24),rgba(18,6,1,.78))', backdropFilter: 'blur(2px)' }}>
            <div className="rounded-sm px-10 py-4 text-center" style={{ background: 'linear-gradient(#5a2b0d,#2b1105)', border: '4px solid #d69a37', boxShadow: '0 18px 45px rgba(0,0,0,.48)' }}><div className="font-display font-black text-5xl text-amber-50" style={{ textShadow: '0 5px 0 rgba(0,0,0,.45)' }}>PAUSED</div><div className="mt-1 text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Level {roundIdx + 1} · ${roundHud.banked.toLocaleString()} saved</div></div>
            <div className="flex items-end gap-6 mt-7">
              <button onClick={resume} className="w-36 h-36 rounded-full p-[8px] text-white transition-transform hover:scale-105" style={{ background: `conic-gradient(${scene.glow},#22d3ee,${scene.accent},${scene.glow})`, boxShadow: `0 18px 50px rgba(0,0,0,.5),0 0 38px ${scene.accent}66` }}><span className="w-full h-full rounded-full grid place-items-center" style={{ background: '#0d3021' }}><span><img src="/games/splurge/guac-guardian.png" alt="" className="mx-auto h-20 w-20 object-contain" /><span className="block text-[10px] font-black uppercase tracking-wider">Resume</span></span></span></button>
              <button onClick={toggleSound} className="w-24 h-24 rounded-full grid place-items-center text-white" style={{ background: '#32115d', border: '7px solid #a855f7', boxShadow: '0 14px 34px rgba(0,0,0,.42)' }}><span><span className="block font-display text-sm font-black">{soundOn ? 'ON' : 'OFF'}</span><span className="block text-[8px] font-black uppercase tracking-wider mt-1">Sound</span></span></button>
              <button onClick={() => setStatus('idle')} className="w-24 h-24 rounded-full grid place-items-center text-white" style={{ background: '#54210d', border: '7px solid #f59e0b', boxShadow: '0 14px 34px rgba(0,0,0,.42)' }}><span><span className="block font-display text-sm font-black">TITLE</span><span className="block text-[8px] font-black uppercase tracking-wider mt-1">Menu</span></span></button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 45%,rgba(255,113,57,.16),rgba(28,8,1,.76))' }}>
            <div className="relative font-display font-black text-[clamp(38px,7vw,68px)] leading-none" style={{ color: '#f8d56b', WebkitTextStroke: '2px #5a2309', textShadow: '0 7px 0 #7c2d12,0 16px 28px rgba(0,0,0,.55)', letterSpacing: '-.04em' }}>ROUND OVER</div>
            <div className="relative mt-3 w-full max-w-[520px] rounded-sm px-7 py-5 text-center" style={{ background: 'linear-gradient(145deg,#4c220b,#1f0b03)', border: '5px solid #d99b35', boxShadow: '0 24px 55px rgba(0,0,0,.58),inset 0 0 0 2px rgba(255,225,154,.18)', color: '#fff5d6' }}>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Level {roundIdx + 1} · {round.title}</div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-5">
                <div><div className="text-[9px] font-black uppercase tracking-widest text-amber-200/60">Best run</div><div className="font-display text-2xl font-black">${best.toLocaleString()}</div></div>
                <div className="h-40 w-40 rounded-full p-[9px]" style={{ background: `conic-gradient(#22d3ee ${Math.min(100,(roundHud.banked/Math.max(1,roundHud.target))*100)}%,#351508 0)`, boxShadow: '0 0 38px rgba(34,211,238,.28)' }}><div className="grid h-full w-full place-items-center rounded-full" style={{ background: 'radial-gradient(circle at 36% 28%,#245d3d,#07180f 72%)', border: '2px solid rgba(255,255,255,.15)' }}><div><div className="text-[9px] font-black uppercase tracking-widest text-lime-200">Saved</div><div className="font-display text-4xl font-black text-white">${hud.runBanked.toLocaleString()}</div><div className="text-[9px] font-bold text-white/55">Goal ${roundHud.target.toLocaleString()}</div></div></div></div>
                <div><div className="text-[9px] font-black uppercase tracking-widest text-amber-200/60">Missed</div><div className="font-display text-2xl font-black text-coral-300" style={{ color: '#fb7185' }}>${hud.missed.toLocaleString()}</div></div>
              </div>
              {newBest && <div className="mt-2 inline-flex rounded-full bg-lime-500 px-4 py-1 text-[9px] font-black uppercase tracking-wider text-green-950">New best run</div>}
              <div className="mt-2 text-[11px] text-amber-50/75"><SaveScoreLine res={saveRes} /></div>
            </div>
            <div className="relative mt-5 flex items-end justify-center gap-7">
              <button onClick={() => startRun(roundIdx)} className="h-28 w-28 rounded-full p-[7px] text-white transition-transform hover:scale-105" style={{ background: 'conic-gradient(#67e8f9,#22d3ee,#15803d,#67e8f9)', boxShadow: '0 16px 38px rgba(0,0,0,.48)' }}><span className="grid h-full w-full place-items-center rounded-full bg-green-950"><span><img src="/games/splurge/guac-guardian.png" alt="" className="mx-auto h-14 w-14 object-contain"/><b className="block text-[9px] uppercase tracking-wider">Retry</b></span></span></button>
              <button onClick={() => startRun(0)} className="h-24 w-24 rounded-full border-[7px] border-amber-500 bg-orange-950 text-[9px] font-black uppercase tracking-wider text-white shadow-xl transition-transform hover:scale-105">New<br/>Journey</button>
              <button onClick={toggleSound} aria-label={soundOn ? 'Mute game sounds' : 'Turn on game sounds'} className="h-20 w-20 rounded-full border-[6px] border-purple-500 bg-purple-950 text-white shadow-xl"><b className="block text-xs">{soundOn ? 'ON' : 'OFF'}</b><span className="text-[7px] font-black uppercase">Sound</span></button>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
