'use client'
// Stops the arrow keys and Space from scrolling the page while a game is on
// screen, so keyboard input drives the game instead of the window. Mounted
// once by GamePageShell, so every arcade game is covered without each game
// needing its own preventDefault. Uses preventDefault (not stopPropagation),
// so each game's own window keydown handler still receives the key.
import { useEffect } from 'react'

const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'])

export default function ArrowKeyGuard() {
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      const tag = t && t.tagName
      // never swallow keys while the user is typing in a field
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return
      if (BLOCK.has(e.key)) e.preventDefault()
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}
