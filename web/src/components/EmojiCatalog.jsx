'use client'
import { useMemo, useState } from 'react'
import { EMOJI_SECTIONS, searchEmoji } from '../lib/emoji-catalog'

// Sectioned emoji picker with a search box. Used inside CategoryCreateModal so
// users can find ☕ by typing "starbucks" or 🍻 by typing "bar". Keeps its own
// search-text state but emits onPick(emoji) so the parent owns the selected
// emoji.
export default function EmojiCatalog({ value, onPick, height = 240 }) {
  const [q, setQ] = useState('')

  const results = useMemo(() => (q ? searchEmoji(q, 120) : null), [q])

  return (
    <div>
      <input
        className="input mb-2 text-sm"
        placeholder="Search emojis (e.g. starbucks, beer, pet)"
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      <div className="overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2" style={{ maxHeight: height }}>
        {results ? (
          <Grid emojis={results} value={value} onPick={onPick} />
        ) : (
          EMOJI_SECTIONS.map(s => (
            <div key={s.id} className="mb-3 last:mb-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 px-1">{s.label}</div>
              <Grid emojis={s.emojis} value={value} onPick={onPick} />
            </div>
          ))
        )}
      </div>

      <input
        className="input mt-2 text-sm"
        placeholder="Or paste any emoji"
        value={value || ''}
        onChange={e => onPick(e.target.value.slice(0, 4))}
      />
    </div>
  )
}

function Grid({ emojis, value, onPick }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {emojis.map((e, i) => (
        <button
          key={`${e}-${i}`}
          type="button"
          onClick={() => onPick(e)}
          className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
            value === e ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'bg-white hover:bg-emerald-50'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
