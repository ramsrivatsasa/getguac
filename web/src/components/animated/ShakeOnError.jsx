'use client'
import { useEffect, useState } from 'react'

// Wraps a form / input and shakes it briefly when `trigger` flips
// truthy. Used by auth pages on invalid credentials and any other
// "no — try again" interaction. Keep the shake short (260ms) so it
// reads as feedback, not punishment.
//
//   <ShakeOnError trigger={hasError}>
//     <form>…</form>
//   </ShakeOnError>
export default function ShakeOnError({ trigger = false, children, className = '' }) {
  const [shake, setShake] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setShake(true)
    const t = setTimeout(() => setShake(false), 320)
    return () => clearTimeout(t)
  }, [trigger])
  return (
    <div className={`${shake ? 'anim-shake' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}
