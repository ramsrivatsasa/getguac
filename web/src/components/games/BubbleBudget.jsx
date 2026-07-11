'use client'
// Bubble Budget — GetGuac arcade game. Expense bubbles float up; tap the red
// ⚠ waste to pop it and bank the dollars, spare the green ✓ essentials or
// lose one of three avocado lives. Pace ramps with time and every $250 saved.
// Whole sim lives in refs + rAF; React state is only the HUD/status layer.
import { useCallback, useEffect, useRef, useState } from 'react'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const ROSE_SOFT = '#fb7185'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const BEST_KEY = 'gg-bubbles-best-v1'

// [label, dollars, emoji]
const WASTE = [
  ['Daily latte', 6, '☕'], ['Late fee', 15, '⏰'], ['Unused gym', 39, '🏋️'],
  ['4th streaming app', 12, '📺'], ['Impulse gadget', 49, '🎧'], ['Bank fee', 35, '🏦'],
  ['Mystery box', 25, '📦'], ['Lottery tickets', 10, '🎟️'], ['Delivery upcharge', 9, '🛵'],
  ['Extended warranty', 29, '📄'], ['Duplicate subscription', 8, '🔁'], ['In-app gems', 20, '💎'],
  ['Parking fine', 45, '🚗'], ['Vending snacks', 4, '🍫'],
]
const ESSENTIAL = [
  ['Rent', 1200, '🏠'], ['Groceries', 85, '🛒'], ['Insurance', 110, '🛡️'],
  ['Electric bill', 60, '💡'], ['Medicine', 18, '💊'], ['Bus pass', 40, '🚌'],
  ['Water bill', 30, '🚿'], ['Phone plan', 45, '📱'],
]
const TIPS = [
  'Cancel one subscription you forgot about — most budgets quietly carry two.',
  'Late fees and bank fees are pure waste: autopay the minimum and they vanish.',
  'Impulse rule: anything over $25 waits 48 hours in the cart before you buy.',
  'A $6 daily latte is about $2,190 a year — brew-at-home weeks add up fast.',
  'Scan every receipt: a leak you can see is a leak you can plug.',
]

// Split long labels into two roughly even lines so they fit inside a bubble.
function wrapLabel(label) {
  if (label.length <= 11) return [label]
  const words = label.split(' ')
  if (words.length === 1) return [label]
  let cut = 1, bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length)
    if (d < bestDiff) { bestDiff = d; cut = i }
  }
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}

function spawnBubble(sim, w, h) {
  if (sim.bubbles.length >= 14) return
  const waste = Math.random() < 0.62
  const pool = waste ? WASTE : ESSENTIAL
  const [label, amt, emoji] = pool[Math.floor(Math.random() * pool.length)]
  const r = Math.max(40, Math.min(54, w * 0.095))
  const margin = r + 10
  const speed = Math.min(150, 46 + sim.elapsed * 0.9 + (sim.level - 1) * 7)
  sim.bubbles.push({
    label, amt, emoji, waste, r,
    baseX: margin + Math.random() * Math.max(1, w - margin * 2),
    x: 0, y: h + r + Math.random() * 40,
    vy: speed * (0.85 + Math.random() * 0.3),
    amp: 8 + Math.random() * 14,
    freq: 0.8 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    lines: wrapLabel(label),
  })
}

