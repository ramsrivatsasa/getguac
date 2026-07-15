'use client'
// Splurge Slicer — Fruit-Ninja for your own spending. Your REAL purchases get
// tossed up in arcs; swipe to slice the splurges (things you rated not-worth-it
// or discretionary wants) and bank the dollars as "Saved". Don't cut the
// essentials — rent, groceries, meds cost you an avocado.
//
// Data is pulled live from the signed-in player's receipts via usePlayerSpending
// (demo set when signed out). SCORE IS GAME-ONLY — slicing never changes the
// real rating or GuacScore. First finished round each day earns GuacMoney.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, ArcadeHud, surfaceBg } from './arcadeKit'
import { usePlayerSpending } from '../../lib/playerSpending'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const LIGHT = '#f2fbf3'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const BODY_FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const DISPLAY_FONT = "'Bricolage Grotesque', 'Plus Jakarta Sans', ui-sans-serif, sans-serif"

const GRAVITY = 680          // gentler arc — items hang longer, easier to read + slice
const MIN_CUT_SPEED = 0.45
const TRAIL_MS = 120
const COMBO_MS = 350
const BEST_KEY = 'gg-splurge-best-v1'

const freshSim = () => ({
  items: [], halves: [], floats: [], trail: [], cutIdx: 0,
  strokeCuts: [], comboBest: 0, down: false,
  saved: 0, missed: 0, lives: 3, elapsed: 0,
  spawnIn: 650, slowUntil: 0, vignette: 0, lastT: null,
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
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ saved: 0, missed: 0, lives: 3 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('splurge')
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
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', vis) }
  }, [setStatus])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf

    const syncHud = () => {
      const st = sim.current
      setHud({ saved: st.saved, missed: st.missed, lives: st.lives })
    }

    const endGame = () => {
      setStatus('over')
      const st = sim.current
      save(st.saved, null)
      if (st.saved > bestRef.current) {
        bestRef.current = st.saved
        setBest(st.saved)
        setNewBest(true)
        try { localStorage.setItem(BEST_KEY, String(st.saved)) } catch {}
      }
    }

    const pickPurchase = () => {
      const pool = dataRef.current?.purchases || []
      if (pool.length === 0) return { name: 'Impulse buy', price: 20, emoji: '🛍️', splurge: true }
      // Bias toward splurges ~70% so the game rewards good cuts more often.
      const splurges = pool.filter((p) => p.splurge)
      const essentials = pool.filter((p) => !p.splurge)
      const wantSplurge = Math.random() < 0.7 || essentials.length === 0
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

    const onSlice = (it, ang) => {
      const st = sim.current
      const now = performance.now()
      const { w, h } = sizeRef.current
      const imp = 130 + Math.random() * 80
      const px = -Math.sin(ang), py = Math.cos(ang)
      for (const s of [1, -1]) {
        st.halves.push({
          x: it.x, y: it.y, vx: it.vx + px * imp * s, vy: it.vy + py * imp * s,
          rot: ang + (s < 0 ? Math.PI : 0), spin: (Math.random() + 0.6) * 4 * s,
          r: it.r, rim: it.splurge ? ROSE : GREEN,
        })
      }
      if (it.splurge) {
        st.saved += it.amt
        st.floats.push({ x: it.x, y: it.y - it.r, text: `+$${it.amt}`, t0: now, life: 800, size: 18, color: GREEN })
        st.strokeCuts.push(now)
        const n = st.strokeCuts.filter((t) => now - t <= COMBO_MS).length
        if (n >= 3 && n > st.comboBest) {
          st.saved += 10 * n - (st.comboBest >= 3 ? 10 * st.comboBest : 0)
          st.floats.push({ x: w / 2, y: h * 0.3, text: `COMBO ×${n} — Guac frenzy! 🥑`, t0: now, life: 1300, size: 22, color: INK, banner: true })
          st.comboBest = n
        }
      } else {
        st.lives -= 1
        st.vignette = 1
        st.slowUntil = now + 300
        st.floats.push({ x: it.x, y: it.y - it.r, text: 'Need it! −1 🥑', t0: now, life: 900, size: 16, color: ROSE })
        if (st.lives <= 0) endGame()
      }
      syncHud()
    }

    const update = (st, realMs, now) => {
      const ts = now < st.slowUntil ? 0.3 : 1
      const dt = (realMs * ts) / 1000
      const { w, h } = sizeRef.current
      st.elapsed += dt
      st.spawnIn -= realMs * ts
      if (st.spawnIn <= 0) {
        const n = Math.min(4, 1 + Math.floor(Math.random() * Math.min(4, 1.4 + st.elapsed / 18)))
        for (let i = 0; i < n; i++) spawnItem(st)
        st.spawnIn = Math.max(650, 1500 - st.elapsed * 9) * (0.8 + Math.random() * 0.4)
      }
      for (let i = st.items.length - 1; i >= 0; i--) {
        const it = st.items[i]
        it.vy += GRAVITY * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.spin * dt
        if (it.vy > 0 && it.y > h + it.r + 40) {
          st.items.splice(i, 1)
          if (it.splurge) { st.missed += it.amt; syncHud() }
        }
      }
      for (let i = st.halves.length - 1; i >= 0; i--) {
        const hf = st.halves[i]
        hf.vy += GRAVITY * dt; hf.x += hf.vx * dt; hf.y += hf.vy * dt; hf.rot += hf.spin * dt
        if (hf.y > h + hf.r + 60) st.halves.splice(i, 1)
      }
      st.floats = st.floats.filter((f) => now - f.t0 < f.life)
      if (st.vignette > 0) st.vignette = Math.max(0, st.vignette - realMs / 400)

      const tr = st.trail
      while (st.down && st.cutIdx < tr.length - 1) {
        const a = tr[st.cutIdx], b = tr[st.cutIdx + 1]
        st.cutIdx++
        const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t)
        if (speed < MIN_CUT_SPEED) continue
        const ang = Math.atan2(b.y - a.y, b.x - a.x)
        for (let i = st.items.length - 1; i >= 0; i--) {
          const it = st.items[i]
          if (segHitsCircle(a.x, a.y, b.x, b.y, it.x, it.y, it.r)) {
            st.items.splice(i, 1)
            onSlice(it, ang)
          }
        }
      }
      while (tr.length && now - tr[0].t > TRAIL_MS) { tr.shift(); st.cutIdx = Math.max(0, st.cutIdx - 1) }
    }

    const drawChip = (it) => {
      const rim = it.splurge ? ROSE : GREEN
      ctx.save()
      ctx.translate(it.x, it.y)
      ctx.rotate(it.rot)
      ctx.beginPath(); ctx.arc(0, 0, it.r, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'; ctx.fill()
      ctx.lineWidth = 3.5; ctx.strokeStyle = rim; ctx.stroke()
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `${Math.round(it.r * 0.62)}px ${BODY_FONT}`
      ctx.fillText(it.e, 0, -it.r * 0.3)
      ctx.fillStyle = MUTED; ctx.font = `600 8px ${BODY_FONT}`
      ctx.fillText(it.label.length > 15 ? it.label.slice(0, 14) + '…' : it.label, 0, it.r * 0.32)
      ctx.fillStyle = INK; ctx.font = `800 12px ${DISPLAY_FONT}`
      ctx.fillText(`$${it.amt}`, 0, it.r * 0.66)
      ctx.restore()
      const bx = it.x + it.r * 0.72, by = it.y - it.r * 0.72
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2)
      ctx.fillStyle = rim; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = `800 10px ${BODY_FONT}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(it.splurge ? '⚠' : '✓', bx, by + 0.5)
    }

    const render = (st, now) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = LIGHT; ctx.fillRect(0, 0, w, h)
      for (const hf of st.halves) {
        ctx.save()
        ctx.translate(hf.x, hf.y); ctx.rotate(hf.rot)
        ctx.beginPath(); ctx.arc(0, 0, hf.r, 0, Math.PI); ctx.closePath()
        ctx.fillStyle = '#fff'; ctx.fill()
        ctx.lineWidth = 3; ctx.strokeStyle = hf.rim; ctx.stroke()
        ctx.restore()
      }
      for (const it of st.items) drawChip(it)
      const tr = st.trail
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (let i = 1; i < tr.length; i++) {
        const k = Math.max(0, 1 - (now - tr[i].t) / TRAIL_MS) * (i / tr.length)
        if (k <= 0) continue
        ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y)
        ctx.strokeStyle = `rgba(101,163,13,${0.35 * k})`; ctx.lineWidth = 3 + 12 * k; ctx.stroke()
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`; ctx.lineWidth = 1 + 6 * k; ctx.stroke()
      }
      for (const f of st.floats) {
        const age = now - f.t0
        ctx.globalAlpha = Math.max(0, 1 - age / f.life)
        ctx.fillStyle = f.color
        ctx.font = `800 ${f.size}px ${DISPLAY_FONT}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        if (f.banner) {
          const tw = ctx.measureText(f.text).width
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
          ctx.beginPath()
          if (ctx.roundRect) ctx.roundRect(f.x - tw / 2 - 14, f.y - age * 0.02 - 18, tw + 28, 36, 18)
          else ctx.rect(f.x - tw / 2 - 14, f.y - age * 0.02 - 18, tw + 28, 36)
          ctx.fill()
          ctx.fillStyle = f.color
        }
        ctx.fillText(f.text, f.x, f.y - age * (f.banner ? 0.02 : 0.05))
        ctx.globalAlpha = 1
      }
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
      render(st, now)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [setStatus, save])

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

  const start = () => {
    Object.assign(sim.current, freshSim())
    setHud({ saved: 0, missed: 0, lives: 3 })
    setNewBest(false)
    resetSave()
    setStatus('playing')
  }
  const resume = () => { sim.current.lastT = null; sim.current.down = false; setStatus('playing') }

  const overlayCard = 'rounded-2xl p-5 text-center w-full'
  const pillGreen = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const real = data?.hasData

  return (
    <div className="mx-auto w-full select-none">
      {/* Data source banner */}
      <div className="mb-3 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"
        style={{ background: real ? '#ecfdf3' : '#fff7ed', color: real ? '#065f46' : '#9a3412', border: CARD_BORDER }}>
        <span aria-hidden>{real ? '🟢' : '👀'}</span>
        {loading
          ? 'Loading your spending…'
          : real
            ? 'Playing with YOUR real purchases — slice the splurges, keep the essentials.'
            : <span><a href="/register" className="underline font-bold">Sign in</a> to play with your real spending. Showing a demo for now.</span>}
      </div>

      {/* Arena */}
      <div className="relative rounded-2xl overflow-hidden" style={{ border: CARD_BORDER, height: 'clamp(450px, calc(100svh - 230px), 840px)', minHeight: 430, background: surfaceBg('paper') }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: status === 'playing' ? 'crosshair' : 'default' }}
        />

        {status === 'playing' && (
          <ArcadeHud
            dark={false}
            score={hud.saved} scorePrefix="$" scoreLabel="SAVED" best={best}
            status={`Missed $${hud.missed}`} statusTone="neutral"
            lives={hud.lives}
            hint="Swipe to slice ⚠ splurges · let ✓ essentials fall"
            onPause={() => setStatus('paused')}
          />
        )}

        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(21,40,28,0.25)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="text-4xl mb-1">🔪</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Splurge Slicer</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>
                Your purchases fly up. Swipe to slice the <span className="font-bold" style={{ color: ROSE }}>⚠ splurges</span> and bank the dollars.
              </p>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Let the <span className="font-bold" style={{ color: GREEN }}>✓ essentials</span> fall — slicing a need costs a 🥑. Chain 3+ in one swipe for a Guac frenzy.
              </p>
              <button onClick={start} disabled={loading} className={`mt-4 ${pillGreen}`} style={{ background: loading ? '#9ca3af' : GREEN }}>
                {loading ? 'Loading…' : 'Start slicing'}
              </button>
            </div>
          </div>
        )}

        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(21,40,28,0.35)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused 🥑</div>
              <p className="text-sm mt-1" style={{ color: BODY }}>The blade waits for no one — except you.</p>
              <button onClick={resume} className={`mt-3 ${pillGreen}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(21,40,28,0.35)' }}>
            <div className={overlayCard} style={{ background: 'rgba(255,255,255,0.97)', border: CARD_BORDER, maxWidth: 380 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Out of avocados!</div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>You could have saved</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.saved}</div>
              {newBest && (
                <div className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best! 🥑</div>
              )}
              <div className="flex justify-center gap-6 mt-3 text-sm" style={{ color: BODY }}>
                <span>Missed <span className="font-display font-extrabold" style={{ color: AMBER }}>${hud.missed}</span></span>
                <span>Best <span className="font-display font-extrabold" style={{ color: INK }}>${best}</span></span>
              </div>
              <SaveScoreLine res={saveRes} />
              <button onClick={start} className={`mt-4 ${pillGreen}`} style={{ background: GREEN }}>Play again</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        ⚠ rose rim = a splurge, slice it · ✓ green rim = an essential, let it fall. This is a game — slicing never changes your real ratings or GuacScore.
      </p>
    </div>
  )
}
