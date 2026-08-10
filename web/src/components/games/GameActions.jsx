'use client'
// Title-card actions for a game page — Like (shared, real count), Favorite
// (private localStorage toggle) and Fullscreen. Client island in a server shell.
//
// Like vs Favorite: Favorite is a private bookmark that never leaves the
// browser. Like is a public vote that increments a counter everyone sees, so
// it needs an account — otherwise one person could run the number up forever
// and the count would mean nothing.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toggleLike, hasLiked, fetchLikeCount, formatLikes } from '../../lib/gameLikes'

const base = 'text-sm font-semibold px-4 py-2 rounded-full border bg-white transition-colors'
const off = { borderColor: '#dbe5d8', color: '#3d4a42' }
const on = { borderColor: '#16a34a', color: '#166534', background: '#f2fbf3' }

export default function GameActions({ slug, name, stageId = 'gg-stage' }) {
  const [fav, setFav] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(null)     // null = not loaded; 0 renders as no number
  const [needsAuth, setNeedsAuth] = useState(false)
  const [shared, setShared] = useState(false)
  // Detected in an effect, not during render: `navigator` does not exist on the
  // server, so branching on it while rendering is a hydration mismatch.
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => { try { setFav(localStorage.getItem('gg-fav-' + slug) === '1') } catch {} }, [slug])

  useEffect(() => {
    let dead = false
    fetchLikeCount(slug).then((n) => { if (!dead) setLikes(n) })
    hasLiked(slug).then((v) => { if (!dead) setLiked(v) })
    return () => { dead = true }
  }, [slug])

  const onLike = async () => {
    // Optimistic: the count moves immediately, then reconciles against the
    // server. A failed write reverts rather than leaving a wrong number up.
    const next = !liked
    setLiked(next)
    setLikes((n) => Math.max(0, (n ?? 0) + (next ? 1 : -1)))
    const res = await toggleLike(slug)
    if (!res.signedIn) {
      setNeedsAuth(true)
      setLiked(false)
      setLikes((n) => Math.max(0, (n ?? 1) - 1))
      return
    }
    setLiked(res.liked)
    fetchLikeCount(slug).then(setLikes)
  }

  const toggleFav = () => setFav((f) => {
    const nv = !f
    try { localStorage.setItem('gg-fav-' + slug, nv ? '1' : '0') } catch {}
    return nv
  })

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  // Share THIS game, not the arcade. The URL is read from location at click time
  // rather than rebuilt from the slug: the games are reachable at more than one
  // path shape and a hand-built URL would eventually point at the wrong one.
  const share = async () => {
    const url = window.location.href
    const label = name || 'this game'
    const text = `Play ${label} free on GetGuac`
    if (canNativeShare) {
      try {
        await navigator.share({ title: text, text, url })
        return
      } catch {
        /* sheet dismissed - fall through to the clipboard so the click still does something */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // Clipboard is permission-gated and blocked in some in-app browsers. Show
      // the link rather than a success state that did not happen.
      window.prompt('Copy this link:', url)
    }
  }

  const fullscreen = () => {
    const el = document.getElementById(stageId)
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen?.()
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
  }

  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <button type="button" onClick={onLike} aria-pressed={liked} className={base} style={liked ? on : off}>
        {liked ? '👍' : '👍'} Like
        {/* Only shown once there is something to show — a fresh game reads
            "Like", not "Like 0". */}
        {likes > 0 && <span className="ml-1.5 font-extrabold">{formatLikes(likes)}</span>}
      </button>
      <button type="button" onClick={toggleFav} aria-pressed={fav} className={base} style={fav ? on : off}>
        {fav ? '♥ Favorited' : '♡ Favorite'}
      </button>
      {/* Every game page gets this, because every game page renders GameActions.
          One component, 500-odd pages. */}
      <button type="button" onClick={share} className={base} style={shared ? on : off}>
        {shared ? '✓ Link copied' : '↗ Share'}
      </button>
      <button type="button" onClick={fullscreen} className={base} style={off}>⛶ Fullscreen</button>
      {needsAuth && (
        <span className="text-xs w-full sm:w-auto" style={{ color: '#5a6a60' }}>
          <Link href="/login" style={{ color: '#166534', fontWeight: 700 }}>Sign in</Link> to like games.
        </span>
      )}
    </div>
  )
}
