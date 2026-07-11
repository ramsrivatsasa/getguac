'use client'
// Guac Drop — Cut-the-Rope-style physics puzzle, GetGuac edition. Your paycheck
// (an avocado) hangs from ropes; swipe to cut them so it swings and falls into
// the savings jar. Impulse-buy spike balls splat it. 12 hand-built levels,
// progress (levels + pretend dollars banked + sparkles) lives in localStorage.
import { useCallback, useEffect, useRef, useState } from 'react'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const LIGHT = '#f2fbf3'
const AMBER = '#D9A514'
const BORDER = '1px solid rgba(20,83,45,0.10)'
const KEY = 'gg-guacdrop-v1'

const W = 400, H = 500            // logical canvas, CSS-scaled
const DT = 1 / 60, GRAV = 1400    // fixed step, gravity px/s²
const AVO_R = 16, AVO_MASS = 4, STAR_R = 22, JAR_HALF = 30

// 12 levels: ropes {a:[x,y] anchor, len, move?}, avo start, jar mouth, 3 star
// sparkles, hz spike balls [x,y,r], reward $. Difficulty: straight drop →
// swings → cut-order puzzles → hazard slaloms → moving-anchor finale.
const LEVELS = [
  { ropes: [{ a: [200, 70], len: 130 }], avo: [200, 200], jar: [200, 430], stars: [[200, 270], [200, 330], [200, 390]], hz: [], reward: 50 },
  { ropes: [{ a: [200, 70], len: 135 }], avo: [110, 170], jar: [300, 430], stars: [[215, 190], [240, 250], [275, 345]], hz: [], reward: 75 },
  { ropes: [{ a: [250, 70], len: 128 }], avo: [345, 155], jar: [110, 430], stars: [[240, 215], [182, 260], [138, 345]], hz: [[250, 340, 16]], reward: 100 },
  { ropes: [{ a: [90, 70], len: 136 }, { a: [310, 70], len: 136 }], avo: [200, 150], jar: [330, 430], stars: [[255, 215], [313, 248], [318, 345]], hz: [[200, 330, 14]], reward: 125 },
  { ropes: [{ a: [140, 70], len: 113 }], avo: [60, 150], jar: [295, 430], stars: [[148, 200], [230, 255], [287, 345]], hz: [[190, 370, 18]], reward: 150 },
  { ropes: [{ a: [80, 80], len: 94 }, { a: [230, 60], len: 141 }], avo: [130, 160], jar: [330, 430], stars: [[185, 205], [275, 240], [305, 360]], hz: [[230, 330, 16]], reward: 175 },
  { ropes: [{ a: [60, 70], len: 172 }, { a: [200, 50], len: 120 }, { a: [340, 70], len: 172 }], avo: [200, 170], jar: [80, 430], stars: [[155, 215], [130, 300], [100, 380]], hz: [[200, 350, 16], [320, 300, 14]], reward: 200 },
  { ropes: [{ a: [200, 60], len: 136 }], avo: [310, 140], jar: [200, 430], stars: [[265, 180], [250, 270], [215, 370]], hz: [[95, 310, 14], [305, 310, 14]], reward: 250 },
  { ropes: [{ a: [70, 70], len: 110 }, { a: [330, 70], len: 237 }], avo: [115, 170], jar: [240, 430], stars: [[150, 250], [190, 300], [210, 380]], hz: [[120, 360, 15], [355, 250, 14]], reward: 300 },
  { ropes: [{ a: [230, 60], len: 127 }], avo: [135, 145], jar: [320, 430], stars: [[180, 160], [270, 270], [310, 380]], hz: [[230, 250, 14], [200, 345, 15]], reward: 350 },
  { ropes: [{ a: [90, 60], len: 136 }, { a: [310, 60], len: 136 }], avo: [200, 140], jar: [110, 430], stars: [[180, 150], [138, 270], [110, 380]], hz: [[310, 300, 15], [160, 330, 14]], reward: 400 },
  { ropes: [{ a: [200, 70], len: 140, move: { amp: 90, sp: 1.5 } }], avo: [200, 210], jar: [130, 430], stars: [[250, 230], [140, 285], [130, 380]], hz: [[270, 340, 15], [60, 300, 14]], reward: 500 },
]

