// Thin server wrapper for /how-it-works. Exports the route metadata
// (which Next.js does not allow inside a 'use client' file) and renders
// the client-side Presentation component that holds the auto-scroll,
// narration, and slide state.

import Presentation from './Presentation'

export const metadata = {
  title: 'How GetGuac works — capture, parse, learn from every receipt',
  description: 'A visual walkthrough: snap or forward a receipt, Guac-AI extracts every detail, duplicates get caught, and the dashboard turns your spending into insight.',
}

export default function HowItWorksPage() {
  return <Presentation />
}
