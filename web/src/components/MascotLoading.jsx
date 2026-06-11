'use client'
// Centered, neutral loading state — a subtle spinner + label. (Previously
// showed the avocado mascot; removed so no mascot/animation flashes while a
// page loads.) `size` is kept for call-site compatibility but no longer drives
// a mascot. Vertically centers in the content area.
export default function MascotLoading({ label = 'Loading…', size = 120, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-gray-400 min-h-[60vh] ${className}`}>
      <div className="w-7 h-7 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  )
}
