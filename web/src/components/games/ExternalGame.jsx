'use client'
// Player for a third-party game — the <iframe> half of the arcade.
//
// The game itself is hosted and monetized by the provider (see
// lib/gameProviders.js); we contribute the frame, the sizing, and the safety
// rails. Everything visual is matched to arcadeKit.GameFrame so an embedded
// game sits in the same stage as our 36 hand-built ones instead of looking
// bolted on.

import { useEffect, useRef, useState } from 'react'
import { embedUrlFor } from '../../lib/gameProviders'

// Same height envelope every in-house game uses (arcadeKit.GameFrame), so the
// stage doesn't jump when you click between an embedded game and one of ours.
// svh, not dvh: mobile browsers briefly report dvh as full-screen before the
// URL bar shrinks, which made games load big and then snap.
const STAGE_H = 'clamp(470px, calc(100svh - 170px), 900px)'

export default function ExternalGame({ game }) {
  const [embedded, setEmbedded] = useState(null)   // null = undetermined
  const [loaded, setLoaded] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    // Inside the GetGuac app's WebView the /embed handover drops a
    // `guac_embedded` cookie. Third-party ad-serving iframes inside an app
    // WebView are an AdSense/AdMob policy violation and an app-store review
    // risk, and unlike <AdSlot/> we cannot suppress the ads inside someone
    // else's game. So the app gets a link out to the browser instead.
    //
    // The cookie is the ONLY signal, deliberately. ?play=browser must never
    // override it: on an app build older than this change the delegate still
    // keeps getguac.app inside the WebView, so a URL param that forced the game
    // to render would embed a third-party ad iframe in the app — worse than the
    // dead end it was meant to fix. The handoff tab is a Custom Tab /
    // SFSafariViewController with its own cookie jar, so the cookie is simply
    // absent there and the game plays.
    setEmbedded(document.cookie.split('; ').some((c) => c === 'guac_embedded=1'))
  }, [])

  const src = embedUrlFor(game, { referrer: `https://getguac.app${game.href}` })

  const goFullscreen = () => {
    const el = wrapRef.current
    if (!el) return
    // iOS Safari has no Element.requestFullscreen — the call is simply absent,
    // so feature-detect rather than try/catch.
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  }

  if (!src) {
    return (
      <div className="w-full rounded-2xl grid place-items-center text-center px-6"
        style={{ minHeight: STAGE_H, background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)' }}>
        <p className="text-sm" style={{ color: '#5a6a60' }}>This game is temporarily unavailable.</p>
      </div>
    )
  }

  // Wait for the cookie check before painting — rendering the iframe first and
  // pulling it back would already have fired the provider's ad request inside
  // the WebView, which is the exact thing we're avoiding.
  if (embedded === null) {
    return <div className="w-full rounded-2xl" style={{ minHeight: STAGE_H, background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)' }} />
  }

  if (embedded) {
    return (
      <div className="w-full rounded-2xl grid place-items-center text-center px-6"
        style={{ minHeight: STAGE_H, background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)' }}>
        <div>
          <div aria-hidden style={{ fontSize: 40 }}>🎮</div>
          <p className="font-display font-extrabold text-lg mt-3 mb-1.5" style={{ color: '#15201a' }}>{game.name} opens in a browser tab</p>
          <p className="text-sm m-0 mb-4 mx-auto" style={{ color: '#5a6a60', maxWidth: 380 }}>
            Guest games come from our partner network, so they play in a tab instead of inside the app. It opens right on top — close it and you&rsquo;re back here.
          </p>
          {/* ?play=browser is the signal the app's WebView looks for. Without it
              the navigation delegate keeps getguac.app URLs INSIDE the WebView,
              so this button reloaded the same screen forever. target="_blank"
              is also a no-op in the Android WebView (no onCreateWindow), which
              is why the old version did nothing at all on mobile. */}
          <a href={`https://getguac.app${game.href}?play=browser`} rel="noopener noreferrer"
            className="inline-block rounded-full px-5 py-2.5 font-display font-extrabold text-sm no-underline"
            style={{ background: '#166534', color: '#fff' }}>
            Play {game.name}
          </a>
        </div>
      </div>
    )
  }

  // A quarter of the GamePix catalog is portrait. Stretching one across a wide
  // stage leaves the game letterboxed in its own black bars, so portrait games
  // get a narrow centred column instead of the full width.
  const portrait = game.orientation === 'portrait'

  return (
    <div ref={wrapRef} className="relative w-full rounded-2xl overflow-hidden mx-auto"
      style={{
        height: STAGE_H,
        maxWidth: portrait ? 'min(100%, 520px)' : undefined,
        background: 'linear-gradient(180deg, #f2fbf3 0%, #eaf6ec 100%)',
      }}>

      {!loaded && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="text-sm font-semibold" style={{ color: '#5a6a60' }}>Loading {game.name}…</span>
        </div>
      )}

      <iframe
        src={src}
        title={game.name}
        onLoad={() => setLoaded(true)}
        className="w-full h-full block"
        style={{ border: 0, opacity: loaded ? 1 : 0, transition: 'opacity .25s' }}
        allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
        allowFullScreen
        // The cross-origin boundary already stops the game touching our page.
        // What sandbox adds here is the ABSENCE of allow-top-navigation: an ad
        // creative inside the game cannot force-redirect getguac.app out from
        // under the player. allow-popups (+escape-sandbox) keeps legitimate ad
        // click-through working in a new tab.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-pointer-lock allow-orientation-lock allow-presentation allow-modals"
      />

      <button type="button" onClick={goFullscreen}
        className="absolute top-3 right-3 rounded-full px-3 py-1.5 text-xs font-extrabold"
        style={{ background: 'rgba(255,255,255,.92)', color: '#15201a', border: '1px solid #e4ebe2' }}>
        ⛶ Fullscreen
      </button>
    </div>
  )
}
