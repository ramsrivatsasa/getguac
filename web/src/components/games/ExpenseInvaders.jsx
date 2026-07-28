'use client'
// Expense Invaders — Space-Invaders built from YOUR spending. Each row is one of
// your top spending categories; the more you spent there, the tougher its
// invaders (more armor). Blast a category down to "clear" that spending, dodge
// nothing — just don't let the expenses reach your wallet at the bottom.
//
// Runs the shared 7-round FINANCIAL JOURNEY (lib/financialJourney): cut expenses
// → savings → car → house → invest → education → freedom. Each round
// = blast $target of overspend out of the sky, split into stages that tighten as
// the goal bar fills, on top of the auto-learning difficulty engine
// (lib/adaptiveDifficulty) which tunes march speed and armor to how you play.
//
// Data via usePlayerSpending (demo when signed out). SCORE IS GAME-ONLY. First
// finished round each day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, ArcadeHud, surfaceBg, drawGuacAvocado, AvocadoPip } from './arcadeKit'
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
const BG = '#052e16'          // guac field — matches surfaceBg('field')
const CARD_BORDER = '1px solid rgba(20,83,45,0.12)'
const BODY_FONT = "'Outfit', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Nunito', 'Bricolage Grotesque', ui-sans-serif, sans-serif"
const BEST_KEY = 'gg-invaders-best-v1'

const COLS = 7
const ROW_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#c084fc', '#f472b6']

// How Expense Invaders interprets each journey round: the wall marches faster,
// the invaders wear more armor, and every dollar blasted counts for more (so a
// $25k finale stays a couple of minutes, not twenty). `par` = the time we expect
// a round to take; the auto-learning engine grades you against it.
const INVADER_ROUNDS = JOURNEY.map((r, i) => ({
  ...r,
  marchMul: [1, 1.26, 1.4, 1.55, 1.72, 1.9, 2.1][i],
  armorBonus: [0, 1, 1, 1, 2, 2, 2][i],
  fireRate: [0.34, 0.32, 0.3, 0.29, 0.28, 0.26, 0.25][i],
  valueMul: roundValueMul(i),
  par: [45, 55, 60, 65, 70, 75, 80][i],
}))
// One invader is worth a slice of a real category total, so a full wave banks
// roughly a month of spending — far more per action than the slicer. The whole
// target curve is rescaled into that economy.
const TARGET_MUL = 3

const freshSim = () => ({
  enemies: [], bullets: [], floats: [], particles: [],
  shipX: 0.5, aimX: 0.5, dir: 1, fireIn: 0,
  runBanked: 0, roundBanked: 0, lives: 3, wave: 1, stage: 1,
  lastT: null, over: false,
  roundT0: 0, roundLivesLost: 0, shots: 0, hits: 0,
})

