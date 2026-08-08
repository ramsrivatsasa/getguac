// /tour — the narrated product video (plays inline only) on top of the
// existing illustrated slideshow (reused from /how-it-works). Each slide now
// pairs its hand-drawn art with a small real app screenshot.
import MarketingShell from '../../components/MarketingShell'
import Presentation from '../how-it-works/Presentation'

export const metadata = {
  title: 'Watch the GetGuac tour — narrated, end to end',
  description: 'A narrated walkthrough of GetGuac: snap a receipt, Guac-AI reads it, and GetGuac scores it, catches anomalies, and hunts the bank bites draining your money.',
  alternates: { canonical: '/tour' },
}

export default function TourPage() {
  // The big narrated-video hero used to sit on top here. Removed so /tour
  // opens straight on the illustrated, auto-narrated slideshow at the normal
  // slide size instead of an oversized video banner.
  //
  // WRAPPED IN MarketingShell. This page rendered the bare deck — no header, no
  // nav, no footer — so it was the only public page on the site with no way out
  // of it except the browser back button, despite being linked from the footer
  // as "Watch the tour". /how-it-works embeds the same component inside the
  // shell and always has. Being outside it also left this the last page whose
  // headings were 900 weight at -0.025em tracking while every other page had
  // settled on 800 at -0.05em.
  return (
    <MarketingShell subtitle="tour">
      <Presentation embedded />
    </MarketingShell>
  )
}
