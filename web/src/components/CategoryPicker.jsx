'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useCategories, useCreateCategory, categoryClass } from '../hooks/useCategories'

// Drop-in category dropdown. Shows presets + user custom categories, plus a
// "+ New category" option that pops a quick-create modal. Calls onChange(slug).
//
// Usage:
//   <CategoryPicker value={item.category} onChange={(slug) => save(slug)} />
export default function CategoryPicker({ value, onChange, className = '', size = 'sm', disabled = false, allowClear = true }) {
  const { categories } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)

  function handleChange(e) {
    const v = e.target.value
    if (v === '__new__') { setModalOpen(true); return }
    onChange(v || null)
  }

  const cls = `font-semibold rounded-full border focus:outline-none cursor-pointer font-sans ${categoryClass(value)} ${
    size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'
  } ${className}`

  return (
    <>
      <select value={value || ''} onChange={handleChange} disabled={disabled} title="Change category" className={cls}>
        {allowClear && <option value="">— Uncategorized</option>}
        <optgroup label="Presets">
          {categories.filter(c => !c.custom).map(c => (
            <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
          ))}
        </optgroup>
        {categories.some(c => c.custom) && (
          <optgroup label="Yours">
            {categories.filter(c => c.custom).map(c => (
              <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
            ))}
          </optgroup>
        )}
        <option value="__new__">+ New category…</option>
      </select>
      <CategoryCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(slug) => onChange(slug)} />
    </>
  )
}

const COLOR_OPTIONS = [
  { key: 'emerald', dot: 'bg-emerald-500' },
  { key: 'sky',     dot: 'bg-sky-500' },
  { key: 'indigo',  dot: 'bg-indigo-500' },
  { key: 'amber',   dot: 'bg-amber-500' },
  { key: 'lime',    dot: 'bg-lime-500' },
  { key: 'orange',  dot: 'bg-orange-500' },
  { key: 'rose',    dot: 'bg-rose-500' },
  { key: 'violet',  dot: 'bg-violet-500' },
  { key: 'fuchsia', dot: 'bg-fuchsia-500' },
  { key: 'pink',    dot: 'bg-pink-500' },
  { key: 'red',     dot: 'bg-red-500' },
  { key: 'gray',    dot: 'bg-gray-500' },
]

const EMOJI_SUGGESTIONS = ['📦','🥑','🍕','📱','🛠️','🚗','👕','💊','🎁','🐶','✈️','🏠','📚','🎵','💡','🌱','🛏️','💄','💼','🎮']

export function CategoryCreateModal({ open, onClose, onCreated }) {
  const create = useCreateCategory()
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const [color, setColor] = useState('emerald')

  if (!open) return null

  async function handleSave(e) {
    e.preventDefault()
    if (!label.trim()) return
    try {
      const cat = await create.mutateAsync({ label, emoji, color })
      toast.success(`Category "${cat.label}" created`)
      onCreated?.(cat.slug)
      setLabel(''); setEmoji('📦'); setColor('emerald')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSave}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h3 className="font-bold text-lg">New category</h3>
        </div>

        <div>
          <label className="label">Name</label>
          <input autoFocus className="input" placeholder="e.g. Pet supplies"
            value={label} onChange={e => setLabel(e.target.value)} maxLength={40} />
        </div>

        <div>
          <label className="label">Emoji</label>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI_SUGGESTIONS.map(e => (
              <button
                key={e} type="button" onClick={() => setEmoji(e)}
                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'bg-gray-50 hover:bg-emerald-50'
                }`}>{e}</button>
            ))}
          </div>
          <input className="input mt-2 text-sm" placeholder="Or type any emoji"
            value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 4))} />
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_OPTIONS.map(c => (
              <button key={c.key} type="button" onClick={() => setColor(c.key)}
                title={c.key}
                className={`w-7 h-7 rounded-full ${c.dot} transition-all ${
                  color === c.key ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                }`} />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={create.isPending || !label.trim()} className="btn-primary">
            {create.isPending ? 'Saving…' : 'Create'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
