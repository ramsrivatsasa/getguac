'use client'
// Guac Hill Climb — Hill-Climb-Racing-style physics driver, GetGuac edition.
// Drive the avocado buggy over rolling hills, grab cash and fuel, and go as far
// as you can without running dry or flipping. Gas + brake also tilt the buggy in
// mid-air for landings. Sim in refs + rAF; React state only for the HUD/overlays.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScoreSaver, SaveScoreLine, surfaceBg } from './arcadeKit'

const INK = '#15281C'
const BODY = '#3d4a42'
const MUTED = '#5C6B60'
const FAINT = '#8a978d'
const GREEN = '#65A30D'
const AMBER = '#D9A514'
const ROSE = '#E11D48'
const CARD_BORDER = '1px solid rgba(20,83,45,0.10)'
const DISPLAY = "'Bricolage Grotesque', 'Plus Jakarta Sans', ui-sans-serif, sans-serif"
const BODY_FONT = "'Outfit', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
const BEST_KEY = 'gg-climb-best-v1'

const GRAV = 1500
const WHEELBASE = 52
const CAR_SCALE = 1.55   // draw the vehicle chunky like the MSN hill-climb games
const CAR_H = 46         // sit height — tuned so the bigger wheels touch the ground
const MAX_SPEED = 520
const START_X = 140

// Rolling terrain: analytic sum of sines; amplitude grows slowly with distance.
function terrainH(x) {
  const amp = 24 + Math.min(78, x * 0.0038)
  return -Math.sin(x * 0.0052) * amp
    - Math.sin(x * 0.0129 + 1.2) * (amp * 0.5)
    - Math.sin(x * 0.0207 + 2.4) * (amp * 0.22)
}

const freshSim = (h) => ({
  x: START_X, y: (h * 0.64) + terrainH(START_X) - CAR_H, vy: 0,
  speed: 90, angle: 0, onGround: true, wheelSpin: 0,
  fuel: 1, money: 0, crashed: false, deadFor: 0,
  items: [], nextItemX: START_X + 260,
})

// ── The Guac garage — six GetGuac-branded rides the player can pick from.
// Each is drawn as canvas shapes (not emoji — those vanish in the Flutter
// WebView) so the money/avocado emblem stays visible. `style` swaps the
// silhouette; the colours + emblem give each bike its own money theme.
export const BIKES = [
  { id: 'cash-cruiser',  name: 'Cash Cruiser',  tag: 'Laid-back chopper',  style: 'chopper', body: '#ef4444', hi: '#f87171', lo: '#991b1b', tank: '#dc2626', seat: '#7f1d1d', emblem: 'cash' },
  { id: 'guac-classic',  name: 'Guac Classic',  tag: 'Vintage avo ride',   style: 'classic', body: '#22c55e', hi: '#4ade80', lo: '#15803d', tank: '#16a34a', seat: '#14532d', emblem: 'avo'  },
  { id: 'penny-chopper', name: 'Penny Chopper', tag: 'Copper coin cruiser', style: 'chopper', body: '#f97316', hi: '#fb923c', lo: '#9a3412', tank: '#ea580c', seat: '#7c2d12', emblem: 'coin' },
  { id: 'budget-blitz',  name: 'Budget Blitz',  tag: 'Aero sportbike',     style: 'sport',   body: '#3b82f6', hi: '#60a5fa', lo: '#1e40af', tank: '#2563eb', seat: '#1e293b', emblem: 'cash' },
  { id: 'nest-egg',      name: 'Nest-Egg Scoot', tag: 'Nippy step-through', style: 'scooter', body: '#facc15', hi: '#fde047', lo: '#a16207', tank: '#1f2937', seat: '#111827', emblem: 'coin' },
  { id: 'sidecar-saver', name: 'Sidecar Saver', tag: 'Bring a buddy',      style: 'sidecar', body: '#eab308', hi: '#fde047', lo: '#a16207', tank: '#ca8a04', seat: '#713f12', emblem: 'avo'  },
]
export const bikeById = (id) => BIKES.find((b) => b.id === id) || BIKES[0]

