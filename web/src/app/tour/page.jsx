// /tour — the narrated product video (plays inline only) on top of the
// existing illustrated slideshow (reused from /how-it-works). Each slide now
// pairs its hand-drawn art with a small real app screenshot.
import Presentation from '../how-it-works/Presentation'

export const metadata = {
  title: 'Watch the GetGuac tour — narrated, end to end',
  description: 'A narrated walkthrough of GetGuac: snap a receipt, Guac-AI reads it, and GetGuac scores it, catches anomalies, and hunts the bank bites draining your money.',
}

export default function TourPage() {
  // The big narrated-video hero used to sit on top here. Removed so /tour
  // opens straight on the illustrated, auto-narrated slideshow at the normal
  // slide size instead of an oversized video banner.
  return <Presentation embedded />
}
