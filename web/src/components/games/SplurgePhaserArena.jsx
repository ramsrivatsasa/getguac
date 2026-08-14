'use client'

import { useEffect, useRef } from 'react'

const TARGET_ART = ['latte','streaming','headphones','takeout','socks','gem','energy-drink','popcorn','beer','groceries','phone','medicine','utility','gas','paper-towels','fashion-bag']

function targetArtFor(p) {
  const text = `${p?.name || ''} ${p?.category || ''}`.toLowerCase()
  if (/latte|coffee|cafe/.test(text)) return 'latte'
  if (/stream|subscription|subs/.test(text)) return 'streaming'
  if (/headphone|gadget|tech/.test(text)) return 'headphones'
  if (/takeout|burger|dinner|eats|bistro/.test(text)) return 'takeout'
  if (/sock/.test(text)) return 'socks'
  if (/gem|game/.test(text)) return 'gem'
  if (/energy|drink/.test(text)) return 'energy-drink'
  if (/snack|popcorn/.test(text)) return 'popcorn'
  if (/beer|bar|bottle/.test(text)) return 'beer'
  if (/grocery|groceries|grub|freshmart/.test(text)) return 'groceries'
  if (/phone|telco/.test(text)) return 'phone'
  if (/medicine|prescription|pharmacy|pill/.test(text)) return 'medicine'
  if (/electric|utility|power|bill/.test(text)) return 'utility'
  if (/gas|fuel/.test(text)) return 'gas'
  if (/paper|household|towel/.test(text)) return 'paper-towels'
  if (/fashion|fit|clothes|designer/.test(text)) return 'fashion-bag'
  return p?.splurge ? 'fashion-bag' : 'groceries'
}

