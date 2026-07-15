'use client'
// Title-card actions for a game page — Favorite (localStorage toggle) and
// Fullscreen (on the stage element). Client island inside the server shell.
import { useEffect, useState } from 'react'

const base = 'text-sm font-semibold px-4 py-2 rounded-full border bg-white transition-colors'
const off = { borderColor: '#dbe5d8', color: '#3d4a42' }
const on = { borderColor: '#16a34a', color: '#166534', background: '#f2fbf3' }

export default function GameActions({ slug, stageId = 'gg-stage' }) {
  const [fav, setFav] = useState(false)
  useEffect(() => { try { setFav(localStorage.getItem('gg-fav-' + slug) === '1') } catch {} }, [slug])

  const toggleFav = () => setFav((f) => {
    const nv = !f
    try { localStorage.setItem('gg-fav-' + slug, nv ? '1' : '0') } catch {}
    return nv
  })

  const fullscreen = () => {
    const el = document.getElementById(stageId)
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
  }

  return (
    <div className="ml-auto flex gap-2">
      <button type="button" onClick={toggleFav} aria-pressed={fav} className={base} style={fav ? on : off}>
        {fav ? '♥ Favorited' : '♡ Favorite'}
      </button>
      <button type="button" onClick={fullscreen} className={base} style={off}>⛶ Fullscreen</button>
    </div>
  )
}
