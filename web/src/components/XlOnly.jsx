'use client'
// Mounts children only at the xl breakpoint (≥1280px). CSS `hidden xl:block`
// alone isn't enough for ad slots: a display:none AdSlot still pushes to
// adsbygoogle with zero width and throws TagError on phones — this gate keeps
// rail content out of the tree entirely until the rail can actually show.
import { useEffect, useState } from 'react'

export default function XlOnly({ children }) {
  const [xl, setXl] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const on = () => setXl(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return xl ? children : null
}