// Knobby off-road wheel. Lifted to module scope so the garage thumbnails and
// the in-game render share one painter (ctx passed in explicitly).
function drawWheel(ctx, wx, wy, r, spin) {
  ctx.save(); ctx.translate(wx, wy); ctx.rotate(spin)
  ctx.fillStyle = '#0b1220'
  for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate((i / 12) * Math.PI * 2); ctx.fillRect(-r * 0.15, -r - r * 0.12, r * 0.3, r * 0.28); ctx.restore() }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#1f2937'; ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.fillStyle = '#d1d5db'; ctx.fill()
  ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fillStyle = '#6b7280'; ctx.fill()
  ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2.5
  for (let i = 0; i < 5; i++) { ctx.rotate((Math.PI * 2) / 5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.52); ctx.stroke() }
  ctx.restore()
}

// Helmeted avocado rider — avocado-green dome, tinted visor facing travel,
// stem nub, chin-guard hint. `bob` nods the head as the wheels roll.
function drawGuacDriver(ctx, cx, cy, r, bob = 0) {
  ctx.save()
  ctx.translate(cx, cy + bob)
  ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = Math.max(1, r * 0.18); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(-r * 0.04, -r * 0.92); ctx.lineTo(r * 0.08, -r * 1.18); ctx.stroke()
  const hg = ctx.createRadialGradient(-r * 0.36, -r * 0.42, r * 0.1, 0, 0, r * 1.14)
  hg.addColorStop(0, '#4ade80'); hg.addColorStop(0.5, '#10b981'); hg.addColorStop(1, '#065f46')
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill()
  ctx.save()
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip()
  const vg = ctx.createLinearGradient(0, -r * 0.36, 0, r * 0.22)
  vg.addColorStop(0, '#bae6fd'); vg.addColorStop(0.5, '#38bdf8'); vg.addColorStop(1, '#0b1b2e')
  ctx.fillStyle = vg
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(-r * 0.05, -r * 0.34, r * 1.25, r * 0.52, r * 0.2)
  else ctx.rect(-r * 0.05, -r * 0.34, r * 1.25, r * 0.52)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(0.8, r * 0.09); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(r * 0.12, -r * 0.15); ctx.lineTo(r * 0.62, -r * 0.15); ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = '#065f46'; ctx.lineWidth = Math.max(1, r * 0.14); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, Math.PI * 0.12, Math.PI * 0.46); ctx.stroke()
  ctx.restore()
}

// Money/avocado emblem on the fuel tank — all canvas shapes (WebView-safe).
function drawEmblem(ctx, kind, x, y, r) {
  ctx.save(); ctx.translate(x, y)
  if (kind === 'avo') {
    ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.66, r * 0.9, 0, 0, Math.PI * 2); ctx.fillStyle = '#14532d'; ctx.fill()
    ctx.beginPath(); ctx.ellipse(0, r * 0.12, r * 0.44, r * 0.66, 0, 0, Math.PI * 2); ctx.fillStyle = '#a3e635'; ctx.fill()
    ctx.beginPath(); ctx.arc(0, r * 0.28, r * 0.28, 0, Math.PI * 2); ctx.fillStyle = '#7c4a1e'; ctx.fill()
  } else if (kind === 'coin') {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill()
    ctx.lineWidth = Math.max(1, r * 0.16); ctx.strokeStyle = '#b45309'; ctx.stroke()
    ctx.fillStyle = '#7c2d12'; ctx.font = `800 ${r}px ${BODY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, r * 0.06)
  } else { // cash — white $ on a rounded badge
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.45); ctx.fill() }
    else ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7)
    ctx.fillStyle = '#166534'; ctx.font = `800 ${r * 1.25}px ${BODY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, r * 0.08)
  }
  ctx.restore()
}

