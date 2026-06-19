// /tour — the narrated product video (plays inline only) on top of the
// existing illustrated slideshow (reused from /how-it-works). Each slide now
// pairs its hand-drawn art with a small real app screenshot.
import Presentation from '../how-it-works/Presentation'

export const metadata = {
  title: 'Watch the GetGuac tour — narrated, end to end',
  description: 'A narrated walkthrough of GetGuac: snap a receipt, Guac-AI reads it, and GetGuac scores it, catches anomalies, and hunts the bank bites draining your money.',
}

export default function TourPage() {
  return (
    <div>
      {/* Narrated video hero */}
      <section className="bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <p className="uppercase tracking-wider text-xs font-bold text-lime-200">Narrated tour · ~1.5 min</p>
          <h1 className="text-3xl sm:text-5xl font-black mt-2 leading-tight">Watch how GetGuac works</h1>
          <p className="text-emerald-100 mt-3 text-lg">Receipts in, insight out — narrated, the whole flow end to end.</p>
          <div className="mt-8 flex justify-center">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src="/how-it-works-narrated.mp4"
              controls
              playsInline
              preload="metadata"
              poster="/showcase/dashboard.png"
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              className="rounded-2xl shadow-2xl max-h-[78vh] w-auto max-w-full bg-black ring-4 ring-white/15"
            />
          </div>
          <p className="text-emerald-200/80 text-sm mt-6">Prefer to read at your own pace? Scroll for the full slideshow ↓</p>
        </div>
      </section>

      {/* The existing illustrated, auto-narrated slideshow — small real
          screenshots now sit beside each illustration. Embedded = no nav. */}
      <Presentation embedded />
    </div>
  )
}
