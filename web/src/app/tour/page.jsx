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
      {/* Narrated video hero — two columns so the phone-shaped (portrait)
          video sits beside the copy instead of floating alone in a wide,
          mostly-empty green band. Stacks on mobile. */}
      <section className="bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <p className="uppercase tracking-wider text-xs font-bold text-lime-200">Narrated tour · ~1.5 min</p>
              <h1 className="text-3xl sm:text-5xl font-black mt-2 leading-tight">Watch how GetGuac works</h1>
              <p className="text-emerald-100 mt-3 text-base sm:text-lg max-w-lg mx-auto lg:mx-0">Receipts in, insight out — narrated, the whole flow end to end.</p>
              <div className="mt-5 flex flex-wrap gap-2 justify-center lg:justify-start">
                {['📸 Capture', '✨ Guac-AI reads it', '📊 See where it went', '🛡️ Private by default'].map((c) => (
                  <span key={c} className="px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/15 text-white text-xs font-bold">{c}</span>
                ))}
              </div>
              <p className="text-emerald-200/80 text-sm mt-6">Prefer to read at your own pace? Scroll for the full slideshow ↓</p>
            </div>
            <div className="flex justify-center lg:justify-end">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src="/how-it-works-narrated.mp4"
                controls
                playsInline
                preload="metadata"
                poster="/showcase/dashboard.png"
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
                className="rounded-2xl shadow-2xl w-auto max-w-[280px] sm:max-w-[320px] max-h-[68vh] bg-black ring-4 ring-white/15"
              />
            </div>
          </div>
        </div>
      </section>

      {/* The existing illustrated, auto-narrated slideshow — small real
          screenshots now sit beside each illustration. Embedded = no nav. */}
      <Presentation embedded />
    </div>
  )
}
