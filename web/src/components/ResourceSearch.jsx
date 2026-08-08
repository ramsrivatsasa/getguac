'use client'
// The one search box on /resources, placed in the hero the way the design has
// it. It filters by hiding any element on the page carrying a data-search
// attribute — tool cards, guide cards, goal stories, articles and the .gov
// links alike.
//
// WHY THIS SHAPE: the hub renders most of its content on the server (the
// article corpus must not cross into the client bundle — see ResourcesBrowser).
// A search that owned the data would have to pull all of it client-side. Wide
// filtering over already-rendered DOM keeps the page a server render and costs
// one small component, and it is what the static resources pages already do.
//
// It also replaces a second search input that used to sit halfway down the page
// inside ResourcesBrowser, so the page had two boxes searching different halves
// of itself.
import { useRef, useState } from 'react'

export default function ResourceSearch() {
  const [q, setQ] = useState('')
  const [empty, setEmpty] = useState(false)
  const box = useRef(null)

  function apply(value) {
    setQ(value)
    const t = value.trim().toLowerCase()
    const nodes = document.querySelectorAll('[data-search]')
    let shown = 0
    nodes.forEach((el) => {
      const hay = `${el.dataset.search} ${el.textContent}`.toLowerCase()
      const hit = !t || hay.includes(t)
      el.hidden = !hit
      if (hit) shown++
    })
    // A section whose every card is hidden leaves a stranded heading, so fold
    // the whole section away with it.
    document.querySelectorAll('[data-search-group]').forEach((g) => {
      const items = g.querySelectorAll('[data-search]')
      g.hidden = items.length > 0 && [...items].every((el) => el.hidden)
    })
    setEmpty(t.length > 0 && shown === 0)
  }

  return (
    <>
      <label
        ref={box}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, maxWidth: 620, margin: '26px 0 0',
          padding: '7px 8px 7px 18px', border: '1px solid #dce7de', borderRadius: 999,
          background: '#fff', boxShadow: '0 18px 40px -30px rgba(10,35,20,.45)',
        }}
      >
        <span aria-hidden="true">🔎</span>
        <input
          type="search"
          value={q}
          onChange={(e) => apply(e.target.value)}
          placeholder="Search tools and guides"
          aria-label="Search resources"
          style={{ width: '100%', border: 0, outline: 0, background: 'transparent', padding: '8px 0' }}
        />
      </label>
      {empty && (
        <p style={{ marginTop: 12, color: '#65736a' }}>Nothing here matches “{q}”.</p>
      )}
    </>
  )
}