export default function SplurgePhaserArena({ active, paused = false, purchases = [], round, target, onEvent }) {
  const hostRef = useRef(null)
  const gameRef = useRef(null)
  const eventRef = useRef(onEvent)
  eventRef.current = onEvent

  useEffect(() => {
    if (!hostRef.current || !active) return
    let game
    let cancelled = false

    import('phaser').then(({ default: Phaser }) => {
      if (cancelled || !hostRef.current) return
      const pool = purchases.length ? purchases : [
        { name: 'Impulse buy', price: 20, splurge: true },
        { name: 'Takeout', price: 32, splurge: true },
        { name: 'Groceries', price: 48, splurge: false },
      ]

      class SlicerScene extends Phaser.Scene {
        preload() {
          this.load.image('splurge-board', '/games/splurge/wood-arena.png')
          TARGET_ART.forEach(key => this.load.image(`target-${key}`, `/games/splurge/targets/${key}.png`))
        }

        create() {
          this.banked = 0; this.missed = 0; this.lives = 3; this.ended = false; this.cutTimes = []
          this.targets = this.add.group(); this.trail = this.add.graphics().setDepth(20)
          this.trailPts = []
          const { width: w, height: h } = this.scale
          this.add.image(w / 2, h / 2, 'splurge-board').setDisplaySize(w, h).setDepth(-5)
          this.add.rectangle(w / 2, h / 2, w, h, 0x1a0802, 0.06).setDepth(-4)
          this.input.on('pointermove', (p) => {
            if (!p.isDown || this.ended) return
            this.trailPts.push({ x: p.x, y: p.y, t: this.time.now })
            if (this.trailPts.length > 12) this.trailPts.shift()
            for (const chip of this.targets.getChildren()) {
              if (chip.active && Phaser.Math.Distance.Between(p.x, p.y, chip.x, chip.y) < 46) this.slice(chip)
            }
          })
          this.spawnTimer = this.time.addEvent({ delay: 820, loop: true, callback: () => this.spawn() })
          this.spawn(); this.spawn()
        }

        spawn() {
          if (this.ended) return
          const { width: w, height: h } = this.scale
          const splurgePool = pool.filter(p => p.splurge), needPool = pool.filter(p => !p.splurge)
          const want = Math.random() < (round?.splurgeProb || 0.72)
          const list = want && splurgePool.length ? splurgePool : (needPool.length ? needPool : pool)
          const p = Phaser.Utils.Array.GetRandom(list)
          const x = Phaser.Math.Between(55, Math.max(56, w - 55))
          const c = this.add.container(x, h + 55)
          c.setDataEnabled()
          const artKey = targetArtFor(p)
          const art = this.add.image(0, -3, `target-${artKey}`).setDisplaySize(104, 104)
          const badge = p.splurge
            ? this.add.text(0, 30, `$${Math.round(p.price)}`, { fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#e83e54', padding: { x: 8, y: 3 } }).setOrigin(.5)
            : null
          // Launch high enough to use the full arena. The first Phaser pass
          // inherited a conservative velocity, leaving targets clustered near
          // the bottom edge instead of producing a satisfying slicing arc.
          c.add(badge ? [art, badge] : [art]); c.data.set({ purchase: p, vy: -Phaser.Math.Between(710, 770), vx: (w / 2 - x) * .3 + Phaser.Math.Between(-55, 55), sliced: false })
          this.targets.add(c)
        }

        slice(chip) {
          if (chip.data.get('sliced')) return
          chip.data.set('sliced', true)
          const p = chip.data.get('purchase')
          const color = p.splurge ? 0xbef264 : 0xfb7185
          for (let i = 0; i < 18; i++) {
            const dot = this.add.circle(chip.x, chip.y, Phaser.Math.Between(2, 5), color).setDepth(12)
            this.tweens.add({ targets: dot, x: chip.x + Phaser.Math.Between(-100, 100), y: chip.y + Phaser.Math.Between(-80, 100), alpha: 0, duration: 420, onComplete: () => dot.destroy() })
          }
          this.cameras.main.shake(p.splurge ? 70 : 180, p.splurge ? .004 : .014)
          chip.destroy()
          if (p.splurge) {
            this.cutTimes = this.cutTimes.filter(t => this.time.now - t < 360); this.cutTimes.push(this.time.now)
            eventRef.current?.({ type: 'impact', good: true, combo: this.cutTimes.length })
            this.banked += Math.max(1, Math.round(p.price * (round?.valueMul || 1)))
            eventRef.current?.({ type: 'hud', banked: this.banked, missed: this.missed, lives: this.lives })
            if (this.banked >= target) this.finish('clear')
          } else {
            eventRef.current?.({ type: 'impact', good: false, combo: 0 })
            this.lives--
            eventRef.current?.({ type: 'hud', banked: this.banked, missed: this.missed, lives: this.lives })
            if (this.lives <= 0) this.finish('over')
          }
        }

        finish(type) {
          if (this.ended) return
          this.ended = true; this.targets.clear(true, true); this.spawnTimer.remove(false)
          this.cameras.main.resetFX()
          eventRef.current?.({ type, banked: this.banked, missed: this.missed, lives: this.lives })
        }

        update(_, delta) {
          if (this.ended) return
          const h = this.scale.height
          for (const chip of [...this.targets.getChildren()]) {
            let vy = chip.data.get('vy') + 680 * delta / 1000
            chip.data.set('vy', vy); chip.x += chip.data.get('vx') * delta / 1000; chip.y += vy * delta / 1000; chip.rotation += .7 * delta / 1000
            if (chip.y > h + 80 && vy > 0) { const p = chip.data.get('purchase'); if (p.splurge) this.missed += Math.round(p.price); chip.destroy(); eventRef.current?.({ type: 'hud', banked: this.banked, missed: this.missed, lives: this.lives }) }
          }
          this.trailPts = this.trailPts.filter(p => this.time.now - p.t < 130)
          this.trail.clear()
          if (this.trailPts.length > 1) {
            this.trail.lineStyle(12, 0xbef264, .26).beginPath().moveTo(this.trailPts[0].x, this.trailPts[0].y)
            this.trailPts.slice(1).forEach(p => this.trail.lineTo(p.x, p.y)); this.trail.strokePath()
            this.trail.lineStyle(4, 0xffffff, .9).beginPath().moveTo(this.trailPts[0].x, this.trailPts[0].y)
            this.trailPts.slice(1).forEach(p => this.trail.lineTo(p.x, p.y)); this.trail.strokePath()
          }
        }
      }

      game = new Phaser.Game({ type: Phaser.AUTO, parent: hostRef.current, backgroundColor: '#071b10', transparent: false, scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, scene: SlicerScene, audio: { disableWebAudio: false }, render: { antialias: true, roundPixels: true } })
      gameRef.current = game
    })
    return () => { cancelled = true; gameRef.current = null; game?.destroy(true) }
  }, [active, purchases, round, target])

  useEffect(() => {
    const scene = gameRef.current?.scene?.scenes?.[0]
    if (!scene) return
    if (paused) scene.scene.pause()
    else scene.scene.resume()
  }, [paused])

  return <div ref={hostRef} className="absolute inset-0" style={{ touchAction: 'none' }} />
}
