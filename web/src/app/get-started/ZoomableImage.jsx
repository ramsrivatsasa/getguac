'use client'

import { useRef } from 'react'
import { Maximize2, X } from 'lucide-react'

export default function ZoomableImage({ src, alt, className = '', imageClassName = '', width = 1200, height = 780, loading = 'lazy', showZoom = true }) {
  const dialog = useRef(null)
  return <>
    <button type="button" className={`group relative block min-h-11 w-full cursor-zoom-in rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 ${className}`} onClick={() => dialog.current?.showModal()} aria-label={`Enlarge image: ${alt}`}>
      <img src={src} alt={alt} width={width} height={height} loading={loading} decoding="async" className={`h-auto w-full object-contain ${imageClassName}`}/>
      {showZoom && <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-lg"><Maximize2 size={14}/> Zoom</span>}
    </button>
    <dialog ref={dialog} aria-label={alt} className="m-auto max-h-[96vh] w-[96vw] max-w-[1500px] rounded-2xl bg-white p-3 shadow-2xl backdrop:bg-slate-900/70 sm:p-5" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-700">{alt}</p><button type="button" autoFocus className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-900" onClick={() => dialog.current?.close()} aria-label="Close enlarged image"><X size={24}/></button></div>
      <div className="max-h-[78vh] overflow-auto"><img src={src} alt={alt} width={width} height={height} className="mx-auto h-auto max-h-[75vh] w-auto max-w-full object-contain"/></div>
    </dialog>
  </>
}