function drawBubble(ctx, b) {
  const { x, y, r } = b
  const rim = b.waste ? ROSE_SOFT : GREEN
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = b.waste ? 'rgba(255,241,242,0.94)' : 'rgba(242,251,243,0.95)'
  ctx.fill()
  ctx.lineWidth = 3; ctx.strokeStyle = rim; ctx.stroke()
  // soap-bubble shine
  ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.38, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `${Math.round(r * 0.42)}px system-ui, sans-serif`
  ctx.fillText(b.emoji, x, y - r * 0.42)
  ctx.fillStyle = BODY
  ctx.font = `600 ${Math.max(9, Math.round(r * 0.2))}px 'Plus Jakarta Sans', system-ui, sans-serif`
  const lh = Math.max(10, r * 0.22)
  b.lines.forEach((ln, i) => ctx.fillText(ln, x, y + (i - (b.lines.length - 1) / 2) * lh))
  ctx.fillStyle = b.waste ? ROSE : GREEN
  ctx.font = `800 ${Math.round(r * 0.3)}px 'Bricolage Grotesque', system-ui, sans-serif`
  ctx.fillText('$' + b.amt.toLocaleString(), x, y + r * 0.52)
  // colorblind-safe type badge (⚠ waste / ✓ essential) on top of the color rim
  const bx = x + r * 0.68, by = y - r * 0.68, br = Math.max(9, r * 0.21)
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2)
  ctx.fillStyle = rim; ctx.fill()
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${Math.round(br * 1.15)}px system-ui, sans-serif`
  ctx.fillText(b.waste ? '⚠' : '✓', bx, by + 1)
}

function drawParticle(ctx, p) {
  ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2.2))
  ctx.fillStyle = p.color
  if (p.txt) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = "800 17px 'Bricolage Grotesque', system-ui, sans-serif"
    ctx.fillText(p.txt, p.x, p.y)
  } else {
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function burst(sim, b) {
  const colors = b.waste ? [GREEN, AMBER, '#a3e635'] : [ROSE, ROSE_SOFT, '#fecdd3']
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140
    sim.parts.push({
      x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.5 + Math.random() * 0.25, size: 2.5 + Math.random() * 3,
      color: colors[i % 3],
    })
  }
}

const freshSim = () => ({ bubbles: [], parts: [], elapsed: 0, spawnT: 500, saved: 0, missed: 0, lives: 3, level: 1, flash: 0 })
const fmt = (n) => n.toLocaleString()

export default function BubbleBudget() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const playsRef = useRef(0)
  const toastTimer = useRef(null)
  const shakeTimer = useRef(null)

  const [status, setStatus] = useState('idle') // idle | playing | paused | over
  const [saved, setSaved] = useState(0)
  const [missed, setMissed] = useState(0)
  const [lives, setLives] = useState(3)
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [tipIdx, setTipIdx] = useState(0)
  const [toast, setToast] = useState('')
  const [shake, setShake] = useState(false)

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1600)
  }

  // ——— sim loop (refs only; setState calls happen on discrete events) ———
  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    for (const b of sim.bubbles) drawBubble(ctx, b)
    for (const p of sim.parts) drawParticle(ctx, p)
    if (sim.flash > 0) { // red screen-edge flash after popping an essential
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.7)
      g.addColorStop(0, 'rgba(225,29,72,0)')
      g.addColorStop(1, `rgba(225,29,72,${(0.55 * sim.flash).toFixed(3)})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
  }

  function step(sim, dt) {
    const { w, h } = sizeRef.current
    sim.elapsed += dt
    sim.flash = Math.max(0, sim.flash - dt * 2.6)
    // difficulty ramp: interval shrinks + occasional 2–3 bubble bursts
    sim.spawnT -= dt * 1000
    if (sim.spawnT <= 0) {
      const interval = Math.max(430, 1300 - sim.elapsed * 10 - (sim.level - 1) * 90)
      sim.spawnT = interval * (0.8 + Math.random() * 0.4)
      spawnBubble(sim, w, h)
      const burstP = Math.min(0.35, 0.06 + sim.elapsed * 0.004 + (sim.level - 1) * 0.03)
      if (Math.random() < burstP) {
        const extra = Math.random() < 0.35 ? 2 : 1
        for (let i = 0; i < extra; i++) spawnBubble(sim, w, h)
      }
    }
    for (let i = sim.bubbles.length - 1; i >= 0; i--) {
      const b = sim.bubbles[i]
      b.y -= b.vy * dt
      b.x = b.baseX + Math.sin(sim.elapsed * b.freq + b.phase) * b.amp
      if (b.y + b.r < -6) { // escaped off the top
        sim.bubbles.splice(i, 1)
        if (b.waste) { sim.missed += b.amt; setMissed(sim.missed) }
      }
    }
    for (let i = sim.parts.length - 1; i >= 0; i--) {
      const p = sim.parts[i]
      p.life -= dt
      if (p.life <= 0) { sim.parts.splice(i, 1); continue }
      p.x += (p.vx || 0) * dt
      p.y += p.vy * dt
      if (!p.txt) p.vy += 300 * dt // gravity on confetti dots only
    }
  }

  function loop(ts) {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    if (!sim) return
    const dt = Math.min(0.05, Math.max(0, (ts - lastRef.current) / 1000))
    lastRef.current = ts
    step(sim, dt)
    draw(sim)
    rafRef.current = requestAnimationFrame(loop)
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    if (sim.saved > bestRef.current) {
      bestRef.current = sim.saved
      setBest(sim.saved)
      setNewBest(true)
      try { localStorage.setItem(BEST_KEY, String(sim.saved)) } catch {}
    } else {
      setNewBest(false)
    }
    setTipIdx((playsRef.current - 1) % TIPS.length)
    setPhase('over')
    draw(sim)
  }

  const start = () => {
    simRef.current = freshSim()
    setSaved(0); setMissed(0); setLives(3)
    playsRef.current += 1
    setPhase('playing')
    lastRef.current = performance.now()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return
    cancelAnimationFrame(rafRef.current)
    statusRef.current = 'paused'
    setStatus('paused')
  }, [])

  const resume = () => {
    if (statusRef.current !== 'paused') return
    setPhase('playing')
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
  }

  // Tap / click (pointer events cover both mouse and touch)
  const onTap = (e) => {
    if (statusRef.current !== 'playing') return
    e.preventDefault()
    const sim = simRef.current
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left, py = e.clientY - rect.top
    for (let i = sim.bubbles.length - 1; i >= 0; i--) { // topmost-drawn first
      const b = sim.bubbles[i]
      const dx = px - b.x, dy = py - b.y
      if (dx * dx + dy * dy > (b.r + 8) * (b.r + 8)) continue
      sim.bubbles.splice(i, 1)
      burst(sim, b)
      if (b.waste) {
        sim.saved += b.amt
        setSaved(sim.saved)
        sim.parts.push({ txt: '+$' + b.amt, x: b.x, y: b.y, vy: -48, life: 0.9, color: GREEN })
        const lvl = 1 + Math.floor(sim.saved / 250)
        if (lvl > sim.level) { sim.level = lvl; showToast('Level up! 🥑') }
      } else {
        sim.lives -= 1
        setLives(sim.lives)
        sim.flash = 1
        sim.parts.push({ txt: 'Essential!', x: b.x, y: Math.max(20, b.y - b.r), vy: -40, life: 0.9, color: ROSE })
        setShake(true)
        clearTimeout(shakeTimer.current)
        shakeTimer.current = setTimeout(() => setShake(false), 450)
        if (sim.lives <= 0) endGame(sim)
      }
      break
    }
  }

  // Load best once
  useEffect(() => {
    try {
      const b = parseInt(localStorage.getItem(BEST_KEY), 10)
      if (Number.isFinite(b) && b > 0) { bestRef.current = b; setBest(b) }
    } catch {}
  }, [])

  // Canvas sizing with devicePixelRatio scaling; logic runs in CSS pixels
  useEffect(() => {
    const cvs = canvasRef.current, wrap = wrapRef.current
    if (!cvs || !wrap) return
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth, h = wrap.clientHeight
      sizeRef.current = { w, h }
      cvs.width = Math.round(w * dpr)
      cvs.height = Math.round(h * dpr)
      cvs.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      if (simRef.current && statusRef.current !== 'playing') draw(simRef.current)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pause when the tab blurs or hides
  useEffect(() => {
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [pause])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(toastTimer.current)
    clearTimeout(shakeTimer.current)
  }, [])

  return (
    <div className="mx-auto w-full px-4 select-none" style={{ maxWidth: 560 }}>
      <div
        ref={wrapRef}
        className={`relative overflow-hidden rounded-2xl ${shake ? 'ggb-shake' : ''}`}
        style={{ height: 'min(70vh, 620px)', background: '#f2fbf3', border: CARD_BORDER }}
      >
        <canvas ref={canvasRef} onPointerDown={onTap} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none', cursor: status === 'playing' ? 'crosshair' : 'default' }} />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: MUTED }}>Saved </span>
              <span className="font-display font-extrabold text-lg" style={{ color: GREEN }}>${fmt(saved)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: FAINT }}>Missed </span>
              <span className="font-display font-bold text-sm" style={{ color: MUTED }}>${fmt(missed)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-base" aria-label={`${lives} avocado lives left`}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ opacity: i < lives ? 1 : 0.18, filter: i < lives ? 'none' : 'grayscale(1)' }}>🥑</span>
              ))}
            </div>
            {status === 'playing' && (
              <button onClick={pause} className="text-xs font-bold px-3 py-1.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK, pointerEvents: 'auto' }}>⏸ Pause</button>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 text-sm font-bold px-4 py-2 rounded-full" style={{ background: INK, color: '#fff', pointerEvents: 'none' }}>{toast}</div>
        )}

        {/* Idle start overlay */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(242,251,243,0.9)' }}>
            <div className="rounded-2xl bg-white p-5 text-center w-full" style={{ border: CARD_BORDER, maxWidth: 340 }}>
              <div className="text-4xl mb-1">🥑</div>
              <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Bubble Budget</div>
              <p className="text-sm mb-1" style={{ color: BODY }}>
                Expense bubbles float up — tap the <b style={{ color: ROSE }}>red ⚠ waste</b> to pop it and bank the dollars.
              </p>
              <p className="text-sm mb-3" style={{ color: BODY }}>
                Leave the <b style={{ color: GREEN }}>green ✓ essentials</b> alone: popping one costs an avocado. Waste that slips past the top counts as missed.
              </p>
              {best > 0 && (
                <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best game: ${fmt(best)} saved</div>
              )}
              <button onClick={start} className="text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Start popping</button>
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {status === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(242,251,243,0.9)' }}>
            <div className="rounded-2xl bg-white p-5 text-center w-full" style={{ border: CARD_BORDER, maxWidth: 300 }}>
              <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
              <p className="text-xs mb-3" style={{ color: MUTED }}>${fmt(saved)} saved so far — the bubbles will wait.</p>
              <div className="flex justify-center gap-2">
                <button onClick={resume} className="text-sm font-bold px-5 py-2 rounded-full text-white" style={{ background: GREEN }}>Resume</button>
                <button onClick={() => setPhase('idle')} className="text-sm font-bold px-5 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>Quit</button>
              </div>
            </div>
          </div>
        )}

        {/* Game-over card */}
        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(242,251,243,0.9)' }}>
            <div className="rounded-2xl bg-white p-5 text-center w-full" style={{ border: CARD_BORDER, maxWidth: 340 }}>
              <div className="text-3xl mb-1">🥑💥</div>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Out of avocados!</div>
              <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>${fmt(saved)}</div>
              <div className="text-[11px] font-semibold" style={{ color: MUTED }}>waste popped &amp; saved</div>
              <div className="flex justify-center gap-8 mt-3">
                <div>
                  <div className="font-display font-extrabold text-lg" style={{ color: MUTED }}>${fmt(missed)}</div>
                  <div className="text-[11px]" style={{ color: FAINT }}>missed</div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>${fmt(best)}</div>
                  <div className="text-[11px]" style={{ color: FAINT }}>best saved</div>
                </div>
              </div>
              {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
              <p className="text-xs mt-3" style={{ color: BODY }}>💡 {TIPS[tipIdx]}</p>
              <button onClick={start} className="mt-4 text-sm font-bold px-6 py-2.5 rounded-full text-white" style={{ background: GREEN }}>Play again</button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Tap or click a bubble to pop it. Red ⚠ = waste worth killing · green ✓ = bills you actually need.
      </p>

      <style>{`
        .ggb-shake { animation: ggbshake .45s ease; }
        @keyframes ggbshake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-7px,2px)} 40%{transform:translate(7px,-2px)} 60%{transform:translate(-5px,1px)} 80%{transform:translate(5px,-1px)} }
      `}</style>
    </div>
  )
}
