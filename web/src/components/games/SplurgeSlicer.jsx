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
  useScoreSaver, SaveScoreLine, ArcadeHud, makeWoodCanvas,
  spawnBurst, updateBurst, drawBurst, confettiBurst, updateConfetti, drawConfetti,
} from './arcadeKit'
import { usePlayerSpending } from '../../lib/playerSpending'
import { JOURNEY, journeyTargets, roundValueMul, stageFor, withBudgetBump } from '../../lib/financialJourney'
import {
  useJourney, useAdaptive, AdaptiveChip,
  RoundIntro, RoundComplete, JourneyComplete, JourneyBar,
} from './journeyKit'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const BODY_FONT = "'Outfit', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Nunito', 'Bricolage Grotesque', ui-sans-serif, sans-serif"
// Wooden board backdrop (shared arcade wood).
const FIELD_BG = 'linear-gradient(180deg, #c69152 0%, #a9743a 100%)'

const GRAVITY = 680          // gentler arc — items hang longer, easier to read + slice
const MIN_CUT_SPEED = 0.45
const TRAIL_MS = 120
const COMBO_MS = 350
const BEST_KEY = 'gg-splurge-best-v1'

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
  items: [], bursts: [], floats: [], confetti: [], trail: [], cutIdx: 0,
  strokeCuts: [], comboBest: 0, down: false,
  roundBanked: 0, runBanked: 0, missed: 0, lives: 3, elapsed: 0, stage: 1,
  spawnIn: 650, slowUntil: 0, vignette: 0, lastT: null,
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
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 640, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const dataRef = useRef(null)
  const comboTimer = useRef(null)
  const clearTimer = useRef(null)
  const woodRef = useRef({ c: null, w: 0, h: 0 })
  const targetsRef = useRef(journeyTargets(null))
  const roundRef = useRef({ cfg: SLICER_ROUNDS[0], target: targetsRef.current[0], idx: 0 })
  const isLastRef = useRef(false)

  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ runBanked: 0, missed: 0, lives: 3 })
  const [roundHud, setRoundHud] = useState({ banked: 0, target: withBudgetBump(targetsRef.current[0]), stage: 1 })
  const [combo, setCombo] = useState(0)
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('splurge')
  const { data, loading } = usePlayerSpending()
  const journey = useJourney('splurge', { count: SLICER_ROUNDS.length })
  const { roundIdx, round, furthest, isLast, startFrom, advance } = journey
  // Auto-learning difficulty: reads how the player actually performs and hands
  // back multipliers for spawn pressure and the round goal.
  const { diff, diffRef, record, note } = useAdaptive('splurge')
  const cfg = SLICER_ROUNDS[roundIdx]
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
      const box = canvas.parentElement.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: box.width, h: box.height }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas.parentElement)
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
      const r = 34
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

    const onSlice = (it) => {
      const st = sim.current
      const now = performance.now()
      const { w, h } = sizeRef.current
      const rc = roundRef.current
      if (it.splurge) {
        // Later rounds move bigger money per slice — that's what keeps the
        // $25,000 finale from turning into a grind.
        const amt = Math.max(1, Math.round(it.amt * (rc.cfg.valueMul || 1)))
        st.goodCuts += 1
        st.roundBanked += amt
        st.runBanked += amt
        spawnBurst(st.bursts, it.x, it.y, { count: 12, color: '#4ade80', speed: 200, life: 0.5, size: 3.6, gravity: 320 })
        st.floats.push({ x: it.x, y: it.y - it.r, text: `+$${amt.toLocaleString()}`, t0: now, life: 850, size: 18, color: '#166534' })
        st.strokeCuts.push(now)
        const n = st.strokeCuts.filter((t) => now - t <= COMBO_MS).length
        if (n >= 3) {
          setCombo(n)
          clearTimeout(comboTimer.current)
          comboTimer.current = setTimeout(() => setCombo(0), 1000)
          // Combos are flair only — they pay nothing. Money is banked for the
          // cut itself and nothing else, so the goal bar moves only when an
          // expense actually goes.
          if (n > st.comboBest) {
            st.floats.push({ x: w / 2, y: h * 0.28, text: `COMBO ×${n} — Guac frenzy! 🥑`, t0: now, life: 1300, size: 22, color: INK, banner: true })
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
            st.floats.push({ x: w / 2, y: h * 0.4, text: `⚡ Stage ${want} — heating up!`, t0: now, life: 1100, size: 20, color: '#b45309', banner: true })
          }
        }
        syncHud()
        if (st.roundBanked >= rc.target) { clearRound(); return }
      } else {
        st.lives -= 1
        st.roundLivesLost += 1
        st.badCuts += 1
        st.vignette = 1
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
      updateBurst(st.bursts, dt)
      st.floats = st.floats.filter((f) => now - f.t0 < f.life)
      if (st.vignette > 0) st.vignette = Math.max(0, st.vignette - realMs / 400)

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

    // Chip = big emoji + a rounded price/ESSENTIAL badge (mockup 1a). No disc.
    const drawChip = (it) => {
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.rotate(it.rot * 0.5)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `${Math.round(it.r * 1.5)}px ${BODY_FONT}`
      ctx.fillText(it.e, 0, -it.r * 0.28)
      const badge = it.splurge ? `$${it.amt}` : 'ESSENTIAL'
      ctx.font = `800 ${it.splurge ? 14 : 11}px ${DISPLAY_FONT}`
      const bw = ctx.measureText(badge).width + 16, bh = 22
      const byy = it.r * 0.5
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(-bw / 2, byy, bw, bh, 11)
      else ctx.rect(-bw / 2, byy, bw, bh)
      ctx.fillStyle = it.splurge ? '#ef4444' : '#22c55e'; ctx.fill()
      ctx.fillStyle = it.splurge ? '#ffffff' : '#052e16'
      ctx.fillText(badge, 0, byy + bh / 2 + 0.5)
      ctx.restore()
    }

    const render = (st, now) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)
      // wooden board (cached; regenerated only on resize)
      const wref = woodRef.current
      const rw = Math.round(w), rh = Math.round(h)
      if (!wref.c || wref.w !== rw || wref.h !== rh) { wref.c = makeWoodCanvas(rw, rh); wref.w = rw; wref.h = rh }
      ctx.drawImage(wref.c, 0, 0, w, h)
      drawBurst(ctx, st.bursts)
      for (const it of st.items) drawChip(it)
      const tr = st.trail
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (let i = 1; i < tr.length; i++) {
        const k = Math.max(0, 1 - (now - tr[i].t) / TRAIL_MS) * (i / tr.length)
        if (k <= 0) continue
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y)
        ctx.strokeStyle = `rgba(190,242,100,${0.4 * k})`; ctx.lineWidth = 3 + 12 * k; ctx.stroke()
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`; ctx.lineWidth = 1 + 6 * k; ctx.stroke()
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
    const st = sim.current
    st.items = []; st.floats = []; st.bursts = []; st.confetti = []
    st.roundBanked = 0; st.stage = 1; st.spawnIn = 650; st.lastT = null; st.down = false
    st.roundT0 = performance.now(); st.roundLivesLost = 0; st.goodCuts = 0; st.badCuts = 0
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

  const overlayCard = 'rounded-2xl p-5 text-center w-full'
  const pillGreen = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const real = data?.hasData
  const canContinue = furthest > 0

  return (
    <div className="mx-auto w-full select-none">
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

      {/* Arena — wooden board (mockup 1a) */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(450px, calc(100svh - 230px), 840px)', minHeight: 430, background: FIELD_BG }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: status === 'playing' ? 'crosshair' : 'default' }}
        />

        {(status === 'playing' || status === 'clearing') && (
          <>
            <ArcadeHud
              dark={false}
              score={hud.runBanked} scoreLabel="SAVED" scorePrefix="$" best={best > 0 ? best : null}
              status={combo >= 3 ? `🔥 COMBO ×${combo}` : null} statusTone="gold"
              lives={hud.lives}
              hint="Swipe to slice the splurges · let the green essentials fall"
              onPause={status === 'playing' ? () => setStatus('paused') : undefined}
            />
            <JourneyBar round={round} banked={roundHud.banked} target={roundHud.target}
              stage={roundHud.stage} stages={cfg.stages} />
          </>
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.5)' }}>
            <div className={`${overlayCard} max-h-full overflow-y-auto`} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-4xl mb-1">🔪</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Splurge Slicer</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>
                An eight-round <b style={{ color: GREEN }}>money journey</b>. Your purchases fly up — swipe to slice the <span className="font-bold" style={{ color: ROSE }}>splurges</span> and bank the dollars toward each goal.
              </p>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Let the <span className="font-bold" style={{ color: GREEN }}>essentials</span> fall — slicing a need costs a 🥑. Chain 3+ in one swipe for a Guac frenzy.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {JOURNEY.map((r) => (
                  <span key={r.id} className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${r.color}18`, color: r.dark || r.color }}>{r.emoji} {r.title}</span>
                ))}
              </div>
              <AdaptiveChip diff={diff} note={note} compact />
              <div className="flex flex-col items-center gap-2 mt-4">
                <button onClick={() => startRun(0)} disabled={loading} className={pillGreen} style={{ background: loading ? '#9ca3af' : GREEN }}>
                  {loading ? 'Loading…' : canContinue ? 'Start from Round 1' : 'Start the journey'}
                </button>
                {canContinue && !loading && (
                  <button onClick={() => startRun(furthest)} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
                    Continue from Round {furthest + 1} · {SLICER_ROUNDS[furthest].emoji} {SLICER_ROUNDS[furthest].title}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'intro' && (
          <RoundIntro round={round} target={target} stages={cfg.stages} diff={diff} note={note}
            onStart={beginRound} cta={roundIdx === 0 ? 'Start slicing' : 'Start round'} />
        )}

        {status === 'roundclear' && (
          <RoundComplete round={cfg} next={nextRound} banked={hud.runBanked} diff={diff} note={note} onNext={onRoundNext} />
        )}

        {status === 'journeydone' && (
          <JourneyComplete banked={hud.runBanked} diff={diff} onReplay={() => startRun(0)} />
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.55)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused</div>
              <p className="text-sm mt-1" style={{ color: BODY }}>The blade waits for no one — except you.</p>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(5,25,14,0.55)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 400 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Out of avocados!</div>
              <div className="text-xs font-semibold mt-1" style={{ color: MUTED }}>
                Stopped in Round {roundIdx + 1} · {round.emoji} {round.title}
              </div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>Banked this run</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.runBanked.toLocaleString()}</div>
              {newBest && (
                <div className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best!</div>
              )}
              <div className="flex justify-center gap-6 mt-3 text-sm" style={{ color: BODY }}>
                <span>Missed <span className="font-display font-extrabold" style={{ color: AMBER }}>${hud.missed.toLocaleString()}</span></span>
                <span>Best <span className="font-display font-extrabold" style={{ color: INK }}>${best.toLocaleString()}</span></span>
              </div>
              <SaveScoreLine res={saveRes} />
              <AdaptiveChip diff={diff} note={note} compact />
              <div className="flex flex-col items-center gap-2 mt-4">
                <button onClick={() => startRun(roundIdx)} className={pillGreen} style={{ background: GREEN }}>
                  Retry Round {roundIdx + 1}
                </button>
                <button onClick={() => startRun(0)} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>
                  Restart the journey
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Red $ badge = a splurge, slice it · green ESSENTIAL = a need, let it fall. This is a game — slicing never changes your real ratings or GuacScore.
      </p>
    </div>
  )
}
