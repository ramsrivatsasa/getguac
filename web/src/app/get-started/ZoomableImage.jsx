'use client'

import { useEffect, useState } from 'react'
import { Maximize2, X } from 'lucide-react'

export default function ZoomableImage({ src, alt, className = '', width = 1200, height = 780 }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', close)
      document.body.style.overflow = ''
    }
  }, [open])

  return <>
    <button type="button" className={`group relative block w-full cursor-zoom-in ${className}`} onClick={() => setOpen(true)} aria-label={`Enlarge image: ${alt}`}>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className="w-full"/>
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-[#173d27]/90 px-3 py-2 text-xs font-black text-white shadow-lg backdrop-blur transition group-hover:scale-105"><Maximize2 size={14}/> Zoom</span>
    </button>
    {open && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#07160d]/95 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
      <button type="button" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#173d27] shadow-xl" onClick={() => setOpen(false)} aria-label="Close enlarged image"><X size={24}/></button>
      <div className="max-h-full max-w-[1500px] overflow-auto" onClick={(event) => event.stopPropagation()}>
        <img src={src} alt={alt} width={width} height={height} className="h-auto max-h-[90vh] w-auto max-w-none rounded-2xl bg-white shadow-2xl sm:max-w-[92vw]"/>
      </div>
    </div>}
  </>
}
