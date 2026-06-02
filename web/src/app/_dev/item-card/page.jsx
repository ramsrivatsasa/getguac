'use client'
// Item-card contract showcase — visual audit page that pumps every
// scenario from `test-fixtures/item-card-scenarios.json` through the
// real React ItemRowCard component. Pair with:
//
//   - mobile/test/widgets/fetch_card_scenarios_test.dart (Flutter)
//   - test-fixtures/Item-Card-Contract.pdf (visual reference)
//
// If a rendered card here doesn't match the PDF / mobile screenshot
// for the same scenario id, the React implementation has drifted
// from the canonical contract — fix the implementation, not the spec.
//
// Reachable at /_dev/item-card on the web app. Server-side fetches
// the spec file so this stays in sync without an explicit copy.

import { useEffect, useState } from 'react'
import ItemRowCard from '../../../components/ItemRowCard'

export default function ItemCardShowcase() {
  const [data, setData] = useState(null)
  useEffect(() => {
    // Reads from /public via fetch — the spec file is also copied to
    // /public/item-card-scenarios.json by the showcase build step so
    // the runtime doesn't need filesystem access. Falls back to a
    // hardcoded subset if the file isn't there yet.
    fetch('/item-card-scenarios.json')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (!data) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-gray-500">
          Loading <code>/item-card-scenarios.json</code>… If this never resolves,
          run <code>node web/scripts/render-item-card-scenarios.mjs</code> first
          (it copies the spec to /public).
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">
          Item Card — Contract Showcase
        </h1>
        <p className="text-sm text-gray-500 mt-2 max-w-3xl">
          {data.scenarios.length} scenarios from <code>test-fixtures/item-card-scenarios.json</code>,
          rendered through the React <code>ItemRowCard</code> implementation. Mobile pumps the same
          file through Flutter <code>FetchCard</code> in a widget test. If a card here doesn&apos;t
          match the <a href="/item-card-contract.pdf" className="underline text-emerald-700">PDF reference</a>,
          the implementation has drifted from the spec.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.scenarios.map((s) => (
          <section key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-[13px] font-extrabold text-gray-900">{s.title}</p>
              <p className="text-[10px] font-mono text-gray-400 mt-0.5">{s.id}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">{s.description}</p>
            </div>
            <RenderCard props={s.props} />
          </section>
        ))}
      </div>
    </main>
  )
}

// Translate the JSON 'noop' sentinel into actual callback functions
// so onRate/onShare/onMenu etc. wire up. The point of the showcase
// is just to verify the visual output — callbacks are inert.
function RenderCard({ props }) {
  const mapped = { ...props }
  for (const k of Object.keys(mapped)) {
    if (mapped[k] === 'noop') mapped[k] = () => {}
  }
  return <ItemRowCard {...mapped} />
}