function makeSim(idx) {
  const L = LEVELS[idx]
  const [vx0, vy0] = L.avo
  const ropes = L.ropes.map((rd) => {
    const [ax, ay] = rd.a
    const n = Math.max(8, Math.min(12, Math.round(rd.len / 14)))
    const pts = []
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const x = ax + (vx0 - ax) * t, y = ay + (vy0 - ay) * t
      pts.push({ x, y, px: x, py: y })
    }
    return { a0: ax, ax, ay, rest: rd.len / (n - 1), pts, cutAt: -1, move: rd.move || null }
  })
  return {
    ropes,
    avo: { x: vx0, y: vy0, px: vx0, py: vy0 },
    stars: L.stars.map(([x, y]) => ({ x, y, got: false })),
    t: 0, acc: 0, trail: [], burst: [], events: [],
  }
}

// Mass-weighted distance constraint; ropes only pull (never push), so slack
// rope can bunch and swing naturally. wa/wb are inverse-mass weights.
function relax(a, b, rest, wa, wb) {
  const dx = b.x - a.x, dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 0.0001
  if (d <= rest) return
  const diff = (d - rest) / d / (wa + wb || 1)
  a.x += dx * diff * wa; a.y += dy * diff * wa
  b.x -= dx * diff * wb; b.y -= dy * diff * wb
}

function puff(sim, x, y, n, colors) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 220
    sim.burst.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.6 + Math.random() * 0.5, color: colors[i % colors.length] })
  }
}

function stepBurst(sim) {
  for (const b of sim.burst) { b.vx *= 0.985; b.vy = b.vy * 0.985 + 500 * DT; b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT }
  sim.burst = sim.burst.filter((b) => b.life > 0)
}

// One fixed verlet step. Returns null, or {end:'won'} / {end:'fail', why}.
function stepSim(sim, L) {
  sim.t += DT
  const avo = sim.avo
  const held = sim.ropes.some((r) => r.cutAt < 0)
  for (const r of sim.ropes) {
    if (r.move) r.ax = r.a0 + Math.sin(sim.t * r.move.sp) * r.move.amp
    for (const p of r.pts) {
      const vx = (p.x - p.px) * 0.99, vy = (p.y - p.py) * 0.99
      p.px = p.x; p.py = p.y
      p.x += vx; p.y += vy + GRAV * DT * DT
    }
  }
  const damp = held ? 0.999 : 0.995
  const vx = (avo.x - avo.px) * damp, vy = (avo.y - avo.py) * damp
  avo.px = avo.x; avo.py = avo.y
  avo.x += vx; avo.y += vy + GRAV * DT * DT
  // 3 relaxation passes: pin anchor, chain links (skipping the cut link), then
  // glue the avocado-side end to the avocado (heavier, moves 1/AVO_MASS as far).
  for (let it = 0; it < 3; it++) {
    for (const r of sim.ropes) {
      r.pts[0].x = r.ax; r.pts[0].y = r.ay
      const n = r.pts.length
      for (let i = 0; i < n - 1; i++) {
        if (i === r.cutAt) continue
        relax(r.pts[i], r.pts[i + 1], r.rest, i === 0 ? 0 : 1, 1)
      }
      relax(r.pts[n - 1], avo, 0, 1, 1 / AVO_MASS)
    }
  }
  const fallVy = avo.y - avo.py
  for (const s of sim.stars) {
    if (!s.got && Math.hypot(avo.x - s.x, avo.y - s.y) < STAR_R) {
      s.got = true; sim.events.push('star'); puff(sim, s.x, s.y, 8, [AMBER, '#fff3c4'])
    }
  }
  for (const [hx, hy, hr] of L.hz) {
    if (Math.hypot(avo.x - hx, avo.y - hy) < AVO_R + hr) return { end: 'fail', why: 'impulse' }
  }
  const [jx, jy] = L.jar
  if (fallVy > 0 && Math.abs(avo.x - jx) < JAR_HALF - 4 && avo.y > jy + 2 && avo.y < jy + 32) return { end: 'won' }
  if (!held && (avo.y > H + 50 || avo.x < -50 || avo.x > W + 50 || avo.y < -80)) return { end: 'fail', why: 'away' }
  return null
}

function cross3(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) }
function segsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = cross3(x3, y3, x4, y4, x1, y1), d2 = cross3(x3, y3, x4, y4, x2, y2)
  const d3 = cross3(x1, y1, x2, y2, x3, y3), d4 = cross3(x1, y1, x2, y2, x4, y4)
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

