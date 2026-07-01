'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { useCategories, useCreateCategory, categoryClass } from '../hooks/useCategories'
import { HEALTH_TIERS } from '../lib/categories'
import EmojiCatalog from './EmojiCatalog'

// Drop-in category dropdown. Shows presets + user custom categories, plus a
// "+ New category" option that pops a quick-create modal. Calls onChange(slug).
//
// Default `size` is now comfortably tappable (≥32 px). Use size="xs" only when
// the chip lives in a dense table cell (e.g. receipt line items).
//
// Usage:
//   <CategoryPicker value={item.category} onChange={(slug) => save(slug)} />
//   <CategoryCreatePill onCreated={(slug) => save(slug)} />   // separate "+ New" affordance
export default function CategoryPicker({ value, onChange, className = '', size = 'md', disabled = false, allowClear = true, hideEmoji = false, soft = false }) {
  const { categories } = useCategories()
  const [modalOpen, setModalOpen] = useState(false)

  function handleChange(e) {
    const v = e.target.value
    if (v === '__new__') { setModalOpen(true); return }
    onChange(v || null)
  }

  // soft pills hug their text: explicit pl/pr (room for the custom caret on the
  // right) instead of symmetric px, and a touch taller (py-1.5).
  const sizeCls = soft
    ? 'text-[12px] pl-3 pr-6 py-1.5'
    : size === 'xs'
      ? 'text-[10px] px-2 py-0.5'
      : size === 'sm'
        ? 'text-xs px-2.5 py-1'
        : 'text-xs px-3 py-1.5'

  // soft = borderless 8px pill in the inherited body font (redesign receipts
  // table); default keeps the 1px-outlined full pill used elsewhere. The
  // uncategorized chip in soft mode uses the mockup's pale grey-green tone
  // instead of the heavier default gray.
  const toneCls = (!value && soft) ? 'bg-[#F2F4EF] text-[#9AA89E]' : categoryClass(value)
  const cls = `${soft ? 'appearance-none bg-no-repeat font-bold rounded-lg' : 'font-semibold rounded-full border font-sans'} focus:outline-none cursor-pointer ${toneCls} ${sizeCls} ${className}`

  return (
    <>
      <select value={value || ''} onChange={handleChange} disabled={disabled} title="Change category" className={cls}
        style={soft ? { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239AA89E' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 7px center', backgroundSize: '11px' } : undefined}>
        {allowClear && <option value="">Uncategorized</option>}
        <optgroup label="Presets">
          {categories.filter(c => !c.custom).map(c => (
            <option key={c.slug} value={c.slug}>{hideEmoji ? c.label : `${c.emoji} ${c.label}`}</option>
          ))}
        </optgroup>
        {categories.some(c => c.custom) && (
          <optgroup label="Yours">
            {categories.filter(c => c.custom).map(c => (
              <option key={c.slug} value={c.slug}>{hideEmoji ? c.label : `${c.emoji} ${c.label}`}</option>
            ))}
          </optgroup>
        )}
        <option value="__new__">+ New category…</option>
      </select>
      <CategoryCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(slug) => onChange(slug)} />
    </>
  )
}

// Standalone "+ New" pill — shown alongside CategoryPicker on roomy surfaces
// (Stash cards, receipt details) so users don't have to open the dropdown
// just to discover the create-category flow.
export function CategoryCreatePill({ onCreated, className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Create a new category"
        className={`inline-flex items-center gap-1 rounded-full border border-dashed border-guac-600 bg-white px-3 py-1.5 text-xs font-semibold text-guac-700 hover:bg-guac-50 ${className}`}
      >
        <span className="text-base leading-none">＋</span>
        <span>New</span>
      </button>
      <CategoryCreateModal open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </>
  )
}

const COLOR_OPTIONS = [
  { key: 'emerald', dot: 'bg-guac-600' },
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

const TIER_LABELS = {
  healthy: 'Healthy 🥦',
  neutral: 'Neutral 🥖',
  treat:   'Treat 🍰',
  harmful: 'Unhealthy 🍩',
}

export function CategoryCreateModal({ open, onClose, onCreated }) {
  const create = useCreateCategory()
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('📦')
  const [color, setColor] = useState('emerald')
  const [healthTier, setHealthTier] = useState('neutral')

  if (!open) return null
  if (typeof document === 'undefined') return null

  async function handleSave(e) {
    e.preventDefault()
    if (!label.trim()) return
    try {
      const cat = await create.mutateAsync({ label, emoji, color, health_tier: healthTier })
      toast.success(`Category "${cat.label}" created`)
      onCreated?.(cat.slug)
      setLabel(''); setEmoji('📦'); setColor('emerald'); setHealthTier('neutral')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSave}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h3 className="font-bold text-lg">New category</h3>
        </div>

        <div>
          <label className="label">Name</label>
          <input autoFocus className="input text-base py-2.5" placeholder="e.g. Pet supplies"
            value={label} onChange={e => setLabel(e.target.value)} maxLength={40} />
        </div>

        <div>
          <label className="label">Emoji</label>
          <EmojiCatalog value={emoji} onPick={setEmoji} />
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

        <div>
          <label className="label">Health tier <span className="text-gray-400 font-normal">(for the future Guac Health Score)</span></label>
          <select className="input" value={healthTier} onChange={e => setHealthTier(e.target.value)}>
            {HEALTH_TIERS.map(t => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={create.isPending || !label.trim()} className="btn-primary">
            {create.isPending ? 'Saving…' : 'Create'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>,
    document.body
  )
}
