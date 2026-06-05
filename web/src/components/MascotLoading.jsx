'use client'
// Centered loading state using OUR avocado mascot (gentle idle breathe),
// replacing the generic concentric-rings "thinking" Lottie. Vertically
// centers in the content area so it sits in the page center, not the top.
import GuacMascotAnimated from './GuacMascotAnimated'

export default function MascotLoading({ label = 'Loading…', size = 120, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-gray-400 min-h-[60vh] ${className}`}>
      <GuacMascotAnimated animation="idle" size={size} />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  )
}