// Slice the swipe segment against every load-bearing rope link. The anchor
// side keeps dangling from its peg; the avocado side stays tied to the avocado.
function tryCut(sim, x0, y0, x1, y1) {
  for (const r of sim.ropes) {
    if (r.cutAt >= 0) continue
    for (let i = 0; i < r.pts.length - 1; i++) {
      const p = r.pts[i], q = r.pts[i + 1]
      if (segsCross(x0, y0, x1, y1, p.x, p.y, q.x, q.y)) {
        r.cutAt = i
        puff(sim, (p.x + q.x) / 2, (p.y + q.y) / 2, 5, ['#8a6f4d', '#c4ad8a'])
        break
      }
    }
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function draw(ctx, dpr, sim, L, now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#f8fcf5'); g.addColorStop(1, '#edf6ea')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineCap = 'round'
  const [jx, jy] = L.jar
  // jar body (back layer, so the avocado can fall "into" it)
  ctx.fillStyle = 'rgba(101,163,13,0.13)'
  rr(ctx, jx - 32, jy, 64, 58, 10); ctx.fill()
  ctx.strokeStyle = 'rgba(101,163,13,0.7)'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = GREEN; ctx.font = '800 20px "Bricolage Grotesque", system-ui'
  ctx.fillText('$', jx, jy + 36)
  // ropes + anchor pegs
  for (const r of sim.ropes) {
    ctx.strokeStyle = '#8a6f4d'; ctx.lineWidth = 3
    const n = r.pts.length
    const chains = r.cutAt < 0 ? [[0, n - 1, true]] : [[0, r.cutAt, false], [r.cutAt + 1, n - 1, true]]
    for (const [a, b, toAvo] of chains) {
      ctx.beginPath(); ctx.moveTo(r.pts[a].x, r.pts[a].y)
      for (let i = a + 1; i <= b; i++) ctx.lineTo(r.pts[i].x, r.pts[i].y)
      if (toAvo) ctx.lineTo(sim.avo.x, sim.avo.y)
      ctx.stroke()
    }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(r.ax, r.ay, 6, 0, 7); ctx.fill()
    ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(r.ax, r.ay, 2.5, 0, 7); ctx.fill()
  }
  // star sparkles
  ctx.font = '18px system-ui'
  sim.stars.forEach((s, i) => { if (!s.got) ctx.fillText('✨', s.x, s.y + Math.sin(now / 320 + i * 2) * 3) })
  // impulse-buy spike balls
  for (const [hx, hy, hr] of L.hz) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(now / 1400)
    ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3
    ctx.beginPath()
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (hr + 6), Math.sin(a) * (hr + 6)) }
    ctx.stroke()
    ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.arc(0, 0, hr, 0, 7); ctx.fill()
    ctx.restore()
    ctx.font = `${hr}px system-ui`; ctx.fillText('⚠️', hx, hy + 1)
    ctx.font = '18px system-ui'
  }
  // avocado, tilted by horizontal motion
  ctx.save(); ctx.translate(sim.avo.x, sim.avo.y); ctx.rotate((sim.avo.x - sim.avo.px) * 0.04)
  ctx.font = '30px system-ui'; ctx.fillText('🥑', 0, 1); ctx.restore()
  // jar mouth lip (front layer)
  ctx.strokeStyle = GREEN; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(jx - 32, jy); ctx.lineTo(jx + 32, jy); ctx.stroke()
  // fading swipe trail
  sim.trail = sim.trail.filter((p) => p.exp > now)
  for (let i = 1; i < sim.trail.length; i++) {
    const a = sim.trail[i - 1], b = sim.trail[i]
    ctx.strokeStyle = `rgba(101,163,13,${Math.max(0, Math.min(1, (b.exp - now) / 220))})`
    ctx.lineWidth = 3.5
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  // confetti-ish burst bits
  for (const b of sim.burst) {
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 1.6))
    ctx.fillStyle = b.color
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
}

const FRESH = { unlocked: 1, banked: 0, stars: {} }

