// Thin server wrapper for /how-it-works. Exports the route metadata
// (which Next.js does not allow inside a 'use client' file) and renders
// the client-side Presentation component that holds the auto-scroll,
// narration, and slide state.

import Presentation from './Presentation'

export const metadata = {
  title: 'How GetGuac works — capture, parse, learn from every receipt',
  description: 'A visual walkthrough: snap or forward a receipt, Guac-AI extracts every detail, duplicates get caught, the Smashlist predicts your next shopping trip, Steals finds a better price, and GuacMoney keeps score of every dollar you keep.',
}

// YouTube id of the how-it-works walkthrough video. Empty string hides the
// video section entirely (pre-upload / if the video is ever taken down).
const HOW_IT_WORKS_YOUTUBE_ID = '-xJ9kULN4Q4'

export default function HowItWorksPage() {
  return (
    <>
      {HOW_IT_WORKS_YOUTUBE_ID && (
        <section className="bg-white px-4 pt-10 pb-2">
          <div className="mx-auto max-w-4xl">
            <h2 className="gg-h2 text-center mb-4">Watch how it works</h2>
            <div className="relative w-full overflow-hidden rounded-2xl shadow-lg" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${HOW_IT_WORKS_YOUTUBE_ID}`}
                title="How GetGuac works — full walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}
      <Presentation />
    </>
  )
}
