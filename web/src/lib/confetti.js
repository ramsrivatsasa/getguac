// Tiny dependency-free confetti burst. Drops a single full-screen
// canvas overlay, fires particles for ~1.6s, then removes itself.
// No external library, no DOM lock-in, no listener leaks.
//
// Designed to be called sparingly — after "win" moments (Auto-Add
// Cheapest succeeded, a rating finished, GuacScore went up). Calling
// it 5× in a second is fine but visually wasteful.

const COLORS = [
  '#10b981',  // emerald (brand)
  '#84cc16',  // lime
  '#f59e0b',  // amber
  '#e11d48',  // rose
  '#8b5cf6',  // violet
  '#f97316',  // orange
]

export function fireConfetti({ count = 80, origin = null } = {}) {
  if (typeof window === 'undefined') return
  // Respect motion preferences — skip when the user has reduced-motion on.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const ox = origin?.x ?? window.innerWidth / 2
  const oy = origin?.y ?? window.innerHeight / 3

  // Initial impulse — wide cone upward + outward.
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.1
    const speed = 6 + Math.random() * 8
    particles.push({
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.18 + Math.random() * 0.08,
      drag: 0.985,
      size: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.random() * Math.PI,
      tiltSpin: (Math.random() - 0.5) * 0.2,
      life: 0,
      maxLife: 90 + Math.random() * 30,  // ~1.5s at 60fps
    })
  }

  let raf = 0
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    let alive = 0
    for (const p of particles) {
      p.vx *= p.drag
      p.vy = p.vy * p.drag + p.gravity
      p.x += p.vx
      p.y += p.vy
      p.tilt += p.tiltSpin
      p.life++
      if (p.life >= p.maxLife || p.y > window.innerHeight + 20) continue
      alive++
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.tilt)
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    }
    if (alive > 0) {
      raf = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(raf)
      canvas.remove()
    }
  }
  raf = requestAnimationFrame(tick)
}