export default function ExpenseInvaders() {
  const canvasRef = useRef(null)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 640, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const dataRef = useRef(null)
  const keysRef = useRef({ left: false, right: false })
  const clearTimer = useRef(null)
  const targetsRef = useRef(journeyTargets(null, TARGET_MUL))
  const roundRef = useRef({ cfg: INVADER_ROUNDS[0], target: withBudgetBump(targetsRef.current[0]), idx: 0 })
  const isLastRef = useRef(false)
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ runBanked: 0, lives: 3, wave: 1 })
  const [roundHud, setRoundHud] = useState({ banked: 0, target: withBudgetBump(targetsRef.current[0]), stage: 1 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('invaders')
  const { data, loading } = usePlayerSpending()
  const journey = useJourney('invaders', { count: INVADER_ROUNDS.length })
  const { roundIdx, round, furthest, isLast, startFrom, advance } = journey
  const { diff, diffRef, record, note } = useAdaptive('invaders')
  const cfg = INVADER_ROUNDS[roundIdx]
  const target = withBudgetBump(Math.max(10, Math.round((targetsRef.current[roundIdx] * diff.targetMul) / 10) * 10))
  const nextRound = INVADER_ROUNDS[roundIdx + 1] || null

  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => () => clearTimeout(clearTimer.current), [])
  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  // Targets scale gently with the signed-in player's real monthly spend.
  useEffect(() => { targetsRef.current = journeyTargets(data, TARGET_MUL) }, [data])

  // Keep the canvas loop's view of the round + adapted goal fresh.
  useEffect(() => {
    roundRef.current = { cfg: INVADER_ROUNDS[roundIdx], target, idx: roundIdx }
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
    const kd = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true
    }
    const ku = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false
    }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [setStatus])

  const buildWave = useCallback((waveNum) => {
    const cats = (dataRef.current?.categories || []).slice(0, 6)
    const rows = cats.length || 4
    const maxTotal = Math.max(1, ...cats.map((c) => c.total))
    // The journey round adds armor on top of the "you spent a lot here" armor,
    // and a skilled player (per the auto-learning profile) gets one more plate.
    const bonus = (roundRef.current.cfg.armorBonus || 0) + (diffRef.current.skill >= 0.8 ? 1 : 0)
    const enemies = []
    for (let r = 0; r < rows; r++) {
      const c = cats[r] || { label: 'Spending', emoji: '💸', total: 100, slug: 'misc' }
      const hp = Math.max(1, Math.min(6, Math.round((c.total / maxTotal) * 3) + 1 + bonus))
      const perEnemy = Math.max(5, Math.round(c.total / COLS))
      for (let col = 0; col < COLS; col++) {
        enemies.push({
          row: r, col, alive: true, hp, maxHp: hp,
          emoji: c.emoji, label: c.label, value: perEnemy, color: ROW_COLORS[r % ROW_COLORS.length],
        })
      }
    }
    return enemies
  }, [diffRef])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({ runBanked: st.runBanked, lives: st.lives, wave: st.wave })
      setRoundHud({ banked: st.roundBanked, target: roundRef.current.target, stage: st.stage })
    }

    // Feed the round result to the auto-learning engine. Accuracy here = the
    // share of shots that actually connected.
    const learn = (cleared) => {
      const st = sim.current
      record({
        cleared,
        seconds: st.roundT0 ? (performance.now() - st.roundT0) / 1000 : 0,
        par: roundRef.current.cfg.par || 60,
        livesLost: st.roundLivesLost,
        accuracy: st.shots > 0 ? st.hits / st.shots : null,
      })
    }

    const endRun = (win) => {
      const st = sim.current
      st.over = true
      if (!win) learn(false)
      save(st.runBanked, roundRef.current.idx + 1)
      if (st.runBanked > bestRef.current) {
        bestRef.current = st.runBanked
        setBest(st.runBanked)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.runBanked)) } catch {}
      }
      setStatus(win ? 'journeydone' : 'over')
    }

    const clearRound = () => {
      const st = sim.current
      learn(true)
      st.bullets = []
      st.floats.push({ x: sizeRef.current.w / 2, y: sizeRef.current.h * 0.4, text: `${roundRef.current.cfg.banner} 🎉`, t0: performance.now(), life: 1200, size: 20, color: '#a3e635', banner: true })
      setStatus('clearing')
      clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => {
        if (isLastRef.current) endRun(true)
        else setStatus('roundclear')
      }, 900)
    }

    // Layout helpers (fractions → px), recomputed each frame so resize is free.
    const geo = () => {
      const { w, h } = sizeRef.current
      const marginX = w * 0.08
      const cellW = (w - marginX * 2) / COLS
      const top = h * 0.25          // clears the HUD score pill + the round goal bar
      const rowH = Math.min(52, (h * 0.5) / 6)
      const eR = Math.min(cellW, rowH) * 0.34
      return { w, h, marginX, cellW, top, rowH, eR }
    }
    const enemyPos = (e, g, marchX, marchY) => ({
      x: g.marginX + e.col * g.cellW + g.cellW / 2 + marchX,
      y: g.top + e.row * g.rowH + marchY,
    })

    const update = (st, dt) => {
      const g = geo()
      // Ship follows aim (pointer) or keyboard.
      let target = st.aimX
      if (keysRef.current.left) target = Math.max(0, st.shipX - dt * 1.4)
      if (keysRef.current.right) target = Math.min(1, st.shipX + dt * 1.4)
      st.shipX += (target - st.shipX) * Math.min(1, dt * 12)
      const shipPx = g.marginX + st.shipX * (g.w - g.marginX * 2)
      const shipY = g.h - 64        // sits above the HUD hint bar

      // March: horizontal drift, drop + reverse at edges. Speed scales with
      // how many invaders are dead (classic acceleration) and the wave.
      const alive = st.enemies.filter((e) => e.alive)
      if (alive.length === 0) {
        st.wave += 1
        st.enemies = buildWave(st.wave)
        st.marchX = 0; st.marchY = 0
        st.floats.push({ x: g.w / 2, y: g.h * 0.4, text: 'Wave down — next batch →', t0: performance.now(), life: 1400, size: 20, color: '#a3e635', banner: true })
        syncHud()
        return
      }
      const rc = roundRef.current
      const frac = 1 - alive.length / st.enemies.length
      // Base march × the journey round's ramp × the stage inside it × what the
      // auto-learning engine thinks this player can take. Clamped so late
      // rounds stay hard rather than impossible.
      const heat = Math.max(0.7, Math.min(2.4,
        (rc.cfg.marchMul || 1) * (1 + (st.stage - 1) * 0.08) * diffRef.current.mul))
      const speed = (11 + st.wave * 4 + frac * 40) * heat
      st.marchX = (st.marchX || 0) + st.dir * speed * dt
      // Find current horizontal extent.
      let minX = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const e of alive) {
        const p = enemyPos(e, g, st.marchX, st.marchY || 0)
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
      if (maxX > g.w - g.marginX * 0.6 && st.dir > 0) { st.dir = -1; st.marchY = (st.marchY || 0) + g.rowH * 0.5 }
      else if (minX < g.marginX * 0.6 && st.dir < 0) { st.dir = 1; st.marchY = (st.marchY || 0) + g.rowH * 0.5 }
      // Expenses reached the wallet — costs an avocado and resets the wall.
      // Run's only over when the avocados run out.
      if (maxY >= shipY - g.eR) {
        st.lives -= 1
        st.roundLivesLost += 1
        st.floats.push({ x: g.w / 2, y: g.h * 0.45, text: 'They reached your wallet! −1 🥑', t0: performance.now(), life: 1200, size: 18, color: '#fda4af', banner: true })
        if (st.lives <= 0) { syncHud(); endRun(false); return }
        st.enemies = buildWave(st.wave)
        st.bullets = []
        st.marchX = 0; st.marchY = 0; st.dir = 1
        syncHud()
        return
      }

      // Auto-fire.
      st.fireIn -= dt
      if (st.fireIn <= 0) {
        st.bullets.push({ x: shipPx, y: shipY - 26, vy: -560 })   // out of the barrel tip
        st.shots += 1
        st.fireIn = rc.cfg.fireRate || 0.34
      }
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i]
        b.y += b.vy * dt
        if (b.y < 0) { st.bullets.splice(i, 1); continue }
        for (const e of alive) {
          const p = enemyPos(e, g, st.marchX, st.marchY || 0)
          if (Math.abs(b.x - p.x) < g.eR + 3 && Math.abs(b.y - p.y) < g.eR + 3) {
            e.hp -= 1
            st.hits += 1
            st.bullets.splice(i, 1)
            if (e.hp <= 0) {
              e.alive = false
              // Later rounds move bigger money per invader downed.
              const amt = Math.max(1, Math.round(e.value * (rc.cfg.valueMul || 1)))
              st.roundBanked += amt
              st.runBanked += amt
              st.floats.push({ x: p.x, y: p.y, text: `+$${amt.toLocaleString()}`, t0: performance.now(), life: 600, size: 13, color: '#a3e635' })
              for (let k = 0; k < 6; k++) st.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t0: performance.now(), life: 400, color: e.color })
              // Stage step inside the round — the wall speeds up as you close in.
              const stages = rc.cfg.stages || 1
              if (stages > 1) {
                const want = stageFor(rc.idx, st.roundBanked, rc.target)
                if (want > st.stage) {
                  st.stage = want
                  st.floats.push({ x: g.w / 2, y: g.h * 0.35, text: `⚡ Stage ${want} — they speed up!`, t0: performance.now(), life: 1100, size: 18, color: '#fde047', banner: true })
                }
              }
              syncHud()
              if (st.roundBanked >= rc.target) { clearRound(); return }
            }
            break
          }
        }
      }
      const now = performance.now()
      st.floats = st.floats.filter((f) => now - f.t0 < f.life)
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i]
        p.x += p.vx * dt; p.y += p.vy * dt
        if (now - p.t0 > p.life) st.particles.splice(i, 1)
      }
      st._shipPx = shipPx; st._shipY = shipY; st._g = g
    }

    const render = (st) => {
      const g = st._g || geo()
      const { w, h } = g
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h)
      // starfield-ish dots
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % w, (i * 53) % (h * 0.7), 2, 2)

      const now = performance.now()
      for (const e of st.enemies) {
        if (!e.alive) continue
        const p = enemyPos(e, g, st.marchX || 0, st.marchY || 0)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.beginPath()
        const r = g.eR
        if (ctx.roundRect) ctx.roundRect(-r, -r, r * 2, r * 2, 6)
        else ctx.rect(-r, -r, r * 2, r * 2)
        ctx.fillStyle = e.color; ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1
        ctx.lineWidth = 2; ctx.strokeStyle = e.color; ctx.stroke()
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `${Math.round(r * 1.1)}px ${BODY_FONT}`
        ctx.fillText(e.emoji, 0, -1)
        // armor pips
        if (e.maxHp > 1) {
          for (let k = 0; k < e.maxHp; k++) {
            ctx.beginPath(); ctx.arc(-r + 4 + k * 6, r - 4, 2, 0, Math.PI * 2)
            ctx.fillStyle = k < e.hp ? e.color : 'rgba(255,255,255,0.2)'; ctx.fill()
          }
        }
        ctx.restore()
      }
      // bullets
      ctx.fillStyle = '#fde047'
      for (const b of st.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12)
      // particles
      for (const p of st.particles) {
        ctx.globalAlpha = Math.max(0, 1 - (now - p.t0) / p.life)
        ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
        ctx.globalAlpha = 1
      }
      // Ship = the GetGuac mascot riding a cannon, NOT a stray emoji. Drawn
      // bigger with a launcher base + glow so it reads as "you" against the
      // dark field instead of a blob.
      const sx = st._shipPx ?? w / 2, sy = st._shipY ?? h - 34
      ctx.save()
      // glow pad under the ship
      const halo = ctx.createRadialGradient(sx, sy + 6, 2, sx, sy + 6, 34)
      halo.addColorStop(0, 'rgba(163,230,53,0.32)')
      halo.addColorStop(1, 'rgba(163,230,53,0)')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(sx, sy + 6, 34, 0, Math.PI * 2); ctx.fill()
      // launcher base
      ctx.fillStyle = '#3f6212'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(sx - 26, sy + 12, 52, 10, 5)
      else ctx.rect(sx - 26, sy + 12, 52, 10)
      ctx.fill()
      ctx.fillStyle = '#A3E635'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(sx - 20, sy + 9, 40, 6, 3)
      else ctx.rect(sx - 20, sy + 9, 40, 6)
      ctx.fill()
      // barrel
      ctx.fillStyle = '#A3E635'
      ctx.fillRect(sx - 2.5, sy - 26, 5, 10)
      ctx.restore()
      drawGuacAvocado(ctx, sx, sy - 4, 21)
      // floats
      for (const f of st.floats) {
        const age = now - f.t0
        ctx.globalAlpha = Math.max(0, 1 - age / f.life)
        ctx.fillStyle = f.color; ctx.font = `800 ${f.size}px ${DISPLAY_FONT}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        if (f.banner) {
          const tw = ctx.measureText(f.text).width
          ctx.fillStyle = 'rgba(11,18,32,0.9)'
          ctx.beginPath()
          if (ctx.roundRect) ctx.roundRect(f.x - tw / 2 - 12, f.y - 16, tw + 24, 32, 16)
          else ctx.rect(f.x - tw / 2 - 12, f.y - 16, tw + 24, 32)
          ctx.fill(); ctx.fillStyle = f.color
        }
        ctx.fillText(f.text, f.x, f.y - age * (f.banner ? 0.01 : 0.04))
        ctx.globalAlpha = 1
      }
    }

    const loop = (t) => {
      const st = sim.current
      const realMs = Math.min(50, st.lastT == null ? 16 : t - st.lastT)
      st.lastT = t
      const dt = realMs / 1000
      if (statusRef.current === 'playing') update(st, dt)
      render(st)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [setStatus, save, buildWave, record, diffRef])

  const onMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const g = sizeRef.current
    const marginX = g.w * 0.08
    const x = (e.clientX - rect.left - marginX) / Math.max(1, g.w - marginX * 2)
    sim.current.aimX = Math.max(0, Math.min(1, x))
  }

  // Start a fresh run beginning at round `idx` (0 = from the top).
  const startRun = (idx = 0) => {
    Object.assign(sim.current, freshSim())
    setHud({ runBanked: 0, lives: 3, wave: 1 })
    setRoundHud({ banked: 0, target: withBudgetBump(targetsRef.current[idx]), stage: 1 })
    setNewBest(false)
    resetSave()
    startFrom(idx)
    setStatus('intro')
  }
  // Player tapped Start on the round's teaching card — build the wall and go.
  const beginRound = () => {
    const st = sim.current
    roundRef.current = { cfg: INVADER_ROUNDS[roundIdx], target, idx: roundIdx }
    st.roundBanked = 0; st.stage = 1; st.wave = 1
    st.bullets = []; st.floats = []; st.particles = []
    st.marchX = 0; st.marchY = 0; st.dir = 1; st.lastT = null; st.over = false
    st.roundT0 = performance.now(); st.roundLivesLost = 0; st.shots = 0; st.hits = 0
    st.enemies = buildWave(1)
    setRoundHud({ banked: 0, target, stage: 1 })
    setStatus('playing')
  }
  const onRoundNext = () => {
    if (isLast) { setStatus('journeydone'); return } // safety; last round routes via endRun
    advance()
    setStatus('intro')
  }
  const resume = () => { sim.current.lastT = null; setStatus('playing') }
  const canContinue = furthest > 0

  const overlayCard = 'rounded-2xl p-5 text-center w-full'
  const pillGreen = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const real = data?.hasData
  const topCats = (data?.categories || []).slice(0, 3).map((c) => `${c.emoji} ${c.label}`).join('  ')

  return (
    <div className="mx-auto w-full select-none">
      <div className="mb-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"
        style={{ background: real ? '#ecfdf3' : '#fff7ed', color: real ? '#065f46' : '#9a3412', border: CARD_BORDER }}>
        <span aria-hidden>{real ? '🟢' : '👀'}</span>
        {loading ? 'Loading your spending…'
          : real ? <span>Invaders built from your top categories: {topCats || 'your spending'}. Blast the biggest overspend.</span>
            : <span><a href="/register" className="underline font-bold">Sign in</a> to fight your real spending. Showing a demo for now.</span>}
      </div>

      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(450px, calc(100svh - 230px), 840px)', minHeight: 430, background: surfaceBg('field') }}>
        <canvas
          ref={canvasRef}
          onPointerMove={onMove}
          onPointerDown={onMove}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: status === 'playing' ? 'none' : 'default' }}
        />

        {(status === 'playing' || status === 'clearing') && (
          <>
            <ArcadeHud
              score={hud.runBanked} scorePrefix="$" scoreLabel="CLEARED" best={best}
              status={`Wave ${hud.wave}`}
              lives={hud.lives}
              hint="Move with finger / mouse · ← → or A-D · fire is automatic"
              onPause={status === 'playing' ? () => setStatus('paused') : undefined}
            />
            <JourneyBar round={round} banked={roundHud.banked} target={roundHud.target}
              stage={roundHud.stage} stages={cfg.stages} />
          </>
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.55)' }}>
            <div className={`${overlayCard} max-h-full overflow-y-auto`} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-4xl mb-1">👾</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Expense Invaders</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>
                An eight-round <b style={{ color: GREEN }}>money journey</b>. Every row is one of your spending categories — the more you spent, the more armor its invaders carry.
              </p>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Move with your finger or mouse (auto-fire) and blast each round&apos;s goal out of the sky before the expenses reach your wallet.
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
                    Continue from Round {furthest + 1} · {INVADER_ROUNDS[furthest].emoji} {INVADER_ROUNDS[furthest].title}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'intro' && (
          <RoundIntro round={round} target={target} stages={cfg.stages} diff={diff} note={note}
            onStart={beginRound} cta={roundIdx === 0 ? 'Start blasting' : 'Start round'} />
        )}

        {status === 'roundclear' && (
          <RoundComplete round={cfg} next={nextRound} banked={hud.runBanked} diff={diff} note={note} onNext={onRoundNext} />
        )}

        {status === 'journeydone' && (
          <JourneyComplete banked={hud.runBanked} diff={diff} onReplay={() => startRun(0)} />
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.6)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused</div>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.6)' }}>
            <div className={`${overlayCard} max-h-full overflow-y-auto`} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 400 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Out of avocados!</div>
              <div className="text-xs font-semibold mt-1" style={{ color: MUTED }}>
                Stopped in Round {roundIdx + 1} · {round.emoji} {round.title}
              </div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>Spending cleared this run</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.runBanked.toLocaleString()}</div>
              {newBest && (
                <div className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best!</div>
              )}
              <div className="mt-2 text-sm" style={{ color: BODY }}>Held out to wave <span className="font-display font-extrabold" style={{ color: INK }}>{hud.wave}</span></div>
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
        Bigger category = tougher invaders. Move with finger/mouse, ← → or A/D; fire is automatic. A game — it never changes your real data.
      </p>
    </div>
  )
}
