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

const PICKUP_SPRITES = {
  groceries: [0, 0, 313, 313], medicine: [313, 0, 313, 313], rent: [626, 0, 313, 313], utility: [939, 0, 313, 313],
  transit: [0, 313, 313, 313], insurance: [313, 313, 313, 313], coffee: [626, 313, 313, 313], shopping: [939, 313, 313, 313],
  subscription: [0, 626, 313, 313], controller: [313, 626, 313, 313], sneaker: [626, 626, 313, 313], diamond: [939, 626, 313, 313],
  fuel: [0, 939, 313, 313], coin: [313, 939, 313, 313], boost: [626, 939, 313, 313], wrench: [939, 939, 313, 313],
}
const ESSENTIALS = ['groceries', 'medicine', 'rent', 'utility', 'transit', 'insurance']
const EXPENSES = ['coffee', 'shopping', 'subscription', 'controller', 'sneaker', 'diamond']

// Rolling terrain: analytic sum of sines; amplitude grows slowly with distance.
function terrainH(x) {
  const amp = 30 + Math.min(92, x * 0.0042)
  // Broad Softgames-style hill rhythm: long rounded climbs with enough flat
  // approach to plan acceleration, followed by clean launch crests.
  const broad = Math.sin(x * 0.00305)
  const rolling = Math.sin(x * 0.0061 + 1.1) * 0.19
  const crest = Math.sign(Math.sin(x * 0.00205 + .8)) * Math.pow(Math.abs(Math.sin(x * 0.00205 + .8)), 2.15) * 0.58
  const lateChallenge = x > 1500 ? Math.sin(x * 0.012 + .25) * Math.min(18, (x - 1500) * .003) : 0
  return -(broad + rolling + crest) * amp - lateChallenge
}

