import AdSenseScript from '../../components/AdSenseScript'
// Guac Arcade typography. Loads the arcade's display + body typefaces —
// Nunito (numbers, scores, headings) and Outfit (body, labels, hints) — under
// their LITERAL family names. That matters because the games draw text on a
// <canvas>, and ctx.font can only use a real family string; the site's
// next/font faces are hashed and unusable there. Scoped to /games via this
// route-group layout so the rest of GetGuac keeps its Bricolage + Jakarta.
// This layout also NOINDEXES the whole arcade. AdSense keeps rejecting the site
// for "Low value content", and roughly half of every URL we submit is a game
// page — a canvas plus a few dozen words of templated text. Judged as a whole
// that reads as thin, and it drags down the 20 long-form money articles that are
// genuinely the site's best content. Keeping the arcade out of the index lets
// Google evaluate GetGuac on the articles instead.
//
// `follow: true` — crawlers still walk the links out of here, so the arcade keeps
// passing authority to the articles and marketing pages; it just isn't indexed
// itself. Child pages inherit this because none of them set `robots`.
// To reverse after approval: delete this export, re-add the game routes to
// app/sitemap.js, and set NEXT_PUBLIC_ARCADE_ADS=on (see lib/arcadeAds).
export const metadata = {
  robots: { index: false, follow: true },
}

export default function GamesLayout({ children }) {
  return (
    <>
      {/* The arcade's fullscreen ad breaks (adBreak in arcadeKit) push onto
          window.adsbygoogle directly, with no <AdSlot/> on the page to pull the
          loader in. Mount it for the whole route group so moving the script out
          of the root layout does not silently kill interstitial revenue. */}
      <AdSenseScript />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Outfit:wght@400;500;600;700;800&display=swap"
      />
      {children}
    </>
  )
}