// Paint a bike from its spec at the local origin (wheels near y=18). Shared by
// the in-game render and the garage thumbnails. Built on the proven base bike
// shape; `style` adds the distinctive bits (long fork, fairing, sidecar…).
export function paintBike(ctx, spec, { wheelSpin = 0, bob = 0 } = {}) {
  const chopper = spec.style === 'chopper'
  const scooter = spec.style === 'scooter'
  const sport = spec.style === 'sport'
  const sidecar = spec.style === 'sidecar'
  const R = scooter ? 14 : 17
  const rear = -WHEELBASE / 2
  const frnt = chopper ? WHEELBASE / 2 + 12 : WHEELBASE / 2
  const wy = scooter ? 20 : 18

  // Sidecar — drawn first so the bike overlaps it.
  if (sidecar) {
    drawWheel(ctx, rear - 20, wy + 2, R * 0.82, wheelSpin)
    const sg = ctx.createLinearGradient(0, -8, 0, 12); sg.addColorStop(0, spec.hi); sg.addColorStop(1, spec.lo)
    ctx.fillStyle = sg; ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(rear - 34, -9, 32, 21, 6); else ctx.rect(rear - 34, -9, 32, 21)
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = spec.lo; ctx.stroke()
    drawEmblem(ctx, 'avo', rear - 18, -1, 8)
    ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rear - 4, 9); ctx.lineTo(rear + 4, 4); ctx.stroke()
  }

  // Wheels + fenders.
  drawWheel(ctx, rear, wy, R, wheelSpin)
  drawWheel(ctx, frnt, wy, R, wheelSpin)
  ctx.strokeStyle = spec.lo; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(rear, wy, R + 4, Math.PI * 1.15, Math.PI * 1.9); ctx.stroke()
  ctx.beginPath(); ctx.arc(frnt, wy, R + 4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke()

  // Scooter floorboard + leg shield.
  if (scooter) {
    ctx.fillStyle = spec.tank
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-20, 5, 34, 6, 3); ctx.fill() } else ctx.fillRect(-20, 5, 34, 6)
    ctx.beginPath(); ctx.moveTo(14, 7); ctx.lineTo(20, -16); ctx.lineTo(27, -16); ctx.lineTo(23, 7); ctx.closePath(); ctx.fill()
  }

  // Swingarm + front fork (choppers rake the fork way out front).
  ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(rear, wy); ctx.lineTo(-4, 2)
  if (chopper) { ctx.moveTo(6, -10); ctx.lineTo(frnt, wy) } else { ctx.moveTo(22, -8); ctx.lineTo(frnt, wy) }
  ctx.stroke()

  // Frame.
  ctx.strokeStyle = spec.body; ctx.lineWidth = 6; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-14, -6); ctx.lineTo(8, -6); ctx.lineTo(-4, 2)
  ctx.moveTo(8, -6); ctx.lineTo(chopper ? 6 : 22, chopper ? -10 : -8); ctx.stroke()

  // Exhaust.
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(rear + 4, 12); ctx.stroke()

  // Seat + tank + tank emblem.
  ctx.fillStyle = spec.seat; ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(-22, -10, 20, 7, 3); else ctx.rect(-22, -10, 20, 7); ctx.fill()
  const tg = ctx.createLinearGradient(4, -12, 4, 0); tg.addColorStop(0, spec.hi); tg.addColorStop(1, spec.lo)
  ctx.fillStyle = tg; ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(-2, -11, 18, 11, 5); else ctx.rect(-2, -11, 18, 11); ctx.fill()
  drawEmblem(ctx, spec.emblem, 7, -5, 5)

  // Sport fairing + windscreen.
  if (sport) {
    ctx.fillStyle = spec.hi; ctx.globalAlpha = 0.92
    ctx.beginPath(); ctx.moveTo(16, -8); ctx.lineTo(30, -6); ctx.lineTo(35, 3); ctx.lineTo(18, 3); ctx.closePath(); ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(186,230,253,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, -6); ctx.lineTo(37, -13); ctx.stroke()
  }

  // Handlebars + headlight.
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'
  if (chopper) {
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(30, -24); ctx.lineTo(40, -24); ctx.stroke()
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(frnt - 4, -4, 4, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.beginPath(); ctx.moveTo(16, -6); ctx.lineTo(24, -16); ctx.lineTo(31, -17); ctx.stroke()
    ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(33, -16, 4, 0, Math.PI * 2); ctx.fill()
  }

  // Rider reaching for the bars.
  ctx.strokeStyle = spec.seat; ctx.lineWidth = 5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(chopper ? 30 : 25, chopper ? -22 : -15); ctx.stroke()
  drawGuacDriver(ctx, chopper ? -6 : -4, -23, 10, bob)
}