export default function GuacDrop() {
  const canvasRef = useRef(null)
  const simRef = useRef(null)
  const statusRef = useRef('idle')
  const levelRef = useRef(0)
  const progRef = useRef(FRESH)
  const drag = useRef({ down: false, x: 0, y: 0, t: 0 })
  const [status, setStatus] = useState('idle') // idle | playing | won | failed
  const [level, setLevel] = useState(0)
  const [prog, setProg] = useState(FRESH)
  const [got, setGot] = useState(0)
  const [bankedNow, setBankedNow] = useState(0)
  const [failWhy, setFailWhy] = useState('away')

  const gotoLevel = useCallback((idx, play) => {
    levelRef.current = idx; setLevel(idx)
    simRef.current = makeSim(idx)
    setGot(0); setBankedNow(0)
    statusRef.current = play ? 'playing' : 'idle'
    setStatus(play ? 'playing' : 'idle')
  }, [])

  // Hydrate saved progress once, then land on the highest unlocked level.
  useEffect(() => {
    let p = FRESH
    try {
      const v = JSON.parse(localStorage.getItem(KEY))
      if (v && v.unlocked) p = { ...FRESH, ...v }
    } catch {}
    progRef.current = p; setProg(p)
    gotoLevel(Math.min(p.unlocked, LEVELS.length) - 1, false)
  }, [gotoLevel])

  // Simulation loop: accumulate real dt, step at 1/60s, cap 4 steps a frame.
  useEffect(() => {
    const cvs = canvasRef.current
    const dpr = Math.min(2.5, window.devicePixelRatio || 1)
    cvs.width = W * dpr; cvs.height = H * dpr
    const ctx = cvs.getContext('2d')
    let raf, last = 0
    const finish = (out) => {
      const sim = simRef.current, idx = levelRef.current, L = LEVELS[idx]
      if (out.end === 'won') {
        const a = sim.avo
        a.x = L.jar[0]; a.y = L.jar[1] + 28; a.px = a.x; a.py = a.y // settle in jar
        puff(sim, L.jar[0], L.jar[1], 42, [GREEN, AMBER, '#8FCE3B', '#e4f6d4'])
        const n = sim.stars.filter((s) => s.got).length
        const p = progRef.current
        const first = p.stars[idx] === undefined
        const next = {
          unlocked: Math.max(p.unlocked, Math.min(LEVELS.length, idx + 2)),
          banked: p.banked + (first ? L.reward : 0),
          stars: { ...p.stars, [idx]: Math.max(p.stars[idx] || 0, n) },
        }
        progRef.current = next; setProg(next)
        try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
        setBankedNow(first ? L.reward : 0)
        statusRef.current = 'won'; setStatus('won')
      } else {
        puff(sim, sim.avo.x, Math.min(sim.avo.y, H - 10), 26, ['#c2410c', AMBER, '#8a978d'])
        setFailWhy(out.why)
        statusRef.current = 'failed'; setStatus('failed')
      }
    }
    const loop = (now) => {
      const sim = simRef.current
      if (sim) {
        if (!last) last = now
        sim.acc += Math.min(0.1, (now - last) / 1000); last = now
        let steps = 0
        while (sim.acc >= DT && steps < 4) {
          sim.acc -= DT; steps++
          stepBurst(sim)
          if (statusRef.current === 'playing') {
            const out = stepSim(sim, LEVELS[levelRef.current])
            while (sim.events.length) { sim.events.pop(); setGot((v) => v + 1) }
            if (out) { finish(out); break }
          }
        }
        if (sim.acc >= DT) sim.acc = 0
        draw(ctx, dpr, sim, LEVELS[levelRef.current], now)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const toXY = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
  }
  const onDown = (e) => {
    e.preventDefault()
    canvasRef.current.setPointerCapture?.(e.pointerId)
    const p = toXY(e)
    drag.current = { down: true, x: p.x, y: p.y, t: e.timeStamp }
    if (simRef.current && statusRef.current === 'playing') simRef.current.trail.push({ x: p.x, y: p.y, exp: performance.now() + 220 })
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d.down || statusRef.current !== 'playing' || !simRef.current) return
    const p = toXY(e)
    const dist = Math.hypot(p.x - d.x, p.y - d.y)
    const ms = Math.max(1, e.timeStamp - d.t)
    simRef.current.trail.push({ x: p.x, y: p.y, exp: performance.now() + 220 })
    if (dist > 4 && dist / ms > 0.25) tryCut(simRef.current, d.x, d.y, p.x, p.y) // slow taps never cut
    drag.current = { down: true, x: p.x, y: p.y, t: e.timeStamp }
  }
  const onUp = () => { drag.current.down = false }

  const L = LEVELS[level]
  const cleared = (i) => prog.stars[i] !== undefined
  return (
    <div className="mx-auto w-full px-4 select-none" style={{ maxWidth: 560 }}>
      {/* HUD */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <div className="text-sm font-semibold" style={{ color: MUTED }}>
          Level {level + 1} · <span className="font-display font-extrabold" style={{ color: INK }}>${L.reward}</span> on the line
        </div>
        <div className="text-sm font-semibold" style={{ color: MUTED }}>
          ✨ <span className="font-display font-extrabold" style={{ color: INK }}>{got}/3</span>
          <span className="mx-2" style={{ color: FAINT }}>·</span>
          🫙 <span className="font-display font-extrabold" style={{ color: GREEN }}>${prog.banked}</span> banked
        </div>
      </div>
      {/* Level select */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {LEVELS.map((_, i) => {
          const open = i < prog.unlocked
          return (
            <button key={i} disabled={!open} onClick={() => gotoLevel(i, false)}
              className="w-8 h-8 rounded-full text-xs font-bold"
              style={{
                background: cleared(i) ? GREEN : open ? '#fff' : '#E7ECE8',
                color: cleared(i) ? '#fff' : open ? INK : '#9CA69E',
                border: open && !cleared(i) ? '1px solid rgba(20,83,45,0.25)' : '1px solid transparent',
                outline: i === level ? `2px solid ${INK}` : 'none', outlineOffset: 1,
                cursor: open ? 'pointer' : 'default',
              }}>{i + 1}</button>
          )
        })}
      </div>
      {/* Playfield */}
      <div className="relative rounded-2xl overflow-hidden" style={{ border: BORDER }}>
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ width: '100%', aspectRatio: '4 / 5', display: 'block', touchAction: 'none', cursor: 'crosshair' }} />
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(21,40,28,0.35)' }}>
            <div className="rounded-2xl p-5 text-center max-w-xs" style={{ background: '#fff', border: BORDER }}>
              <div className="font-display font-extrabold text-lg mb-2" style={{ color: INK }}>🥑 Guac Drop — Level {level + 1}</div>
              <p className="text-sm mb-1" style={{ color: BODY }}>Your paycheck hangs by a rope. Swipe to cut it loose.</p>
              <p className="text-sm mb-1" style={{ color: BODY }}>Swing it into the savings jar 🫙 — grab ✨ on the way.</p>
              <p className="text-sm mb-3" style={{ color: BODY }}>⚠️ Impulse buys splat it. Retries are free.</p>
              <button onClick={() => gotoLevel(level, true)} className="px-5 py-2 rounded-full font-bold text-white text-sm" style={{ background: GREEN }}>
                Drop the guac
              </button>
            </div>
          </div>
        )}
        {status === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(21,40,28,0.25)' }}>
            <div className="rounded-2xl p-5 text-center max-w-xs" style={{ background: LIGHT, border: BORDER }}>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>
                {bankedNow > 0 ? `+$${bankedNow} banked! 🫙` : 'Cleared again! 🥑'}
              </div>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                Sparkles {got}/3{bankedNow === 0 ? ' · this level already paid out' : ''}
              </p>
              <div className="flex justify-center gap-2 mt-3 flex-wrap">
                <button onClick={() => gotoLevel(level, true)} className="text-sm font-bold px-4 py-2 rounded-full border" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK, background: '#fff' }}>Retry</button>
                {level < LEVELS.length - 1 ? (
                  <button onClick={() => gotoLevel(level + 1, true)} className="text-sm font-bold px-4 py-2 rounded-full text-white" style={{ background: GREEN }}>Next level</button>
                ) : (
                  <div className="font-display text-sm font-bold px-4 py-2 rounded-full text-white" style={{ background: AMBER }}>All 12 dropped — ${prog.banked} banked</div>
                )}
              </div>
            </div>
          </div>
        )}
        {status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(21,40,28,0.25)' }}>
            <div className="rounded-2xl p-5 text-center max-w-xs" style={{ background: '#fef3f2', border: BORDER }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>
                {failWhy === 'impulse' ? 'An impulse buy ate your paycheck ⚠️' : 'Your paycheck rolled away 💸'}
              </div>
              <p className="text-sm mt-1" style={{ color: BODY }}>
                {failWhy === 'impulse'
                  ? 'Swing wide of the spiky stuff — it always looks smaller than it costs.'
                  : 'Money with no plan wanders off. Aim for the jar.'}
              </p>
              <button onClick={() => gotoLevel(level, true)} className="mt-3 text-sm font-bold px-5 py-2 rounded-full text-white" style={{ background: GREEN }}>
                Retry — it&apos;s free
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-center mt-3" style={{ color: FAINT }}>
        Cut every rope between the paycheck and the jar — order and timing matter.
        Dollars banked here are pretend; the habit is real.
      </p>
    </div>
  )
}
