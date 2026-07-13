'use client'
// Floating Guac AI chatbot — a persistent launcher in the bottom-right of the
// dashboard that pops open the assistant (GuacAiThread → /api/chat) in place,
// so users can ask about their money from any page without leaving it. Sits
// above the QuickAddReceipt FAB (bottom-6) so the two don't collide.
import { useState } from 'react'
import GuacMascot from './GuacMascot'
import GuacAiThread from './GuacAiThread'

export default function GuacAiPopup() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && (
        <div className="fixed z-[60] right-4 sm:right-5 bottom-24 w-[min(384px,calc(100vw-2rem))] rounded-2xl overflow-hidden bg-white shadow-2xl ring-1 ring-guac-700/15">
          <GuacAiThread onClose={() => setOpen(false)} heightClass="h-[min(70vh,560px)]" />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Guac AI' : 'Ask Guac AI'}
        className="fixed z-[60] right-4 sm:right-5 bottom-24 items-center gap-2 rounded-full bg-white shadow-lg ring-1 ring-guac-700/15 pl-1.5 pr-4 py-1.5 hover:-translate-y-0.5 transition-transform"
        style={{ display: open ? 'none' : 'flex' }}
      >
        <GuacMascot expression="happy" size={30} className="shrink-0" />
        <span className="text-sm font-extrabold" style={{ color: '#15281C' }}>Guac AI</span>
      </button>
    </>
  )
}
