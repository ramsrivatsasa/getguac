'use client'
// /join — the demo_3 design, ported from public/join_demo_3_local.html.
//
// The previous client (JoinClient.jsx) is untouched on disk. Reverting is one
// line in page.jsx: swap this import back. Nothing was deleted.
//
// 🔒 THE CSS LIVES IN join-v3.css, NOT IN A <style> TAG.
// React escapes <, >, & and " in the text child of a style element. Those
// characters ship HTML-escaped, are never decoded inside a stylesheet, and
// produce an invalid rule PLUS a text-content hydration error. This design has
// 10 child combinators and 58 quoted strings in its CSS — every one of them
// would break. That exact bug has shipped to this production twice.
//
// 🔒 THE MARKUP IS INJECTED, NOT HAND-CONVERTED TO JSX.
// It is 13KB of static marketing HTML with no React state in it. Converting it
// by hand means re-typing every attribute (class/for/tabindex/self-closing tags)
// and re-doing that on every design change. Injecting keeps the HTML file the
// single source of truth: edit the demo, rerun the port, done.
//
// The eight-stage loop's behaviour is the demo's own script, run once on mount.
import { useEffect, useRef } from 'react'
import './join-v3.css'
import { MARKUP, BEHAVIOUR } from './joinV3Content'
import MetaPixel from '../../components/MetaPixel'

// The current generated port still has the store badges below the hero image.
// Move that same row below the primary CTAs, matching the source demo and the
// requested layout, without hand-editing the generated file.
const STORE_ROW = MARKUP.match(/\s*<div class="store-row">[\s\S]*?<\/div>/)?.[0] || ''
const JOIN_MARKUP = MARKUP
  .replace(STORE_ROW, '')
  .replace('<div class="micro">', `${STORE_ROW}\n            <div class="micro">`)

export default function JoinV3Client() {
  const host = useRef(null)

  useEffect(() => {
    // The demo's script queries the document directly and wires the loop rail,
    // the lightbox and the header shadow. It is idempotent per mount; guard so
    // a fast-refresh double-invoke cannot bind the listeners twice.
    if (!host.current || host.current.dataset.wired === '1') return
    host.current.dataset.wired = '1'
    try {
      // eslint-disable-next-line no-new-func
      new Function(BEHAVIOUR)()
    } catch (err) {
      // A broken widget must never take the page down — the content above it is
      // the part that has to render for an ad click to be worth anything.
      console.error('[join-v3] behaviour failed to initialise', err)
    }
  }, [])

  return (
    <>
      {/* The ad's landing page. This port replaced JoinClient.jsx, which carried
          the pixel — without it here /join was the ONE page the tracker missed,
          so every paid click landed untracked and never entered the retargeting
          audience. Mounted per-page, not in the root layout, so the tracker
          never runs on a signed-in receipts page. */}
      <MetaPixel />
      <div ref={host} dangerouslySetInnerHTML={{ __html: JOIN_MARKUP }} />
    </>
  )
}
