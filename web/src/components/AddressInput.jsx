'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
// Free address autocomplete using OpenStreetMap Nominatim.
// Debounces 350ms (also respects Nominatim's 1 req/s policy).
// Calls onSelect({ address, lat, lng }) when the user picks a suggestion.
export default function AddressInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address…',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  // Debounced fetch
  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!value || value.trim().length < 3) { setResults([]); return }
    timerRef.current = setTimeout(() => search(value), 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, search])

  // Click outside → close
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function pick(r) {
    const addr = r.display_name
    onChange(addr)
    onSelect?.({ address: addr, lat: parseFloat(r.lat), lng: parseFloat(r.lon), raw: r.address })
    setOpen(false)
    setResults([])
  }

  function onKey(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(results.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)) }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pick(results[highlight]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value || ''}
          onChange={e => { onChange(e.target.value); setOpen(true); setHighlight(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="input pl-9 pr-8"
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 z-30 bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <li key={r.place_id}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(r) }}
              className={`px-3 py-2 cursor-pointer text-xs border-b border-gray-50 last:border-0 ${
                i === highlight ? 'bg-emerald-50' : 'hover:bg-gray-50'
              }`}>
              <div className="flex items-start gap-2">
                <MapPin size={11} className="mt-0.5 text-emerald-500 shrink-0" />
                <span className="text-gray-700 leading-snug">{r.display_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
