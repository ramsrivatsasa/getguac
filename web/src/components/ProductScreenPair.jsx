import { Smartphone } from 'lucide-react'
import ZoomableImage from '../app/get-started/ZoomableImage'

export default function ProductScreenPair({ webSrc, phoneSrc, webAlt, phoneAlt, eager = false }) {
  return <figure data-product-composition="cross-device" className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_22%] items-end gap-3 bg-transparent" aria-label={`${webAlt} with supporting mobile view`}>
    <ZoomableImage src={webSrc} alt={webAlt} width={900} height={563} loading={eager ? 'eager' : 'lazy'} showZoom={false} className="min-w-0" imageClassName="block h-auto w-full object-contain"/>
    <span data-device="phone" className="hidden min-w-0 sm:block">
      <ZoomableImage src={phoneSrc} alt={phoneAlt} width={360} height={757} loading={eager ? 'eager' : 'lazy'} showZoom={false} imageClassName="block h-auto w-full object-contain"/>
    </span>
    <details className="sm:hidden">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Smartphone size={19} aria-hidden="true"/>See the mobile view</summary>
      <div className="mx-auto mt-4 w-full max-w-[240px]">
        <ZoomableImage src={phoneSrc} alt={phoneAlt} width={360} height={757} loading="lazy" showZoom={false} imageClassName="block h-auto w-full object-contain"/>
      </div>
    </details>
  </figure>
}