const freshSim = (h) => ({
  x: START_X, y: (h * 0.64) + terrainH(START_X) - 54, vy: 0,
  speed: 0, angle: 0, angularV: 0, onGround: true,
  wheelSpin: 0, frontWheelSpin: 0, rearWheelSpin: 0,
  frontTravel: 0, rearTravel: 0, frontTravelV: 0, rearTravelV: 0,
  fuel: 1, money: 0, crashed: false, deadFor: 0, suspension: 0, suspensionV: 0,
  smoke: [], smokeClock: 0,
  debris: [], debrisClock: 0,
  hudClock: 0,
  airRotation: 0, lastAirAngle: 0, stuntText: '', stuntLife: 0,
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
  const jumpRef = useRef(false)
  const pickupArtRef = useRef(null)
  const buggyArtRef = useRef(null)
  const backgroundArtRef = useRef(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const [status, setStatusState] = useState('idle')
  const [hud, setHud] = useState({ money: 0, dist: 0, fuel: 1 })
  const [best, setBest] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [inputVisual, setInputVisual] = useState({ gas: false, brake: false, jump: false })
  const [bikeId, setBikeId] = useState(BIKES[0].id)
  const bikeSpecRef = useRef(BIKES[0])
  const { saveRes, save, resetSave } = useScoreSaver(gameId)

  useEffect(() => {
    if (vehicle === 'bike') return
    const art = new Image()
    art.src = '/games/climb/pickup-atlas.png'
    art.onload = () => {
      const cutout = document.createElement('canvas')
      cutout.width = art.naturalWidth; cutout.height = art.naturalHeight
      const c = cutout.getContext('2d', { willReadFrequently: true })
      c.drawImage(art, 0, 0)
      const pixels = c.getImageData(0, 0, cutout.width, cutout.height)
      const data = pixels.data, seen = new Uint8Array(cutout.width * cutout.height), queue = []
      const clearBackground = (index) => {
        if (index < 0 || index >= seen.length || seen[index]) return
        const p = index * 4, r = data[p], g = data[p + 1], b = data[p + 2]
        if (Math.min(r, g, b) < 218 || Math.max(r, g, b) - Math.min(r, g, b) > 16) return
        seen[index] = 1; data[p + 3] = 0; queue.push(index)
      }
      for (let x = 0; x < cutout.width; x++) { clearBackground(x); clearBackground((cutout.height - 1) * cutout.width + x) }
      for (let y = 0; y < cutout.height; y++) { clearBackground(y * cutout.width); clearBackground(y * cutout.width + cutout.width - 1) }
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q], x = i % cutout.width
        if (x) clearBackground(i - 1); if (x < cutout.width - 1) clearBackground(i + 1)
        clearBackground(i - cutout.width); clearBackground(i + cutout.width)
      }
      c.putImageData(pixels, 0, 0); pickupArtRef.current = cutout
    }
  }, [vehicle])

  useEffect(() => {
    if (vehicle === 'bike') return
    const art = new Image(); art.src = '/games/climb/gameplay-background-3d.png'
    art.onload = () => { backgroundArtRef.current = art }
  }, [vehicle])

  useEffect(() => {
    if (vehicle === 'bike') return
    const art = new Image()
    art.src = '/games/climb/sport-sedan-clean.png'
    art.onload = () => {
      const cutout = document.createElement('canvas')
      cutout.width = art.naturalWidth; cutout.height = art.naturalHeight
      const c = cutout.getContext('2d', { willReadFrequently: true }); c.drawImage(art, 0, 0)
      const pixels = c.getImageData(0, 0, cutout.width, cutout.height), data = pixels.data
      const seen = new Uint8Array(cutout.width * cutout.height), queue = []
      const clearSky = (index) => {
        if (index < 0 || index >= seen.length || seen[index]) return
        const p = index * 4, r = data[p], g = data[p + 1], b = data[p + 2]
        if (!(r > 190 && g > 218 && b > 232 && b - r < 75)) return
        seen[index] = 1; data[p + 3] = 0; queue.push(index)
      }
      for (let x = 0; x < cutout.width; x++) { clearSky(x); clearSky((cutout.height - 1) * cutout.width + x) }
      for (let y = 0; y < cutout.height; y++) { clearSky(y * cutout.width); clearSky(y * cutout.width + cutout.width - 1) }
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q], x = i % cutout.width
        if (x) clearSky(i - 1); if (x < cutout.width - 1) clearSky(i + 1)
        clearSky(i - cutout.width); clearSky(i + cutout.width)
      }
      c.putImageData(pixels, 0, 0); buggyArtRef.current = cutout
    }
  }, [vehicle])

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
      if (e.key === 'ArrowRight' || e.key === 'd') { gasRef.current = true; setInputVisual((v) => ({ ...v, gas: true })); e.preventDefault() }
      if (e.key === 'ArrowLeft' || e.key === 'a') { brakeRef.current = true; setInputVisual((v) => ({ ...v, brake: true })); e.preventDefault() }
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !e.repeat) { jumpRef.current = true; setInputVisual((v) => ({ ...v, jump: true })); e.preventDefault() }
    }
    const ku = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'd') { gasRef.current = false; setInputVisual((v) => ({ ...v, gas: false })) }
      if (e.key === 'ArrowLeft' || e.key === 'a') { brakeRef.current = false; setInputVisual((v) => ({ ...v, brake: false })) }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') setInputVisual((v) => ({ ...v, jump: false }))
    }
    const blur = () => { gasRef.current = false; brakeRef.current = false; jumpRef.current = false; setInputVisual({ gas: false, brake: false, jump: false }) }
    const vis = () => { if (document.hidden) blur() }
    window.addEventListener('keydown', kd, { passive: false }); window.addEventListener('keyup', ku, { passive: false })
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
        const roll = Math.random()
        let kind = 'essential'
        let art = ESSENTIALS[Math.floor(Math.random() * ESSENTIALS.length)]
        let lift = 88 + Math.random() * 34
        if (roll < 0.34) {
          kind = 'expense'; art = EXPENSES[Math.floor(Math.random() * EXPENSES.length)]; lift = 34
        } else if (roll > 0.86) {
          kind = 'fuel'; art = 'fuel'; lift = 38
        } else if (roll > 0.78) {
          kind = 'boost'; art = 'boost'; lift = 82
        }
        s.items.push({ x, kind, art, lift, taken: false, bob: Math.random() * Math.PI * 2 })
        s.nextItemX += 285 + Math.random() * 210
      }
    }

    const update = (s, dt, w, h) => {
      const gas = gasRef.current && s.fuel > 0
      const brake = brakeRef.current
      // horizontal speed: engine + slope + coast friction
      const slope = (groundY(s.x + 26) - groundY(s.x - 26)) / 52 // +downhill / -uphill
      if (gas) s.speed += 560 * dt
      else if (!brake) {
        // Rolling resistance opposes the current direction instead of always
        // pulling left. Gravity below can therefore move a stationary car
        // downhill, or make it roll backward when it stalls on a climb.
        const rollingDrag = 24 * dt
        if (Math.abs(s.speed) <= rollingDrag) s.speed = 0
        else s.speed -= Math.sign(s.speed) * rollingDrag
      }
      if (brake) s.speed -= (s.speed > 5 ? 720 : 360) * dt
      // Component of gravity along the road surface. Positive screen slope is
      // downhill to the right; negative slope pulls the car backward.
      s.speed += slope * 520 * dt
      s.speed = Math.max(-90, Math.min(MAX_SPEED, s.speed))
      s.x += s.speed * dt
      if (s.x < START_X) { s.x = START_X; s.speed = 0 }
      // Rotate by actual travelled distance / rendered wheel radius. This keeps
      // the tread locked to the ground without skating or uneven stepping.
      const wheelStep = (s.speed * dt) / 29
      // The unpowered front wheel follows road speed. The driven rear wheel
      // spins slightly faster under throttle, like the reference hill racer.
      s.frontWheelSpin = (s.frontWheelSpin + wheelStep) % (Math.PI * 2)
      const rearSlip = gas && s.onGround ? 1.06 + Math.min(0.20, Math.abs(s.speed) / MAX_SPEED * 0.20) : 1
      s.rearWheelSpin = (s.rearWheelSpin + wheelStep * rearSlip) % (Math.PI * 2)
      s.wheelSpin = (s.frontWheelSpin + s.rearWheelSpin) * 0.5

      if (vehicle !== 'bike' && Math.abs(s.speed) > 8) {
        s.smokeClock -= dt
        if (s.smokeClock <= 0) {
          s.smokeClock = (gas ? 0.045 : 0.11) + Math.random() * 0.035
          const rearX = -92, rearY = 8
          const exhaustX = s.x + Math.cos(s.angle) * rearX - Math.sin(s.angle) * rearY
          const exhaustY = s.y + Math.sin(s.angle) * rearX + Math.cos(s.angle) * rearY
          s.smoke.push({ x: exhaustX, y: exhaustY, vx: -48 - Math.random() * 38, vy: -22 - Math.random() * 25, life: 0.9, maxLife: 0.9, size: 9 + Math.random() * 8, power: gas ? 1 : .58 })
        }
      }
      for (const p of s.smoke) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 5 * dt; p.life -= dt; p.size += 17 * dt }
      s.smoke = s.smoke.filter((p) => p.life > 0).slice(-28)
      if (vehicle !== 'bike' && gas && s.onGround && s.speed > 24) {
        s.debrisClock -= dt
        if (s.debrisClock <= 0) {
          s.debrisClock = 0.055 + Math.random() * .045
          const dx = s.x - 61, dy = groundY(dx) - 5
          s.debris.push({ x: dx, y: dy, vx: -55 - Math.random() * 75, vy: -75 - Math.random() * 90, life: .7, size: 2.5 + Math.random() * 4.5, spin: Math.random() * 6, spinV: -5 + Math.random() * 10 })
        }
      }
      for (const d of s.debris) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += GRAV * .38 * dt; d.life -= dt; d.spin += d.spinV * dt }
      s.debris = s.debris.filter((d) => d.life > 0).slice(-36)

      const wasGrounded = s.onGround
      if (jumpRef.current && s.onGround) {
        s.vy = -850
        s.onGround = false
        s.suspensionV = -145
        // Preserve the hill's rotational momentum at takeoff. This is what
        // lets crests naturally start a flip instead of producing a flat glide.
        s.angularV += slope * Math.min(4.8, Math.abs(s.speed) / 72)
      }
      jumpRef.current = false

      // Two-wheel suspension/contact model. Each axle probes the terrain and
      // pushes independently on the body, creating real pitch and rebound.
      s.vy += GRAV * dt
      s.y += s.vy * dt
      const contactHalf = vehicle === 'bike' ? WHEELBASE / 2 : 64
      const wheelRadius = vehicle === 'bike' ? 20 : 23
      const wheelDrop = vehicle === 'bike' ? 23 : 30
      const ca = Math.cos(s.angle), sa = Math.sin(s.angle)
      const axleContact = (offset) => {
        const wx = s.x + ca * offset - sa * wheelDrop
        const wy = s.y + sa * offset + ca * wheelDrop
        const gy = groundY(wx)
        const pointVy = s.vy + s.angularV * ca * offset
        return { offset, wx, wy, gy, pointVy, penetration: wy + wheelRadius - gy }
      }
      const rearContact = axleContact(-contactHalf)
      const frontContact = axleContact(contactHalf)
      const contacts = [rearContact, frontContact]
      const impact = Math.max(0, s.vy)
      let touching = false
      let deepest = 0
      for (const contact of contacts) {
        if (contact.penetration > -2.5) touching = true
        if (contact.penetration <= 0) continue
        deepest = Math.max(deepest, contact.penetration)
        const springAccel = -contact.penetration * 132 - Math.max(0, contact.pointVy) * 17
        s.vy += springAccel * dt
        s.angularV += springAccel * (contact.offset / 5200) * dt
      }
      // Small positional stabilization prevents tunnelling on hard landings;
      // spring forces still provide the visible rebound.
      if (deepest > 0) s.y -= Math.min(7, deepest * 0.42)
      s.onGround = touching && s.vy > -115
      const gyF = frontContact.gy, gyR = rearContact.gy
      const targetAngle = Math.atan2(gyF - gyR, contactHalf * 2)

      // Convert each real ground contact back into the car sprite's local
      // wheel coordinate. The wheel can now rise/fall inside its arch while
      // the heavier chassis visibly lags behind it.
      const visualScale = 1.65
      const localWheelTarget = (contact) => {
        const safeCos = Math.max(0.35, Math.abs(ca)) * Math.sign(ca || 1)
        const localY = (contact.gy - wheelRadius - s.y - sa * contact.offset) / (safeCos * visualScale)
        return Math.max(-13, Math.min(15, localY - 16))
      }
      const updateTravel = (key, vKey, target) => {
        // Lower damping is intentional: one or two diminishing oscillations
        // remain visible after a bump, like the reference suspension.
        s[vKey] += ((target - s[key]) * 52 - s[vKey] * 6.8) * dt
        s[key] += s[vKey] * dt
        s[key] = Math.max(-14, Math.min(16, s[key]))
      }
      const speedLoad = Math.min(1, Math.max(0, s.speed) / 310)
      const throttleTransfer = gas && s.onGround ? 2.5 + speedLoad * 4.8 : 0
      // Rear-drive weight transfer: the rear axle tucks upward while the
      // lightly loaded front axle extends away from the body.
      updateTravel('rearTravel', 'rearTravelV', localWheelTarget(rearContact) - throttleTransfer)
      updateTravel('frontTravel', 'frontTravelV', localWheelTarget(frontContact) + throttleTransfer * 0.82)

      // Couple axle motion into the sprung body. The average wheel compression
      // moves the chassis vertically; the front/rear difference also pitches
      // it. Body damping is deliberately slower than wheel damping so the car
      // follows with a visible secondary bounce rather than floating rigidly.
      const axleHeave = (s.rearTravel + s.frontTravel) * 0.58
      const axlePitch = (s.frontTravel - s.rearTravel) * 0.018
      s.suspensionV += ((-axleHeave - s.suspension) * 48 - s.suspensionV * 7.2) * dt
      s.angularV += axlePitch * dt * 11

      if (s.onGround) {
        if (!wasGrounded && impact > 140) {
          s.suspensionV -= Math.min(22, impact * 0.022)
          // The first tire to meet the hill compresses harder; the other axle
          // follows a moment later, producing the characteristic wheel wobble.
          if (frontContact.penetration > rearContact.penetration) {
            s.frontTravelV -= Math.min(112, impact * 0.24)
            s.rearTravelV += Math.min(46, impact * 0.09)
          } else {
            s.rearTravelV -= Math.min(112, impact * 0.24)
            s.frontTravelV += Math.min(46, impact * 0.09)
          }
        }
        if (!wasGrounded && impact > 210 && vehicle !== 'bike') {
          for (const side of [-1, 1]) for (let n = 0; n < 4; n++) {
            const dx = s.x + side * contactHalf
            s.debris.push({ x: dx, y: groundY(dx) - 4, vx: side * (18 + Math.random() * 55), vy: -65 - Math.random() * 105, life: .75, size: 3 + Math.random() * 5, spin: Math.random() * 6, spinV: -6 + Math.random() * 12 })
          }
        }
        if (!wasGrounded) {
          let landingDelta = s.angle - targetAngle
          landingDelta = Math.atan2(Math.sin(landingDelta), Math.cos(landingDelta))
          const flips = Math.floor((Math.abs(s.airRotation) + 0.35) / (Math.PI * 2))
          if (flips > 0 && Math.abs(landingDelta) < 0.72) {
            const bonus = flips * 100
            s.money += bonus; s.stuntText = `${flips > 1 ? `${flips}x ` : ''}FLIP +${bonus}`; s.stuntLife = 1.45
          } else if (Math.abs(landingDelta) > 1.8 && impact > 160) {
            s.crashed = true; endGame(); return
          }
        }
        // Tire forces do most of the pitch work; this mild stabilizer models
        // suspension geometry without locking the body to the slope.
        let pitchError = targetAngle - s.angle
        pitchError = Math.atan2(Math.sin(pitchError), Math.cos(pitchError))
        s.angularV += pitchError * 3.2 * dt
        // Rear-wheel engine torque unloads the front axle. At speed on an
        // uphill/crest this can become a wheelie and continue into a rollover.
        if (gas && rearContact.penetration > -1.5) {
          const frontUnloaded = frontContact.penetration < 1.5
          const rearBias = frontUnloaded ? 1.55 : 1
          const speedTorque = 1.35 + Math.min(4.2, Math.max(0, s.speed) / 92)
          const uphillBoost = slope < 0 ? Math.min(2.2, -slope * 5.5) : 0
          s.angularV -= rearBias * (speedTorque + uphillBoost) * dt
        }
        s.angularV *= Math.pow(0.975, dt * 60)
        s.angle += s.angularV * dt
      } else {
        s.onGround = false
        if (wasGrounded) {
          s.airRotation = 0; s.lastAirAngle = s.angle
          // Rear-wheel drive and crest speed both encourage the nose to rise.
          s.angularV += (slope * 4.2) - Math.min(2.25, Math.max(0, s.speed) / 205)
        }
        // Air controls apply angular acceleration, not an artificial direct
        // angle change. The car now carries momentum and can complete flips.
        if (gas) s.angularV -= 11.5 * dt
        if (brake) s.angularV += 12.4 * dt
        s.angularV = Math.max(-8.2, Math.min(8.2, s.angularV))
        s.angularV *= Math.pow(0.998, dt * 60)
        s.angle += s.angularV * dt
        let rotationStep = s.angle - s.lastAirAngle
        rotationStep = Math.atan2(Math.sin(rotationStep), Math.cos(rotationStep))
        s.airRotation += rotationStep; s.lastAirAngle = s.angle
      }
      if (s.stuntLife > 0) s.stuntLife -= dt

      // Residual body spring recenters after the axle-driven bounce.
      s.suspensionV += (-s.suspension * 28 - s.suspensionV * 4.5) * dt
      s.suspension += s.suspensionV * dt
      s.suspension = Math.max(-8.5, Math.min(9.5, s.suspension))

      // flip / stranded
      let a = s.angle % (Math.PI * 2)
      if (a > Math.PI) a -= Math.PI * 2
      if (a < -Math.PI) a += Math.PI * 2
      // Chassis/roof collision is separate from tire contact. Without this an
      // inverted car could hover on its center while both wheel probes missed.
      const chassisHalfW = vehicle === 'bike' ? 48 : 104
      const chassisHalfH = vehicle === 'bike' ? 24 : 35
      const bodyVerticalReach = Math.abs(Math.sin(a)) * chassisHalfW + Math.abs(Math.cos(a)) * chassisHalfH
      const bodyHitsGround = s.y + bodyVerticalReach >= groundY(s.x) - 2
      if ((bodyHitsGround && Math.abs(a) > 1.18) || (s.onGround && Math.abs(a) > 1.55) || (deepest > 9 && Math.abs(a) > 1.16 && impact > 95)) {
        s.crashed = true; endGame(); return
      }
      // fuel
      s.fuel = Math.max(0, s.fuel - dt * (gas ? 0.028 : 0.011))
      if (s.fuel <= 0 && Math.abs(s.speed) < 4) { endGame(); return }

      // items
      spawnAhead(s, w)
      for (const it of s.items) {
        if (it.taken) continue
        const itemY = groundY(it.x) - it.lift
        const carY = s.y - 3
        if (Math.abs(s.x - it.x) < 34 && Math.abs(carY - itemY) < (it.kind === 'expense' ? 43 : 62)) {
          it.taken = true
          if (it.kind === 'essential') s.money += 25
          else if (it.kind === 'expense') s.money = Math.max(0, s.money - 20)
          else if (it.kind === 'boost') { s.money += 10; s.speed = Math.min(MAX_SPEED, s.speed + 95) }
          else s.fuel = Math.min(1, s.fuel + 0.38)
          syncHud()
        }
      }
      s.items = s.items.filter((it) => it.x > s.x - w)
      s.hudClock -= dt
      if (s.hudClock <= 0) { s.hudClock = 0.1; syncHud() }
    }

    const drawBuggy = (s) => {
      const art = buggyArtRef.current
      if (art) {
        const wheel = (x, y, spin) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(spin)
          // Matte reference-style wheel: flat rubber, chunky tread and a
          // simple gray hub. No chrome, gloss, gradients or specular shine.
          ctx.fillStyle = '#171a1d'
          for (let i = 0; i < 12; i++) {
            ctx.save(); ctx.rotate((i / 12) * Math.PI * 2)
            ctx.fillRect(-2.7, -16.2, 5.4, 5.4); ctx.restore()
          }
          ctx.beginPath(); ctx.arc(0, 0, 14.4, 0, Math.PI * 2); ctx.fillStyle = '#202428'; ctx.fill()
          ctx.beginPath(); ctx.arc(0, 0, 9.2, 0, Math.PI * 2); ctx.fillStyle = '#555b61'; ctx.fill()
          ctx.strokeStyle = '#30353a'; ctx.lineWidth = 2
          for (let i = 0; i < 6; i++) {
            ctx.save(); ctx.rotate((i / 6) * Math.PI * 2)
            ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(0, -7.8); ctx.stroke(); ctx.restore()
          }
          ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#777d82'; ctx.fill()
          ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fillStyle = '#2f3438'; ctx.fill()
          ctx.restore()
        }
        // Paint the sprung chassis and independent wheels. Keep the space
        // between them visually clean; wheel motion communicates suspension.
        ctx.save(); ctx.translate(0, s.suspension)
        ctx.drawImage(art, 150, 110, 1360, 450, -68, -35, 136, 45)
        ctx.restore()
        wheel(-41, 21 + s.rearTravel, s.rearWheelSpin)
        wheel(41, 21 + s.frontTravel, s.frontWheelSpin)
        return
      }
      const R = 19
      const rearX = -WHEELBASE / 2, frontX = WHEELBASE / 2, wheelY = 22
      drawWheel(ctx, rearX, wheelY, R, s.wheelSpin)
      drawWheel(ctx, frontX, wheelY, R, s.wheelSpin)
      // Long exposed suspension links make the wheel/body separation readable.
      ctx.strokeStyle = '#263442'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(rearX, wheelY - 2); ctx.lineTo(-19, -1); ctx.moveTo(frontX, wheelY - 2); ctx.lineTo(19, -2); ctx.stroke()
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(rearX + 4, wheelY - 5); ctx.lineTo(-18, 2); ctx.moveTo(frontX - 4, wheelY - 5); ctx.lineTo(18, 1); ctx.stroke()
      ctx.save(); ctx.translate(0, -7 + s.suspension)
      // Fenders move with the sprung chassis, not with the wheels.
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 7; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(rearX, 21, R + 6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
      ctx.beginPath(); ctx.arc(frontX, 21, R + 6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke()
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
      ctx.restore()
    }

    const drawCar = (s, sx) => {
      ctx.save()
      ctx.translate(sx, s.y)
      ctx.rotate(s.angle)
      const vehicleScale = vehicle === 'bike' ? CAR_SCALE : 1.48
      ctx.scale(vehicleScale, vehicleScale)
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
      const camX = s.x - w * 0.27
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
      // Full 3D art direction for the playable scene. Physics terrain remains
      // procedural below, while this supplies the dimensional sky and depth.
      if (vehicle !== 'bike' && backgroundArtRef.current) {
        ctx.drawImage(backgroundArtRef.current, 0, 0, w, h)
      }
      // terrain
      ctx.beginPath(); ctx.moveTo(0, h)
      for (let sxp = -20; sxp <= w + 20; sxp += 10) {
        const wx = camX + sxp
        ctx.lineTo(sxp, groundY(wx))
      }
      ctx.lineTo(w + 20, h); ctx.closePath()
      const tg = ctx.createLinearGradient(0, h * 0.54, 0, h)
      tg.addColorStop(0, '#93dc39'); tg.addColorStop(0.08, '#63a82f'); tg.addColorStop(0.16, '#875128'); tg.addColorStop(1, '#3b2114')
      ctx.fillStyle = tg; ctx.fill()
      if (vehicle !== 'bike') {
        ctx.save(); ctx.clip()
        const firstRockX = Math.floor((camX - 44) / 44) * 44
        for (let wx = firstRockX; wx < camX + w + 60; wx += 44) {
          const sxp = wx - camX
          const ry = groundY(wx) + 34 + Math.abs(Math.sin(wx * 0.019)) * 175
          const rw = 3 + Math.abs(Math.sin(wx * 0.031)) * 6
          ctx.beginPath()
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2, rr = rw * (.72 + Math.abs(Math.sin(wx + k * 2.7)) * .35)
            const rx = sxp + Math.cos(a) * rr, ryy = ry + Math.sin(a) * rr * .68
            if (!k) ctx.moveTo(rx, ryy); else ctx.lineTo(rx, ryy)
          }
          ctx.closePath(); ctx.fillStyle = 'rgba(45,27,18,.48)'; ctx.fill()
          ctx.strokeStyle = 'rgba(210,146,82,.18)'; ctx.lineWidth = 1; ctx.stroke()
        }
        ctx.restore()
      }
      // grass rim
      ctx.beginPath()
      for (let sxp = -20; sxp <= w + 20; sxp += 10) { const wx = camX + sxp; const y = groundY(wx); if (sxp < 0) ctx.moveTo(sxp, y); else ctx.lineTo(sxp, y) }
      ctx.save(); ctx.shadowColor = 'rgba(34,80,20,.65)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5
      ctx.strokeStyle = vehicle === 'bike' ? '#7cb342' : '#b7ef42'; ctx.lineWidth = vehicle === 'bike' ? 4 : 11; ctx.stroke(); ctx.restore()

      // Exhaust and wheel debris are stored in world coordinates and converted
      // to screen space only here, after the camera position is known.
      for (const p of s.smoke) {
        const px = p.x - camX, alpha = Math.max(0, p.life / p.maxLife)
        const pg = ctx.createRadialGradient(px, p.y, 1, px, p.y, p.size)
        pg.addColorStop(0, `rgba(255,255,255,${alpha * .78 * p.power})`)
        pg.addColorStop(.38, `rgba(100,116,139,${alpha * .72 * p.power})`)
        pg.addColorStop(.72, `rgba(71,85,105,${alpha * .42 * p.power})`)
        pg.addColorStop(1, 'rgba(30,41,59,0)')
        ctx.beginPath(); ctx.arc(px, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill()
      }
      for (const d of s.debris) {
        const dx = d.x - camX
        ctx.save(); ctx.translate(dx, d.y); ctx.rotate(d.spin); ctx.globalAlpha = Math.min(1, d.life * 2)
        ctx.beginPath(); ctx.moveTo(-d.size, -d.size * .45); ctx.lineTo(d.size * .65, -d.size); ctx.lineTo(d.size, d.size * .55); ctx.lineTo(-d.size * .5, d.size); ctx.closePath()
        ctx.fillStyle = '#75401f'; ctx.fill(); ctx.strokeStyle = '#b87335'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore()
      }

      // items
      for (const it of s.items) {
        if (it.taken) continue
        const ix = it.x - camX
        const floating = it.kind === 'essential' || it.kind === 'boost'
        const iy = groundY(it.x) - it.lift + (floating ? Math.sin(performance.now() * 0.004 + it.bob) * 5 : 0)
        if (ix < -60 || ix > w + 60) continue
        const art = pickupArtRef.current, crop = PICKUP_SPRITES[it.art]
        if (art && crop) {
          const drawSize = it.kind === 'expense' ? 58 : it.kind === 'fuel' ? 55 : 54
          ctx.save()
          ctx.shadowColor = it.kind === 'expense' ? 'rgba(239,68,68,.65)' : 'rgba(74,222,128,.55)'
          ctx.shadowBlur = floating ? 15 : 8
          ctx.drawImage(art, crop[0], crop[1], crop[2], crop[3], ix - drawSize / 2, iy - drawSize / 2, drawSize, drawSize)
          ctx.restore()
          ctx.fillStyle = it.kind === 'expense' ? '#fff' : '#ecfccb'
          ctx.font = `900 10px ${BODY_FONT}`; ctx.textAlign = 'center'
          ctx.fillText(it.kind === 'expense' ? '−20' : it.kind === 'essential' ? '+25' : '', ix, iy + 35)
        } else if (it.kind === 'essential') {
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
      if (s.stuntLife > 0 && s.stuntText) {
        const pop = Math.min(1, s.stuntLife * 2.8)
        ctx.save(); ctx.globalAlpha = pop; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `900 ${Math.round(24 + pop * 5)}px ${DISPLAY}`
        ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(16,42,25,.72)'; ctx.strokeText(s.stuntText, w * .5, h * .27)
        ctx.fillStyle = '#d9f99d'; ctx.fillText(s.stuntText, w * .5, h * .27); ctx.restore()
      }
    }

    const loop = (t) => {
      const s = sim.current
      const realMs = Math.min(48, lastRef.current ? t - lastRef.current : 16)
      lastRef.current = t
      const dt = realMs / 1000
      const { w, h } = sizeRef.current
      // Fixed substeps keep suspension, wheel contact, and flip momentum
      // identical at 60/120 Hz and during occasional slow browser frames.
      if (statusRef.current === 'playing' && s) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
        const stepDt = dt / steps
        for (let i = 0; i < steps && statusRef.current === 'playing'; i++) update(s, stepDt, w, h)
      }
      if (s) render(s)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [setStatus, save, groundY])

  const start = () => {
    sim.current = freshSim(sizeRef.current.h)
    setHud({ money: 0, dist: 0, fuel: 1 }); setNewBest(false); resetSave()
    setInputVisual({ gas: false, brake: false, jump: false })
    lastRef.current = 0; gasRef.current = false; brakeRef.current = false; jumpRef.current = false
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
      <div className={`${vehicle === 'bike' ? 'flex' : 'hidden'} items-end justify-between mb-3 px-1`}>
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
      <div className="relative rounded-2xl overflow-hidden" style={vehicle === 'bike'
        ? { height: 'clamp(430px, calc(100svh - 260px), 760px)', minHeight: 400, background: surfaceBg('sky') }
        : { aspectRatio: '16 / 9', minHeight: 360, background: '#77d8f5', boxShadow: '0 18px 45px rgba(30,92,110,.2)' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

        {status === 'playing' && vehicle !== 'bike' && (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 pointer-events-none" style={{ color: '#fff', textShadow: '0 2px 5px rgba(0,0,0,.65)' }}>
            <div><div className="text-[10px] font-black tracking-[.18em]">SCORE</div><div className="font-display text-3xl font-black">{hud.money}</div></div>
            <div className="rounded-full border-2 border-white/70 bg-black/25 px-5 py-2 font-display text-xl font-black">{hud.dist}m</div>
            <div className="flex items-center gap-2">
              <div className="w-28 rounded-xl border-2 border-white/70 bg-black/30 p-2">
                <div className="mb-1 text-[9px] font-black tracking-widest">FUEL</div>
                <div className="h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full" style={{ width: `${hud.fuel * 100}%`, background: hud.fuel < .25 ? '#ef4444' : '#a3e635' }} /></div>
              </div>
            </div>
          </div>
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
          <div className="absolute inset-0">
            <img src="/games/climb/title-screen-v3.png" alt="Guac Hill Climb" className="absolute inset-0 h-full w-full object-cover" draggable="false" />
            <button onClick={start} className="absolute left-1/2 top-[31%] h-[22%] w-[18%] -translate-x-1/2 rounded-[28%] focus-visible:outline focus-visible:outline-4 focus-visible:outline-white" aria-label="Play Guac Hill Climb">
              <span className="sr-only">Start driving</span>
            </button>
          </div>
        )}

        {false && status === 'idle' && vehicle !== 'bike' && (
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

        {false && status === 'paused' && vehicle === 'bike' && (
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
        {false && status === 'playing' && vehicle !== 'bike' && (
          <div className="pointer-events-none absolute inset-0">
            <button className="pointer-events-auto absolute bottom-5 left-5 grid h-[clamp(68px,10vw,96px)] w-[clamp(68px,10vw,96px)] place-items-center rounded-full border-[5px] border-white/75 bg-slate-900/75 font-display text-xs font-black tracking-wider text-white shadow-xl"
              onPointerDown={(e) => { e.preventDefault(); brakeRef.current = true }} onPointerUp={() => { brakeRef.current = false }} onPointerLeave={() => { brakeRef.current = false }}>BRAKE</button>
            <button className="pointer-events-auto absolute bottom-5 right-5 grid h-[clamp(68px,10vw,96px)] w-[clamp(68px,10vw,96px)] place-items-center rounded-full border-[5px] border-white/75 bg-sky-600/85 font-display text-xs font-black tracking-wider text-white shadow-xl"
              onPointerDown={(e) => { e.preventDefault(); gasRef.current = true }} onPointerUp={() => { gasRef.current = false }} onPointerLeave={() => { gasRef.current = false }}>GAS</button>
            <button className="pointer-events-auto absolute bottom-[clamp(105px,15vw,142px)] right-[clamp(76px,11vw,112px)] grid h-[clamp(64px,9vw,88px)] w-[clamp(64px,9vw,88px)] place-items-center rounded-full border-[5px] border-white/75 bg-lime-600/90 font-display text-xs font-black tracking-wider text-white shadow-xl"
              onPointerDown={(e) => { e.preventDefault(); jumpRef.current = true }}><span><span className="block text-xl leading-none">↑</span>JUMP</span></button>
          </div>
        )}

        {false && status === 'paused' && vehicle !== 'bike' && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-[430px] rounded-[28px] border border-white/25 bg-slate-950/80 p-5 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.15)] backdrop-blur-xl">
              <div className="font-display text-[10px] font-black tracking-[.32em] text-lime-300">GUAC HILL CLIMB</div>
              <h2 className="mt-1 font-display text-3xl font-black tracking-wide">PAUSED</h2>
              <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-lime-400 to-emerald-500" />
              <button onClick={resume} className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-white/40 bg-gradient-to-b from-lime-400 to-green-700 py-3.5 font-display text-sm font-black tracking-widest shadow-[0_6px_0_#166534] transition duration-75 active:translate-y-1 active:shadow-[0_2px_0_#166534]">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="m8 5 11 7-11 7Z"/></svg> RESUME
              </button>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={start} className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 py-3 text-xs font-black tracking-wider transition hover:bg-white/15 active:scale-[.98]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v6h-6"/></svg> RESTART
                </button>
                <button onClick={() => setStatus('idle')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 py-3 text-xs font-black tracking-wider transition hover:bg-white/15 active:scale-[.98]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg> MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {false && status === 'playing' && vehicle !== 'bike' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <div className="pointer-events-auto flex items-center justify-between rounded-[22px] border border-white/25 bg-slate-950/55 px-3 py-2.5 shadow-[0_-8px_35px_rgba(2,12,27,.2),inset_0_1px_0_rgba(255,255,255,.2)] backdrop-blur-md sm:px-4">
              <button className="flex h-[clamp(56px,8vw,72px)] min-w-[clamp(92px,14vw,128px)] items-center justify-center gap-2 rounded-2xl border-2 border-white/35 bg-gradient-to-b from-slate-500 to-slate-900 px-4 text-white shadow-[0_6px_0_#111827,0_10px_20px_rgba(0,0,0,.3)] transition duration-75 active:translate-y-1 active:shadow-[0_2px_0_#111827]"
                onPointerDown={(e) => { e.preventDefault(); brakeRef.current = true }} onPointerUp={() => { brakeRef.current = false }} onPointerLeave={() => { brakeRef.current = false }} aria-label="Brake">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M17 4 7 12l10 8"/><path d="M7 4 7 20"/></svg>
                <span className="font-display"><span className="block text-xs font-black tracking-widest">BRAKE</span><span className="block text-[8px] font-bold text-white/55">← / A</span></span>
              </button>

              <div className="hidden text-center text-white/60 sm:block"><div className="font-display text-[9px] font-black tracking-[.22em]">DRIVE DECK</div><div className="mt-1 flex items-center gap-1.5 text-[8px] font-bold"><span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#a3e635]"/>READY</div></div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button className="grid h-[clamp(54px,7.5vw,68px)] w-[clamp(64px,9vw,82px)] place-items-center rounded-2xl border-2 border-white/40 bg-gradient-to-b from-lime-400 to-green-700 text-white shadow-[0_6px_0_#166534,0_10px_20px_rgba(0,0,0,.3)] transition duration-75 active:translate-y-1 active:shadow-[0_2px_0_#166534]"
                  onPointerDown={(e) => { e.preventDefault(); jumpRef.current = true }} aria-label="Jump">
                  <span className="font-display"><svg viewBox="0 0 24 24" className="mx-auto h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 14 6-7 6 7"/><path d="M12 7v12"/></svg><span className="block text-[9px] font-black tracking-wider">JUMP</span></span>
                </button>
                <button className="flex h-[clamp(56px,8vw,72px)] min-w-[clamp(92px,14vw,128px)] items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-gradient-to-b from-sky-400 to-blue-700 px-4 text-white shadow-[0_6px_0_#1e3a8a,0_10px_20px_rgba(0,0,0,.3)] transition duration-75 active:translate-y-1 active:shadow-[0_2px_0_#1e3a8a]"
                  onPointerDown={(e) => { e.preventDefault(); gasRef.current = true }} onPointerUp={() => { gasRef.current = false }} onPointerLeave={() => { gasRef.current = false }} aria-label="Gas">
                  <span className="font-display"><span className="block text-xs font-black tracking-widest">GAS</span><span className="block text-[8px] font-bold text-white/60">→ / D</span></span>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m7 4 10 8L7 20"/><path d="M17 4v16"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'playing' && vehicle !== 'bike' && (
          <div className="pointer-events-none absolute inset-0">
            <button className={`pointer-events-auto absolute bottom-1 left-4 h-[clamp(82px,12vw,112px)] w-[clamp(66px,9vw,86px)] drop-shadow-[0_8px_8px_rgba(0,0,0,.45)] transition-transform duration-75 active:translate-y-2 active:scale-[.97] ${inputVisual.brake ? 'translate-y-2 scale-[.97] brightness-90' : ''}`} aria-label="Reverse pedal"
              onPointerDown={(e) => { e.preventDefault(); brakeRef.current = true; setInputVisual((v) => ({ ...v, brake: true })) }} onPointerUp={() => { brakeRef.current = false; setInputVisual((v) => ({ ...v, brake: false })) }} onPointerLeave={() => { brakeRef.current = false; setInputVisual((v) => ({ ...v, brake: false })) }}>
              <svg viewBox="0 0 70 100" className="h-full w-full"><defs><linearGradient id="brakeMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".42" stopColor="#cbd5e1"/><stop offset="1" stopColor="#64748b"/></linearGradient></defs><path d="M11 5h48a8 8 0 0 1 8 8v48a8 8 0 0 1-8 8H43v27H27V69H11a8 8 0 0 1-8-8V13a8 8 0 0 1 8-8Z" fill="url(#brakeMetal)" stroke="#475569" strokeWidth="3"/>{[[20,22],[35,22],[50,22],[20,43],[35,43],[50,43]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6" fill="#59483d" stroke="#8b7565" strokeWidth="2"/>)}<text x="35" y="64" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#334155">REVERSE</text></svg>
            </button>

            <button className={`pointer-events-auto absolute bottom-3 left-1/2 h-16 w-[74px] -translate-x-1/2 rounded-2xl border-2 border-white/60 bg-gradient-to-b from-lime-400 to-green-700 text-white shadow-[0_6px_0_#166534,0_10px_18px_rgba(0,0,0,.3)] transition duration-75 active:translate-y-1 active:shadow-[0_2px_0_#166534] ${inputVisual.jump ? 'translate-y-1 brightness-90 shadow-[0_2px_0_#166534]' : ''}`} aria-label="Jump"
              onPointerDown={(e) => { e.preventDefault(); jumpRef.current = true; setInputVisual((v) => ({ ...v, jump: true })) }} onPointerUp={() => setInputVisual((v) => ({ ...v, jump: false }))} onPointerLeave={() => setInputVisual((v) => ({ ...v, jump: false }))}>
              <svg viewBox="0 0 24 24" className="mx-auto h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.7"><path d="m5 14 7-8 7 8"/><path d="M12 6v13"/></svg><span className="font-display text-[9px] font-black tracking-wider">JUMP</span>
            </button>

            <button className={`pointer-events-auto absolute bottom-1 right-4 h-[clamp(88px,13vw,120px)] w-[clamp(62px,8.5vw,82px)] drop-shadow-[0_8px_8px_rgba(0,0,0,.45)] transition-transform duration-75 active:translate-y-2 active:scale-[.97] ${inputVisual.gas ? 'translate-y-2 scale-[.97] brightness-90' : ''}`} aria-label="Accelerator pedal"
              onPointerDown={(e) => { e.preventDefault(); gasRef.current = true; setInputVisual((v) => ({ ...v, gas: true })) }} onPointerUp={() => { gasRef.current = false; setInputVisual((v) => ({ ...v, gas: false })) }} onPointerLeave={() => { gasRef.current = false; setInputVisual((v) => ({ ...v, gas: false })) }}>
              <svg viewBox="0 0 70 105" className="h-full w-full"><defs><linearGradient id="gasMetal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".42" stopColor="#dbeafe"/><stop offset="1" stopColor="#64748b"/></linearGradient></defs><path d="M13 4h44a8 8 0 0 1 8 8v61a8 8 0 0 1-8 8H42v20H28V81H13a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8Z" fill="url(#gasMetal)" stroke="#475569" strokeWidth="3"/>{[[22,20],[48,20],[22,40],[48,40],[22,60],[48,60]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="6" fill="#59483d" stroke="#8b7565" strokeWidth="2"/>)}<text x="35" y="78" textAnchor="middle" fontSize="8" fontWeight="900" fill="#334155">GAS</text></svg>
            </button>
          </div>
        )}
      </div>

      {/* Pedals (mobile + click) */}
      <div className={`${vehicle === 'bike' ? 'flex' : 'hidden'} gap-3 mt-3`} style={{ visibility: status === 'playing' ? 'visible' : 'hidden' }}>
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

      <p className={`${vehicle === 'bike' ? 'block' : 'hidden'} text-xs text-center mt-3 mb-2`} style={{ color: FAINT }}>
        Gas ► and ◄ Brake (or → / ← arrows). In the air, gas leans you back and brake leans you forward. Signed-in players earn +50 GuacMoney for their first game each day.
      </p>
    </div>
  )
}