// Small static preview of a bike for the garage picker.
function BikeThumb({ spec }) {
  const ref = useRef(null)
  useEffect(() => {
    const cvs = ref.current; if (!cvs) return
    const W = cvs.clientWidth || 150, H = cvs.clientHeight || 64
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr)
    const ctx = cvs.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.save(); ctx.translate(W * 0.5, H * 0.62); ctx.scale(1.15, 1.15)
    paintBike(ctx, spec, { wheelSpin: 0, bob: 0 })
    ctx.restore()
  }, [spec])
  return <canvas ref={ref} className="block w-full" style={{ height: 64 }} aria-hidden />
}

export default function GuacHillClimb({ vehicle = 'buggy', gameId = 'climb', bestKey = BEST_KEY, title = 'Guac Hill Climb' } = {}) {
  const canvasRef = useRef(null)
  const sim = useRef(null)
  const sizeRef = useRef({ w: 800, h: 520 })
  const statusRef = useRef('idle')
  const bestRef = useRef(0)
  const gasRef = useRef(false)
  const brakeRef = useRef(false)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ money: 0, dist: 0, fuel: 1 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [bikeId, setBikeId] = useState(BIKES[0].id)
  const bikeSpecRef = useRef(BIKES[0])
  const { saveRes, save, resetSave } = useScoreSaver(gameId)

  const setStatus = useCallback((s) => { statusRef.current = s; setStatusState(s) }, [])

  // Remember the player's chosen ride across sessions (bike variant only).
  useEffect(() => {
    if (vehicle !== 'bike') return
    try { const v = localStorage.getItem('gg-bike-choice-v1'); if (v && BIKES.some((b) => b.id === v)) setBikeId(v) } catch {}
  }, [vehicle])
  useEffect(() => {
    bikeSpecRef.current = bikeById(bikeId)
    if (vehicle === 'bike') { try { localStorage.setItem('gg-bike-choice-v1', bikeId) } catch {} }
  }, [bikeId, vehicle])
  const groundY = useCallback((x) => (sizeRef.current.h * 0.64) + terrainH(x), [])

  useEffect(() => {
    try { const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10); if (v > 0) { bestRef.current = v; setBest(v) } } catch {}
  }, [])

  // canvas sizing
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return
    const fit = () => {
      const box = cvs.parentElement.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cvs.width = Math.round(box.width * dpr); cvs.height = Math.round(box.height * dpr)
      cvs.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: box.width, h: box.height }
    }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(cvs.parentElement)
    return () => ro.disconnect()
  }, [])

  // input
  useEffect(() => {
    const kd = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === ' ') { gasRef.current = true; e.preventDefault() }
      if (e.key === 'ArrowLeft' || e.key === 'a') brakeRef.current = true
    }
    const ku = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === ' ') gasRef.current = false
      if (e.key === 'ArrowLeft' || e.key === 'a') brakeRef.current = false
    }
    const blur = () => { if (statusRef.current === 'playing') setStatus('paused') }
    const vis = () => { if (document.hidden) blur() }
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', vis)
    }
  }, [setStatus])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')

    const syncHud = () => {
      const s = sim.current; if (!s) return
      setHud({ money: s.money, dist: Math.round(s.x / 10), fuel: s.fuel })
    }

    const endGame = () => {
      const s = sim.current
      setStatus('over')
      const score = s.money + Math.round(s.x / 10)
      save(score, null)
      if (score > bestRef.current) { bestRef.current = score; setBest(score); setNewBest(true); try { localStorage.setItem(BEST_KEY, String(score)) } catch {} }
    }

    const spawnAhead = (s, w) => {
      while (s.nextItemX < s.x + w + 200) {
        const x = s.nextItemX
        const fuelDrop = Math.random() < 0.22
        s.items.push({ x, kind: fuelDrop ? 'fuel' : 'coin', taken: false })
        s.nextItemX += 120 + Math.random() * 150
      }
    }

    const update = (s, dt, w, h) => {
      const gas = gasRef.current && s.fuel > 0
      const brake = brakeRef.current
      // horizontal speed: engine + slope + coast friction
      const slope = (groundY(s.x + 26) - groundY(s.x - 26)) / 52 // +downhill / -uphill
      if (gas) s.speed += 300 * dt
      else s.speed -= 90 * dt
      if (brake) s.speed -= 380 * dt
      s.speed += slope * 820 * dt
      s.speed = Math.max(-90, Math.min(MAX_SPEED, s.speed))
      s.x += s.speed * dt
      if (s.x < START_X) { s.x = START_X; s.speed = 0 }
      s.wheelSpin += s.speed * dt * 0.055

      // vertical: gravity + terrain contact
      s.vy += GRAV * dt
      s.y += s.vy * dt
      const targetY = groundY(s.x) - CAR_H
      if (s.y >= targetY) {
        s.y = targetY
        if (s.vy > 0) s.vy = 0
        s.onGround = true
        const gyF = groundY(s.x + WHEELBASE / 2), gyR = groundY(s.x - WHEELBASE / 2)
        const targetAngle = Math.atan2(gyF - gyR, WHEELBASE)
        s.angle += (targetAngle - s.angle) * Math.min(1, dt * 12)
      } else {
        s.onGround = false
        if (gas) s.angle -= 2.1 * dt      // nose up (backflip)
        if (brake) s.angle += 2.1 * dt    // nose down
      }

      // flip / stranded
      let a = s.angle % (Math.PI * 2)
      if (a > Math.PI) a -= Math.PI * 2
      if (a < -Math.PI) a += Math.PI * 2
      if (s.onGround && Math.abs(a) > 1.5) { s.crashed = true; endGame(); return }
      // fuel
      s.fuel = Math.max(0, s.fuel - dt * (gas ? 0.028 : 0.011))
      if (s.fuel <= 0 && Math.abs(s.speed) < 4) { endGame(); return }

      // items
      spawnAhead(s, w)
      for (const it of s.items) {
        if (it.taken) continue
        if (Math.abs(s.x - it.x) < 26) {
          it.taken = true
          if (it.kind === 'coin') { s.money += 5 }
          else { s.fuel = Math.min(1, s.fuel + 0.35) }
          syncHud()
        }
      }
      s.items = s.items.filter((it) => it.x > s.x - w)
      syncHud()
    }

    const drawBuggy = (s) => {
      const R = 18
      drawWheel(ctx, -WHEELBASE / 2, 18, R, s.wheelSpin)
      drawWheel(ctx, WHEELBASE / 2, 18, R, s.wheelSpin)
      // fender flares over the wheels (behind the body)
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 8; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(-WHEELBASE / 2, 18, R + 4, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke()
      ctx.beginPath(); ctx.arc(WHEELBASE / 2, 18, R + 4, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke()
      // angular red off-road buggy tub (open cockpit, sloped hood, pointed nose)
      const bg = ctx.createLinearGradient(0, -20, 0, 14)
      bg.addColorStop(0, '#f87171'); bg.addColorStop(0.55, '#ef4444'); bg.addColorStop(1, '#b91c1c')
      ctx.beginPath()
      ctx.moveTo(-42, 12); ctx.lineTo(-43, -4); ctx.lineTo(-26, -6); ctx.lineTo(-24, -19)
      ctx.lineTo(-6, -19); ctx.lineTo(-2, -6); ctx.lineTo(24, -9); ctx.lineTo(44, -1)
      ctx.lineTo(46, 6); ctx.lineTo(30, 12); ctx.closePath()
      ctx.fillStyle = bg; ctx.fill()
      ctx.lineWidth = 2; ctx.strokeStyle = '#991b1b'; ctx.stroke()
      // side trim
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-38, 4); ctx.lineTo(40, 4); ctx.stroke()
      // roll cage over the cockpit
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(-24, -19); ctx.lineTo(-20, -31); ctx.lineTo(-4, -31); ctx.lineTo(-2, -19); ctx.stroke()
      // driver — helmeted avocado in the cockpit, nodding as the wheels roll
      const bob = s.onGround ? Math.sin(s.wheelSpin * 2) * 0.6 : 0
      drawGuacDriver(ctx, -12, -20, 8.5, bob)
      // lights
      ctx.beginPath(); ctx.arc(44, 2, 3.4, 0, Math.PI * 2); ctx.fillStyle = '#fde047'; ctx.fill()
      ctx.beginPath(); ctx.arc(-41, -1, 2.6, 0, Math.PI * 2); ctx.fillStyle = '#fca5a5'; ctx.fill()
    }

    const drawCar = (s, sx) => {
      ctx.save()
      ctx.translate(sx, s.y)
      ctx.rotate(s.angle)
      ctx.scale(CAR_SCALE, CAR_SCALE)
      if (vehicle === 'bike') {
        const bobB = s.onGround ? Math.sin(s.wheelSpin * 2) * 0.7 : 0
        paintBike(ctx, bikeSpecRef.current, { wheelSpin: s.wheelSpin, bob: bobB })
      } else drawBuggy(s)
      ctx.restore()
    }

    const render = (s) => {
      const { w, h } = sizeRef.current
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#e0f2fe')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
      const camX = s.x - w * 0.32
      // distant mountain range (slow parallax, peaky ridge)
      {
        const mbase = h * 0.52
        ctx.beginPath(); ctx.moveTo(-20, h)
        for (let sxp = -20; sxp <= w + 20; sxp += 12) {
          const wx = camX * 0.16 + sxp
          const y = mbase - (Math.abs(Math.sin(wx * 0.0045)) * 92 + Math.abs(Math.sin(wx * 0.019 + 2)) * 34)
          ctx.lineTo(sxp, y)
        }
        ctx.lineTo(w + 20, h); ctx.closePath()
        const mg = ctx.createLinearGradient(0, mbase - 120, 0, mbase)
        mg.addColorStop(0, '#9aa8c6'); mg.addColorStop(1, '#7686a6')
        ctx.fillStyle = mg; ctx.fill()
      }
      // parallax hills
      for (let layer = 0; layer < 2; layer++) {
        const k = layer === 0 ? 0.3 : 0.55
        const base = h * (layer === 0 ? 0.5 : 0.58)
        ctx.beginPath(); ctx.moveTo(0, h)
        for (let sxp = 0; sxp <= w; sxp += 24) {
          const wx = (camX * k) + sxp
          const y = base - Math.sin(wx * 0.004 + layer) * (24 + layer * 14)
          ctx.lineTo(sxp, y)
        }
        ctx.lineTo(w, h); ctx.closePath()
        ctx.fillStyle = layer === 0 ? '#bfe3a8' : '#a7d68a'; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1
      }
      // terrain
      ctx.beginPath(); ctx.moveTo(0, h)
      for (let sxp = -20; sxp <= w + 20; sxp += 10) {
        const wx = camX + sxp
        ctx.lineTo(sxp, groundY(wx))
      }
      ctx.lineTo(w + 20, h); ctx.closePath()
      const tg = ctx.createLinearGradient(0, h * 0.4, 0, h)
      tg.addColorStop(0, '#6ba43c'); tg.addColorStop(0.12, '#5c8f33'); tg.addColorStop(1, '#3c5e22')
      ctx.fillStyle = tg; ctx.fill()
      // grass rim
      ctx.beginPath()
      for (let sxp = -20; sxp <= w + 20; sxp += 10) { const wx = camX + sxp; const y = groundY(wx); if (sxp < 0) ctx.moveTo(sxp, y); else ctx.lineTo(sxp, y) }
      ctx.strokeStyle = '#7cb342'; ctx.lineWidth = 4; ctx.stroke()

      // items
      for (const it of s.items) {
        if (it.taken) continue
        const ix = it.x - camX, iy = groundY(it.x) - 26
        if (ix < -20 || ix > w + 20) continue
        if (it.kind === 'coin') {
          const cg = ctx.createRadialGradient(ix - 3, iy - 3, 2, ix, iy, 11)
          cg.addColorStop(0, '#fef3c7'); cg.addColorStop(0.5, '#fbbf24'); cg.addColorStop(1, '#b45309')
          ctx.beginPath(); ctx.arc(ix, iy, 11, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill()
          ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5; ctx.stroke()
          ctx.fillStyle = '#7c2d12'; ctx.font = `800 12px ${BODY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', ix, iy + 1)
        } else {
          ctx.fillStyle = '#dc2626'
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(ix - 8, iy - 11, 16, 22, 3); ctx.fill() } else ctx.fillRect(ix - 8, iy - 11, 16, 22)
          ctx.fillStyle = '#fff'; ctx.font = `800 11px ${BODY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⛽', ix, iy + 1)
        }
      }
      // car
      drawCar(s, s.x - camX)
    }

    const loop = (t) => {
      const s = sim.current
      const realMs = Math.min(48, lastRef.current ? t - lastRef.current : 16)
      lastRef.current = t
      const dt = realMs / 1000
      const { w, h } = sizeRef.current
      if (statusRef.current === 'playing' && s) update(s, dt, w, h)
      if (s) render(s)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setStatus, save, groundY])

  const start = () => {
    sim.current = freshSim(sizeRef.current.h)
    setHud({ money: 0, dist: 0, fuel: 1 }); setNewBest(false); resetSave()
    lastRef.current = 0; gasRef.current = false; brakeRef.current = false
    setStatus('playing')
  }
  const resume = () => { lastRef.current = 0; setStatus('playing') }

  const overlay = 'absolute inset-0 flex items-center justify-center p-4'
  const card = 'rounded-2xl bg-white p-5 text-center w-full'
  const pill = 'text-sm font-bold px-6 py-2.5 rounded-full text-white'
  const pedal = 'flex-1 py-4 rounded-2xl font-extrabold text-white text-lg select-none'
  const emoji = vehicle === 'bike' ? '🏍️' : '🚙'
  const ride = vehicle === 'bike' ? 'motorbike' : 'buggy'

  return (
    <div className="mx-auto w-full select-none">
      {/* HUD */}
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Cash</div>
          <div className="font-display font-extrabold text-2xl leading-none" style={{ color: GREEN }}>${hud.money}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Distance</div>
          <div className="font-display font-extrabold text-lg leading-none" style={{ color: INK }}>{hud.dist}m</div>
        </div>
        <div className="flex-1 max-w-[160px] ml-4">
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Fuel</div>
          <div className="h-3 rounded-full overflow-hidden mt-1" style={{ background: '#e5e7eb' }}>
            <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${Math.round(hud.fuel * 100)}%`, background: hud.fuel < 0.25 ? ROSE : hud.fuel < 0.5 ? AMBER : GREEN }} />
          </div>
        </div>
        <div className="ml-4">
          <div className="text-[11px] font-semibold" style={{ color: MUTED }}>Best</div>
          <div className="font-display font-extrabold text-lg leading-none" style={{ color: INK }}>{best}</div>
        </div>
      </div>

      {/* Arena */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(430px, calc(100svh - 260px), 760px)', minHeight: 400, background: surfaceBg('sky') }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

        {/* pause button */}
        {status === 'playing' && (
          <button onClick={() => setStatus('paused')} className="absolute top-2 right-2 text-xs font-bold px-3 py-1.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>⏸ Pause</button>
        )}

        {status === 'idle' && vehicle === 'bike' && (
          <div className={overlay} style={{ background: 'rgba(8,30,45,0.55)' }}>
            <div className="rounded-2xl bg-white p-5 w-full" style={{ border: CARD_BORDER, maxWidth: 620 }}>
              <div className="text-center">
                <div className="text-3xl mb-1">🏍️</div>
                <div className="font-display font-extrabold text-xl" style={{ color: INK }}>{title}</div>
                <p className="text-sm mt-1" style={{ color: BODY }}>Pick your ride, then hit the hills for <b style={{ color: AMBER }}>$ cash</b> — don&apos;t run out of <b style={{ color: ROSE }}>fuel</b>.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BIKES.map((b) => {
                  const on = b.id === bikeId
                  return (
                    <button
                      key={b.id} type="button" onClick={() => setBikeId(b.id)}
                      aria-pressed={on}
                      className="rounded-xl p-2 text-left transition-transform duration-150 hover:-translate-y-0.5"
                      style={{ border: on ? `2px solid ${GREEN}` : '2px solid transparent', background: on ? '#f2fbf3' : '#f7faf6', boxShadow: on ? '0 6px 16px rgba(101,163,13,0.22)' : 'none' }}
                    >
                      <BikeThumb spec={b} />
                      <div className="mt-0.5 font-display font-extrabold text-[13px] leading-tight" style={{ color: INK }}>{b.name}</div>
                      <div className="text-[11px]" style={{ color: FAINT }}>{b.tag}</div>
                    </button>
                  )
                })}
              </div>
              <div className="text-center">
                <button onClick={start} className={`mt-4 ${pill}`} style={{ background: GREEN }}>Start driving</button>
              </div>
            </div>
          </div>
        )}

        {status === 'idle' && vehicle !== 'bike' && (
          <div className={overlay} style={{ background: 'rgba(8,30,45,0.5)' }}>
            <div className={card} style={{ border: CARD_BORDER, maxWidth: 400 }}>
              <div className="text-4xl mb-1">{emoji}</div>
              <div className="font-display font-extrabold text-xl" style={{ color: INK }}>{title}</div>
              <p className="text-sm mt-2" style={{ color: BODY }}>Ride the avocado {ride} over the hills. Grab <b style={{ color: AMBER }}>$ cash</b> and don&apos;t run out of <b style={{ color: ROSE }}>fuel</b>.</p>
              <p className="text-sm mt-1" style={{ color: BODY }}>Gas to go, brake to slow — in the air they tilt you for a clean landing. Flip over and it&apos;s done.</p>
              <button onClick={start} className={`mt-4 ${pill}`} style={{ background: GREEN }}>Start driving</button>
            </div>
          </div>
        )}

        {status === 'paused' && (
          <div className={overlay} style={{ background: 'rgba(8,30,45,0.55)' }}>
            <div className={card} style={{ border: CARD_BORDER, maxWidth: 320 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Paused ⏸</div>
              <button onClick={resume} className={`mt-3 ${pill}`} style={{ background: GREEN }}>Resume</button>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className={overlay} style={{ background: 'rgba(8,30,45,0.55)' }}>
            <div className={card} style={{ border: CARD_BORDER, maxWidth: 400 }}>
              <div className="font-display font-extrabold text-lg" style={{ color: INK }}>{sim.current?.crashed ? 'Flipped! 🙃' : 'Out of fuel! ⛽'}</div>
              <div className="text-[11px] font-semibold mt-3" style={{ color: MUTED }}>You banked</div>
              <div className="font-display font-extrabold text-4xl" style={{ color: GREEN }}>${hud.money}</div>
              <div className="mt-1 text-sm" style={{ color: BODY }}>reached <span className="font-display font-extrabold" style={{ color: INK }}>{hud.dist}m</span></div>
              {newBest && <div className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: AMBER }}>New best!</div>}
              <SaveScoreLine res={saveRes} />
              <div className="mt-4 flex items-center justify-center gap-2">
                <button onClick={start} className={pill} style={{ background: GREEN }}>Drive again</button>
                {vehicle === 'bike' && (
                  <button onClick={() => setStatus('idle')} className="text-sm font-bold px-5 py-2.5 rounded-full border bg-white" style={{ borderColor: 'rgba(20,83,45,0.18)', color: INK }}>🏍️ Change bike</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pedals (mobile + click) */}
      <div className="flex gap-3 mt-3" style={{ visibility: status === 'playing' ? 'visible' : 'hidden' }}>
        <button
          className={pedal} style={{ background: '#64748b' }}
          onPointerDown={(e) => { e.preventDefault(); brakeRef.current = true }}
          onPointerUp={() => { brakeRef.current = false }} onPointerLeave={() => { brakeRef.current = false }}
        >◄ Brake</button>
        <button
          className={pedal} style={{ background: GREEN }}
          onPointerDown={(e) => { e.preventDefault(); gasRef.current = true }}
          onPointerUp={() => { gasRef.current = false }} onPointerLeave={() => { gasRef.current = false }}
        >Gas ►</button>
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Gas ► and ◄ Brake (or → / ← arrows). In the air, gas leans you back and brake leans you forward. Signed-in players earn +50 GuacMoney for their first game each day.
      </p>
    </div>
  )
}
