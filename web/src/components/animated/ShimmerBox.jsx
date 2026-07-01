'use client'

// Loading skeleton. The shimmer sweep is a single CSS animation
// (`anim-shimmer`) defined in globals.css. Use anywhere a piece of
// data is loading and you'd otherwise render a blank div or a
// spinner — this gives the user a layout hint while waiting.
//
//   <ShimmerBox className="h-6 w-24" />
//   <ShimmerBox className="h-32 w-full rounded-2xl" />
//
// Props:
//   className   tailwind sizing/shape (always pass at least h- and w-)
//   rounded     'full' | 'lg' | '2xl' | false; defaults to '2xl'
//   tone        'emerald' | 'gray'; defaults to 'gray' for neutral
export default function ShimmerBox({ className = '', rounded = '2xl', tone = 'gray' }) {
  const radius =
    rounded === 'full' ? 'rounded-full' :
    rounded === 'lg'   ? 'rounded-lg' :
    rounded === '2xl'  ? 'rounded-2xl' :
    rounded === false  ? '' : 'rounded-xl'
  const base = tone === 'emerald'
    ? 'bg-guac-50/60'
    : 'bg-gray-100'
  return (
    <div className={`anim-shimmer ${base} ${radius} ${className}`} aria-hidden="true" />
  )
}
