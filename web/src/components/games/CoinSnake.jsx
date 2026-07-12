'use client'
// Coin Snake — the classic. Steer the snake around the board eating coins
// (+10, grow); every fifth coin drops a diamond worth +50 that expires if
// you dawdle. Walls and your own tail end the run, and the snake speeds up
// as it grows. Arrows/WASD or swipe. Sim in refs + rAF ticks.
import { useEffect, useRef, useState } from 'react'
import {
  useArcadeSound, useBestScore, useScoreSaver,
  Overlay, OverlayAd, SaveScoreLine, PrimaryButton, GhostButton, HudButton,
  INK, BODY, MUTED, FAINT, GREEN, AMBER, fmt,
} from './arcadeKit'

const BEST_KEY = 'gg-snake-best-v1'
const COLS = 22, ROWS = 22
const TICK0 = 0.15, TICK_MIN = 0.07

const freshSim = () => ({
  snake: [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }],
  dir: { x: 1, y: 0 }, queue: [],
  coin: null, gem: null, gemLife: 0,
  coins: 0, score: 0, grow: 0,
  acc: 0, tick: TICK0, flash: 0,
})

export default function CoinSnake() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const statusRef = useRef('idle')
  const swipeRef = useRef(null)

  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(0)
  const [len, setLen] = useState(3)

  const { tone, muted, toggleMute } = useArcadeSound()
  const { best, newBest, submit: submitBest } = useBestScore(BEST_KEY)
  const { saveRes, save, resetSave } = useScoreSaver('snake')

  const setPhase = (s) => { statusRef.current = s; setStatus(s) }

  const sfx = (name) => {
    switch (name) {
      case 'coin': tone({ f0: 880, f1: 1320, t: 0.08, type: 'square', g: 0.1 }); break
      case 'gem': [1047, 1319, 1568].forEach((f, i) => tone({ f0: f, t: 0.09, g: 0.12, at: i * 0.05 })); break
      case 'turn': tone({ f0: 220, f1: 260, t: 0.03, type: 'triangle', g: 0.03 }); break
      case 'die': [330, 220, 147].forEach((f, i) => tone({ f0: f, f1: f * 0.7, t: 0.18, type: 'sawtooth', g: 0.12, at: i * 0.11 })); break
      default: break
    }
  }

  const freeCell = (sim) => {
    const used = new Set(sim.snake.map((c) => c.y * COLS + c.x))
    if (sim.coin) used.add(sim.coin.y * COLS + sim.coin.x)
    if (sim.gem) used.add(sim.gem.y * COLS + sim.gem.x)
    let cell
    do { cell = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
    while (used.has(cell.y * COLS + cell.x))
    return cell
  }

  const setDir = (dx, dy) => {
    const sim = simRef.current
    if (!sim || statusRef.current !== 'playing') return
    const last = sim.queue.length ? sim.queue[sim.queue.length - 1] : sim.dir
    if (last.x === -dx && last.y === -dy) return   // no 180s
    if (last.x === dx && last.y === dy) return
    if (sim.queue.length < 3) { sim.queue.push({ x: dx, y: dy }); sfx('turn') }
  }

  const endGame = (sim) => {
    cancelAnimationFrame(rafRef.current)
    sfx('die')
    save(sim.score, null)
    submitBest(sim.score)
    setPhase('over')
    draw(sim)
  }

  function advance(sim) {
    if (sim.queue.length) sim.dir = sim.queue.shift()
    const head = sim.snake[0]
    const nx = head.x + sim.dir.x, ny = head.y + sim.dir.y
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return endGame(sim)
    if (sim.snake.some((c, i) => i < sim.snake.length - 1 && c.x === nx && c.y === ny)) return endGame(sim)
    sim.snake.unshift({ x: nx, y: ny })
    let ate = false
    if (sim.coin && nx === sim.coin.x && ny === sim.coin.y) {
      ate = true
      sim.coins += 1
      sim.score += 10
      sim.grow += 1
      sim.coin = freeCell(sim)
      sim.tick = Math.max(TICK_MIN, TICK0 - sim.snake.length * 0.0032)
      if (sim.coins % 5 === 0) { sim.gem = freeCell(sim); sim.gemLife = 6 }
      sfx('coin')
    }
    if (sim.gem && nx === sim.gem.x && ny === sim.gem.y) {
      ate = true
      sim.score += 50
      sim.grow += 2
      sim.gem = null
      sim.flash = 0.5
      sfx('gem')
    }
    if (ate) { setScore(sim.score); setLen(sim.snake.length) }
    if (sim.grow > 0) sim.grow -= 1
    else sim.snake.pop()
  }

  function step(sim, dt) {
    sim.acc += dt
    sim.flash = Math.max(0, sim.flash - dt)
    if (sim.gem) {
      sim.gemLife -= dt
      if (sim.gemLife <= 0) sim.gem = null
    }
    while (sim.acc >= sim.tick) {
      sim.acc -= sim.tick
      advance(sim)
      if (statusRef.current !== 'playing') return
    }
  }

  // ─── render ───────────────────────────────────────────────────────────────
  function boardGeo() {
    const { w, h } = sizeRef.current
    const cell = Math.floor(Math.min((w - 24) / COLS, (h - 70) / ROWS))
    const bw = cell * COLS, bh = cell * ROWS
    return { cell, bx: (w - bw) / 2, by: 54 + (h - 54 - bh) / 2, bw, bh }
  }

  function draw(sim) {
    const cvs = canvasRef.current
    if (!cvs) return
    const { w, h } = sizeRef.current
    const ctx = cvs.getContext('2d')
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#14251a'); bg.addColorStop(1, '#0b160f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    const { cell, bx, by, bw, bh } = boardGeo()
    // board
    ctx.fillStyle = '#1a2f21'
    ctx.fillRect(bx, by, bw, bh)
    ctx.fillStyle = 'rgba(255,255,255,0.025)'
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(bx + x * cell, by + y * cell, cell, cell)
    }
    ctx.strokeStyle = sim.flash > 0 ? '#67e8f9' : 'rgba(132,204,22,0.5)'
    ctx.lineWidth = 2.5
    ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4)

    // food
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `${Math.round(cell * 0.82)}px serif`
    if (sim.coin) ctx.fillText('🪙', bx + sim.coin.x * cell + cell / 2, by + sim.coin.y * cell + cell / 2 + 1)
    if (sim.gem) {
      ctx.globalAlpha = sim.gemLife < 2 ? (Math.sin(sim.gemLife * 12) * 0.5 + 0.5) : 1
      ctx.fillText('💎', bx + sim.gem.x * cell + cell / 2, by + sim.gem.y * cell + cell / 2 + 1)
      ctx.globalAlpha = 1
    }

    // snake
    for (let i = sim.snake.length - 1; i >= 0; i--) {
      const c = sim.snake[i]
      const t = i / Math.max(1, sim.snake.length - 1)
      const g = Math.round(190 - t * 90)
      ctx.fillStyle = i === 0 ? '#bef264' : `rgb(${Math.round(90 - t * 40)}, ${g}, ${Math.round(50 - t * 20)})`
      const pad = i === 0 ? 1 : 1.5
      const r = Math.max(3, cell * 0.28)
      ctx.beginPath()
      ctx.roundRect(bx + c.x * cell + pad, by + c.y * cell + pad, cell - pad * 2, cell - pad * 2, r)
      ctx.fill()
    }
    // eyes on the head
    const head = sim.snake[0]
    const hx = bx + head.x * cell + cell / 2, hy = by + head.y * cell + cell / 2
    ctx.fillStyle = '#15281C'
    const ex = sim.dir.x * cell * 0.16, ey = sim.dir.y * cell * 0.16
    ctx.beginPath(); ctx.arc(hx + ex + -sim.dir.y * cell * 0.16, hy + ey + sim.dir.x * cell * 0.16, cell * 0.08, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(hx + ex + sim.dir.y * cell * 0.16, hy + ey + -sim.dir.x * cell * 0.16, cell * 0.08, 0, Math.PI * 2); ctx.fill()
  }

  function loop(ts) {
    if (statusRef.current !== 'playing') return
    const sim = simRef.current
    if (!sim) return
    const dt = Math.min(0.05, Math.max(0, (ts - lastRef.current) / 1000))
    lastRef.current = ts
    step(sim, dt)
    if (statusRef.current === 'playing') {
      draw(sim)
      rafRef.current = requestAnimationFrame(loop)
    }
  }

  const start = () => {
    const sim = freshSim()
    sim.coin = freeCell(sim)
    simRef.current = sim
    setScore(0); setLen(3); resetSave()
    setPhase('playing')
    lastRef.current = performance.now()
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }

  const pause = () => {
    if (statusRef.current !== 'playing') return
    cancelAnimationFrame(rafRef.current)
    setPhase('paused')
  }
  const resume = () => {
    if (statusRef.current !== 'paused') return
    setPhase('playing')
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    const KEYS = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
    }
    const onKey = (e) => {
      const d = KEYS[e.key]
      if (d && statusRef.current === 'playing') { e.preventDefault(); setDir(d[0], d[1]) }
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e) => { e.preventDefault(); swipeRef.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const s0 = swipeRef.current
    swipeRef.current = null
    if (!s0) return
    const dx = e.clientX - s0.x, dy = e.clientY - s0.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return
    if (Math.abs(dx) > Math.abs(dy)) setDir(Math.sign(dx), 0)
    else setDir(0, Math.sign(dy))
  }

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

  useEffect(() => {
    const onBlur = () => pause()
    const vis = () => { if (document.hidden) pause() }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', vis)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  return (
    <div className="w-full select-none">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ height: 'clamp(430px, calc(100svh - 240px), 720px)', minHeight: 430, background: '#0b160f', borderTop: '1px solid rgba(20,83,45,0.12)', borderBottom: '1px solid rgba(20,83,45,0.12)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />

        {/* HUD */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ pointerEvents: 'none' }}>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#5C6B60' }}>Score </span>
              <span className="font-display font-extrabold text-lg" style={{ color: '#bef264' }}>{fmt(score)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold" style={{ color: '#5C6B60' }}>Length </span>
              <span className="font-display font-bold text-sm" style={{ color: '#d1fae5' }}>{len}</span>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
            <HudButton onClick={toggleMute} label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? '🔇' : '🔊'}</HudButton>
            {status === 'playing' && <HudButton onClick={pause} label="Pause">⏸ Pause</HudButton>}
          </div>
        </div>

        {status === 'idle' && (
          <Overlay dark>
            <div className="text-4xl mb-1">🐍</div>
            <div className="font-display font-extrabold text-xl mb-2" style={{ color: INK }}>Coin Snake</div>
            <p className="text-sm mb-1" style={{ color: BODY }}>
              Steer with <b style={{ color: GREEN }}>arrows, WASD or swipes</b>. Coins are +10 and make you longer;
              every fifth coin drops a 💎 worth +50 — grab it before it fades.
            </p>
            <p className="text-sm mb-3" style={{ color: BODY }}>
              Walls and your own tail end the run, and the longer you get, the faster you go.
            </p>
            {best > 0 && <div className="text-xs font-bold mb-3" style={{ color: AMBER }}>Best run: {fmt(best)}</div>}
            <PrimaryButton onClick={start}>Slither</PrimaryButton>
            <OverlayAd />
          </Overlay>
        )}

        {status === 'paused' && (
          <Overlay dark maxWidth={300}>
            <div className="font-display font-extrabold text-lg mb-1" style={{ color: INK }}>Paused ⏸</div>
            <p className="text-xs mb-3" style={{ color: MUTED }}>{fmt(score)} banked at length {len}.</p>
            <div className="flex justify-center gap-2">
              <PrimaryButton onClick={resume} className="px-5 py-2">Resume</PrimaryButton>
              <GhostButton onClick={() => setPhase('idle')}>Quit</GhostButton>
            </div>
          </Overlay>
        )}

        {status === 'over' && (
          <Overlay dark>
            <div className="text-3xl mb-1">🐍💥</div>
            <div className="font-display font-extrabold text-lg" style={{ color: INK }}>Snake down!</div>
            <div className="font-display font-extrabold text-4xl mt-2" style={{ color: GREEN }}>{fmt(score)}</div>
            <div className="text-[11px] font-semibold" style={{ color: MUTED }}>final length {len}</div>
            <div className="flex justify-center gap-8 mt-3">
              <div>
                <div className="font-display font-extrabold text-lg" style={{ color: AMBER }}>{fmt(best)}</div>
                <div className="text-[11px]" style={{ color: FAINT }}>best run</div>
              </div>
            </div>
            {newBest && <div className="text-xs font-bold mt-2" style={{ color: AMBER }}>New best! 🥑</div>}
            <SaveScoreLine res={saveRes} />
            <div className="mt-4">
              <PrimaryButton onClick={start}>Play again</PrimaryButton>
            </div>
            <OverlayAd />
          </Overlay>
        )}
      </div>

      <p className="text-xs text-center mt-3 mb-2" style={{ color: FAINT }}>
        Arrows / WASD / swipe to steer · 🪙 +10 · 💎 +50 before it fades · don&apos;t hit the walls or yourself.
      </p>
    </div>
  )
}
