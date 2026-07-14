'use client'
// Guac Nitro Run — lane-dodging street racer. Gun the avocado car down an
// endless highway, swerve between three lanes to dodge traffic, scoop up the
// cash, and hold your nerve as the speed climbs. One crash ends the run.
// Sim in refs + rAF; React state only for HUD/overlays. Arrows / A-D / swipe /
// on-screen buttons all steer.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, drawGuacAvocado } from './arcadeKit'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const BEST_KEY = 'gg-nitro-best-v1'
const LANES = 3
const TRAFFIC_COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#db2777']

const freshSim = () => ({
  lane: 1, carX: 0, cars: [], coins: [], dash: 0,
  speed: 320, dist: 0, cash: 0, spawnIn: 0, coinIn: 40, over: false, hitFlash: 0, lastT: null,
})

export default function GuacNitroRun() {
  const canvasRef = useRef(null)
  const sim = useRef(freshSim())
  const sizeRef = useRef({ w: 480, h: 640 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const rafRef = useRef(0)
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ dist: 0, cash: 0, speed: 0 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const { saveRes, save, resetSave } = useScoreSaver('nitro')

  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  // road geometry
  const road = useCallback(() => {
    const { w, h } = sizeRef.current
    const rw = Math.min(w * 0.9, 440)
    const left = (w - rw) / 2
    return { left, rw, laneW: rw / LANES, h }
  }, [])
  const laneX = useCallback((i) => { const r = road(); return r.left + r.laneW * (i + 0.5) }, [road])

  useEffect(() => {
    try { const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10); if (v > 0) { bestRef.current = v; setBest(v) } } catch {}
  }, [])

  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const fit = () => {
      const box = cvs.parentElement.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cvs.width = Math.round(box.width * dpr); cvs.height = Math.round(box.height * dpr)
      cvs.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: box.width, h: box.height }
      sim.current.carX = laneX(sim.current.lane)
    }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(cvs.parentElement)
    return () => ro.disconnect()
  }, [laneX])

  const move = useCallback((dir) => {
    const s = sim.current
    if (statusRef.current !== 'playing') return
    s.lane = Math.max(0, Math.min(LANES - 1, s.lane + dir))
  }, [])

  useEffect(() => {
    const kd = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') move(-1)
      if (e.key === 'ArrowRight' || e.key === 'd') move(1)
    }
    const blur = () => { if (statusRef.current === 'playing') setStatus('paused') }
    const vis = () => { if (document.hidden) blur() }
    window.addEventListener('keydown', kd)
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', vis) }
  }, [move, setStatus])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    const CAR_H = () => Math.min(96, road().laneW * 1.15)
    const CAR_W = () => road().laneW * 0.58

    const syncHud = () => { const s = sim.current; setHud({ dist: Math.round(s.dist / 10), cash: s.cash, speed: Math.round(s.speed / 10) }) }

    const endGame = () => {
      const s = sim.current; s.over = true; setStatus('over')
      const score = s.cash + Math.round(s.dist / 10)
      save(score, null)
      if (score > bestRef.current) { bestRef.current = score; setBest(score); setNewBest(true); try { localStorage.setItem(BEST_KEY, String(score)) } catch {} }
    }

    const update = (s, dt, w, h) => {
      const r = road(); const carH = CAR_H(), carW = CAR_W()
      s.speed = Math.min(760, s.speed + 9 * dt)
      s.dist += s.speed * dt
      s.dash = (s.dash + s.speed * dt) % 60
      // steer toward lane
      const tx = laneX(s.lane)
      s.carX += (tx - s.carX) * Math.min(1, dt * 14)
      const carY = h - carH - 28

      // spawn traffic — never block all lanes at once
      s.spawnIn -= dt
      if (s.spawnIn <= 0) {
        const lane = Math.floor(Math.random() * LANES)
        s.cars.push({ lane, y: -carH, color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)], vy: s.speed * (0.45 + Math.random() * 0.2) })
        s.spawnIn = Math.max(0.42, 1.05 - s.dist * 0.00002) * (0.7 + Math.random() * 0.7)
      }
      s.coinIn -= dt
      if (s.coinIn <= 0) { s.coins.push({ lane: Math.floor(Math.random() * LANES), y: -20 }); s.coinIn = 0.6 + Math.random() * 0.8 }

      for (const c of s.cars) c.y += (s.speed - c.vy) * dt
      for (const c of s.coins) c.y += s.speed * dt
      s.cars = s.cars.filter((c) => c.y < h + carH)
      s.coins = s.coins.filter((c) => c.y < h + 30 && !c.taken)

      // collisions
      for (const c of s.cars) {
        const cx = laneX(c.lane)
        if (Math.abs(cx - s.carX) < carW * 0.8 && Math.abs(c.y - carY) < carH * 0.86) { s.hitFlash = 1; endGame(); return }
      }
      for (const c of s.coins) {
        if (c.taken) continue
        const cx = laneX(c.lane)
        if (Math.abs(cx - s.carX) < carW * 0.9 && Math.abs(c.y - carY) < carH * 0.7) { c.taken = true; s.cash += 5; syncHud() }
      }
      s.coins = s.coins.filter((c) => !c.taken)
      syncHud()
    }

    const rrPath = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h) }
    const drawCar = (x, y, ww, hh, color, isPlayer) => {
      ctx.save(); ctx.translate(x, y)
      const front = isPlayer ? -1 : 1 // player faces up (-y); traffic faces down (+y)
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(1, 2, ww * 0.5, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill()
      // wheels — dark rounded rects poking out both sides
      ctx.fillStyle = '#0f172a'
      const tw = ww * 0.15, th = hh * 0.22, ax = ww * 0.5 - tw * 0.3, ay = hh * 0.27
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { rrPath(sx * ax - tw / 2, sy * ay - th / 2, tw, th, 3); ctx.fill() }
      // body (a touch narrower than the wheels so they show)
      rrPath(-ww * 0.44, -hh / 2, ww * 0.88, hh, ww * 0.24)
      ctx.fillStyle = color; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke()
      // hood/trunk highlight panel down the middle
      ctx.fillStyle = 'rgba(255,255,255,0.13)'; rrPath(-ww * 0.3, -hh * 0.44, ww * 0.6, hh * 0.88, ww * 0.14); ctx.fill()
      // windshield (front) + rear window
      ctx.fillStyle = '#bae6fd'; rrPath(-ww * 0.27, front < 0 ? -hh * 0.36 : hh * 0.14, ww * 0.54, hh * 0.22, 4); ctx.fill()
      ctx.fillStyle = '#93c5fd'; rrPath(-ww * 0.23, front < 0 ? hh * 0.16 : -hh * 0.34, ww * 0.46, hh * 0.15, 4); ctx.fill()
      // headlights (front, pale) + taillights (rear, red)
      ctx.fillStyle = '#fef08a'
      ctx.beginPath(); ctx.arc(-ww * 0.3, front * hh * 0.46, ww * 0.07, 0, Math.PI * 2); ctx.arc(ww * 0.3, front * hh * 0.46, ww * 0.07, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#f87171'
      ctx.beginPath(); ctx.arc(-ww * 0.3, -front * hh * 0.46, ww * 0.055, 0, Math.PI * 2); ctx.arc(ww * 0.3, -front * hh * 0.46, ww * 0.055, 0, Math.PI * 2); ctx.fill()
      // player: the GetGuac mascot at the wheel
      if (isPlayer) drawGuacAvocado(ctx, 0, -hh * 0.14, ww * 0.19)
      ctx.restore()
    }

    const render = (s) => {
      const { w, h } = sizeRef.current
      const r = road()
      // grass
      ctx.fillStyle = '#4d7c0f'; ctx.fillRect(0, 0, w, h)
      // road
      ctx.fillStyle = '#374151'; ctx.fillRect(r.left, 0, r.rw, h)
      // shoulders
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(r.left - 4, 0, 5, h); ctx.fillRect(r.left + r.rw - 1, 0, 5, h)
      // lane dashes
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.setLineDash([26, 34]); ctx.lineDashOffset = -s.dash
      for (let i = 1; i < LANES; i++) { const x = r.left + r.laneW * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      ctx.setLineDash([])
      // coins
      for (const c of s.coins) {
        if (c.taken) continue
        const cx = laneX(c.lane)
        const cg = ctx.createRadialGradient(cx - 3, c.y - 3, 2, cx, c.y, 12)
        cg.addColorStop(0, '#fef3c7'); cg.addColorStop(0.5, '#fbbf24'); cg.addColorStop(1, '#b45309')
        ctx.beginPath(); ctx.arc(cx, c.y, 12, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill()
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.fillStyle = '#7c2d12'; ctx.font = "800 13px 'Plus Jakarta Sans', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', cx, c.y + 1)
      }
      const carH = CAR_H(), carW = CAR_W()
      // traffic
      for (const c of s.cars) drawCar(laneX(c.lane), c.y, carW, carH, c.color, false)
      // player
      drawCar(s.carX, h - carH - 28, carW, carH, '#ef4444', true)
      // crash flash
      if (s.hitFlash > 0) { ctx.fillStyle = `rgba(225,29,72,${0.4 * s.hitFlash})`; ctx.fillRect(0, 0, w, h); s.hitFlash = Math.max(0, s.hitFlash - 0.02) }
    }

    const loop = (t) => {
      const s = sim.current
      const realMs = Math.min(46, s.lastT == null ? 16 : t - s.lastT)
      s.lastT = t
      const dt = realMs / 1000
      const { w, h } = sizeRef.current
      if (statusRef.current === 'playing') update(s, dt, w, h)
      render(s)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setStatus, save, road, laneX])

  const start = () => {
    const s = freshSim(); s.carX = laneX(1); sim.current = s
    setHud({ dist: 0, cash: 0, speed: 0 }); setNewBest(false); resetSave()
    setStatus('playing')
  }
  const resume = () => { sim.current.lastT = null; setStatus('playing') }

  // swipe steering
  const touchX = useRef(null)
  const onDown = (e) => { touchX.current = e.clientX }
  const onUp = (e) => {
    if (touchX.current == null) return
    const dx = e.clientX - touchX.current
    if (Math.abs(dx) > 24) move(dx > 0 ? 1 : -1)
    else { // tap left/right half to steer
      const rect = canvasRef.current.getBoundingClientRect()
      move(e.clientX - rect.left < rect.width / 2 ? -1 : 1)
    }
    touchX.current = null
  }

  const overlay = 'absolute inset-0 flex items-center justify-center p-4'
  const card = 'rounded-2xl bg-white p-5 text-center w-full'
  const pill = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const btn = 'flex-1 py-4 rounded-2xl font-extrabold text-white text-xl select-none'

  return (
    <div className="mx-auto w-full select-none">
      <div className="flex items-end justify-between mb-3 px-1">
        <div><div className="text-[11px] font-semibold" style={{ color: MUTED }}>Cash</div><div className="font-display font-extrabold text-2xl leading-none" style={{ color: GREEN }}>${hud.cash}</div></div>
        <div><div className="text-[11px] font-semibold" style={{ color: MUTED }}>Distance</div><div className="font-display font-extrabold text-lg leading-none" style={{ color: INK }}>{hud.dist}m</div></div>
        <div><div className="text-[11px] font-semibold" style={{ color: MUTED }}>Speed</div><div className="font-display font-extrabold text-lg leading-none" style={{ color: AMBER }}>{hud.speed}</div></div>
        <div><div className="text-[11px] font-semibold" style={{ color: MUTED }}>Best</div><div className="font-display font-extrabold text-lg leading-none" style={{ color: INK }}>{best}</div></div>
      </div>

      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(430px, calc(100svh - 260px), 760px)', minHeight: 400, border: CARD_BORDER, background: '#4d7c0f' }}>
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerUp={onUp} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />
        {status === 'playing' && (
          <button onClick={() => setStatus('paused')} className="absolute top-2 right-2 text-xs font-bold px-3 py-1.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>⏸ Pause</button>
        )}
        {status === 'idle' && (
          <div className={overlay} style={{ background: 'rgba(15,23,42,0.55)' }}>
            <div className={card} style={{ border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-4xl mb-1">🏎️</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>Guac Nitro Run</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>Swerve between lanes to dodge traffic and scoop up the <b style={{ color: AMBER }}>$ cash</b>. The longer you last, the faster it gets.</p>
              <p className="text-sm mt-1" style={{ color: BODY }}>Steer with ← → / A-D, swipe, or the buttons. One crash and it&apos;s over.</p>
              <button onClick={start} className={`mt-4 ${pill}`} style={{ background: GREEN }}>Hit the gas</button>
            </div>
          </div>
        )}
        {status === 'paused' && (
          <div className={overlay} style={{ background: 'rgba(15,23,42,0.6)' }}>
            <div className={card} style={{ border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused ⏸</div>
              <button onClick={resume} className={`mt-3 ${pill}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}
        {status === 'over' && (
          <div className={overlay} style={{ background: 'rgba(15,23,42,0.6)' }}>
            <div className={card} style={{ border: CARD_BORDER, maxWidth: 400 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Crash! 💥</div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>You banked</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.cash}</div>
              <div className="mt-1 text-sm" style={{ color: BODY }}>ran <span className="font-display font-extrabold" style={{ color: INK }}>{hud.dist}m</span></div>
              {newBest && <div className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best! 🥑</div>}
              <SaveScoreLine res={saveRes} />
              <button onClick={start} className={`mt-4 ${pill}`} style={{ background: GREEN }}>Run again</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-3" style={{ visibility: status === 'playing' ? 'visible' : 'hidden' }}>
        <button className={btn} style={{ background: '#334155' }} onPointerDown={(e) => { e.preventDefault(); move(-1) }}>◄</button>
        <button className={btn} style={{ background: GREEN }} onPointerDown={(e) => { e.preventDefault(); move(1) }}>►</button>
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        ← → / A-D, swipe, or tap a side to change lanes. Grab coins, dodge cars, don&apos;t crash. Signed-in players earn +50 GuacMoney for their first game each day.
      </p>
    </div>
  )
}

// lighten a hex color a touch for the body gradient sheen
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0
  const g = Math.min(255, ((n >> 8) & 255) * f) | 0
  const b = Math.min(255, (n & 255) * f) | 0
  return `rgb(${r},${g},${b})`
}
