'use client'
// Expense Invaders — Space-Invaders built from YOUR spending. Each row is one of
// your top spending categories; the more you spent there, the tougher its
// invaders (more armor). Blast a category down to "clear" that spending, dodge
// nothing — just don't let the expenses reach your wallet at the bottom.
//
// Data via usePlayerSpending (demo when signed out). SCORE IS GAME-ONLY. First
// finished round each day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, ArcadeHud, surfaceBg } from './arcadeKit'
import { usePlayerSpending } from '../../lib/playerSpending'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const BG = '#052e16'          // guac field — matches surfaceBg('field')
const CARD_BORDER = '1px solid rgba(20,83,45,0.12)'
const BODY_FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Bricolage Grotesque', 'Plus Jakarta Sans', ui-sans-serif, sans-serif"
const BEST_KEY = 'gg-invaders-best-v1'

const COLS = 7
const ROW_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#c084fc', '#f472b6']

const freshSim = () => ({
  enemies: [], bullets: [], floats: [], particles: [],
  shipX: 0.5, aimX: 0.5, dir: 1, fireIn: 0,
  score: 0, lives: 3, wave: 1, lastT: null, over: false,
})

export default function ExpenseInvaders() {
  const canvasRef = useRef(null)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 640, h: 480 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const dataRef = useRef(null)
  const keysRef = useRef({ left: false, right: false })
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('invaders')
  const { data, loading } = usePlayerSpending()

  useEffect(() => { dataRef.current = data }, [data])
  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

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
    const enemies = []
    for (let r = 0; r < rows; r++) {
      const c = cats[r] || { label: 'Spending', emoji: '💸', total: 100, slug: 'misc' }
      const hp = Math.max(1, Math.min(4, Math.round((c.total / maxTotal) * 3) + 1))
      const perEnemy = Math.max(5, Math.round(c.total / COLS))
      for (let col = 0; col < COLS; col++) {
        enemies.push({
          row: r, col, alive: true, hp, maxHp: hp,
          emoji: c.emoji, label: c.label, value: perEnemy, color: ROW_COLORS[r % ROW_COLORS.length],
        })
      }
    }
    return enemies
  }, [])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({ score: st.score, lives: st.lives, wave: st.wave })
    }

    const endGame = () => {
      setStatus('over')
      const st = sim.current
      st.over = true
      save(st.score, st.wave)
      if (st.score > bestRef.current) {
        bestRef.current = st.score
        setBest(st.score)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.score)) } catch {}
      }
    }

    // Layout helpers (fractions → px), recomputed each frame so resize is free.
    const geo = () => {
      const { w, h } = sizeRef.current
      const marginX = w * 0.08
      const cellW = (w - marginX * 2) / COLS
      const top = h * 0.14
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
      const shipY = g.h - 34

      // March: horizontal drift, drop + reverse at edges. Speed scales with
      // how many invaders are dead (classic acceleration) and the wave.
      const alive = st.enemies.filter((e) => e.alive)
      if (alive.length === 0) {
        st.wave += 1
        st.enemies = buildWave(st.wave)
        st.marchX = 0; st.marchY = 0
        st.floats.push({ x: g.w / 2, y: g.h * 0.4, text: 'Budget cleared! Next month →', t0: performance.now(), life: 1400, size: 20, color: '#a3e635', banner: true })
        syncHud()
        return
      }
      const frac = 1 - alive.length / st.enemies.length
      const speed = (11 + st.wave * 4 + frac * 40) // gentler march (was 18 + wave*6 + frac*60)
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
      if (maxY >= shipY - g.eR) { st.lives = 0; endGame(); return }

      // Auto-fire.
      st.fireIn -= dt
      if (st.fireIn <= 0) {
        st.bullets.push({ x: shipPx, y: shipY - 16, vy: -560 })
        st.fireIn = 0.34
      }
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i]
        b.y += b.vy * dt
        if (b.y < 0) { st.bullets.splice(i, 1); continue }
        for (const e of alive) {
          const p = enemyPos(e, g, st.marchX, st.marchY || 0)
          if (Math.abs(b.x - p.x) < g.eR + 3 && Math.abs(b.y - p.y) < g.eR + 3) {
            e.hp -= 1
            st.bullets.splice(i, 1)
            if (e.hp <= 0) {
              e.alive = false
              st.score += e.value
              st.floats.push({ x: p.x, y: p.y, text: `+$${e.value}`, t0: performance.now(), life: 600, size: 13, color: '#a3e635' })
              for (let k = 0; k < 6; k++) st.particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t0: performance.now(), life: 400, color: e.color })
              syncHud()
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
      // ship (avocado cannon)
      const sx = st._shipPx ?? w / 2, sy = st._shipY ?? h - 34
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `28px ${BODY_FONT}`
      ctx.fillText('🥑', sx, sy)
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
  }, [setStatus, save, buildWave])

  const onMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const g = sizeRef.current
    const marginX = g.w * 0.08
    const x = (e.clientX - rect.left - marginX) / Math.max(1, g.w - marginX * 2)
    sim.current.aimX = Math.max(0, Math.min(1, x))
  }

  const start = () => {
    Object.assign(sim.current, freshSim())
    sim.current.enemies = buildWave(1)
    sim.current.marchX = 0; sim.current.marchY = 0
    setHud({ score: 0, lives: 3, wave: 1 })
    setNewBest(false)
    resetSave()
    setStatus('playing')
  }
  const resume = () => { sim.current.lastT = null; setStatus('playing') }

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

      <div className="relative rounded-2xl overflow-hidden" style={{ border: CARD_BORDER, height: 'clamp(450px, calc(100svh - 230px), 840px)', minHeight: 430, background: surfaceBg('field') }}>
        <canvas
          ref={canvasRef}
          onPointerMove={onMove}
          onPointerDown={onMove}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: status === 'playing' ? 'none' : 'default' }}
        />

        {status === 'playing' && (
          <ArcadeHud
            score={hud.score} scorePrefix="$" scoreLabel="CLEARED" best={best}
            status={`Month ${hud.wave}`}
            lives={hud.lives}
            hint="Move with finger / mouse · ← → or A-D · fire is automatic"
            onPause={() => setStatus('paused')}
          />
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.55)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="text-4xl mb-1">👾</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Expense Invaders</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>
                Every row is one of your spending categories — the more you spent, the more armor its invaders carry.
              </p>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Move with your finger or mouse (auto-fire). Clear the board before the expenses reach your wallet.
              </p>
              <button onClick={start} disabled={loading} className={`mt-4 ${pillGreen}`} style={{ background: loading ? '#9ca3af' : GREEN }}>
                {loading ? 'Loading…' : 'Start blasting'}
              </button>
            </div>
          </div>
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.6)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused 🥑</div>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(11,18,32,0.6)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Expenses reached your wallet!</div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>Spending cleared</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.score}</div>
              {newBest && (
                <div className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best! 🥑</div>
              )}
              <div className="mt-2 text-sm" style={{ color: BODY }}>Reached month <span className="font-display font-extrabold" style={{ color: INK }}>{hud.wave}</span></div>
              <SaveScoreLine res={saveRes} />
              <button onClick={start} className={`mt-4 ${pillGreen}`} style={{ background: GREEN }}>Play again</button>
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
