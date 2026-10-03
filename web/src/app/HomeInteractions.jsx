'use client'

import { useEffect, useRef } from 'react'

// Runs the standalone homepage's interaction script (carousel, receipt circle,
// zoom dialog, reveal behaviour) after mount. Renders nothing.
//
// WHY THIS IS SPLIT OUT: the markup used to live in a client component too, so
// React owned that entire blob and re-created it during hydration. First paint
// happened at ~660ms but the Largest Contentful Paint candidate was not
// registered until hydration finished around 3.4s — and under Lighthouse's Slow
// 4G with 4x CPU throttling that landed past the end of the trace, so PageSpeed
// reported NO_LCP and could not compute a Performance score at all.
//
// The markup and styles are now rendered by the server component in page.jsx.
// This island carries only the behaviour, so the DOM the server sent is the DOM
// that stays, and LCP is measured against the real first paint.
export default function HomeInteractions({ script }) {
  const initialized = useRef(false)

  useEffect(() => {
    // Delegate because the server-rendered homepage can arrive after this island.
    function calculate(event) {
      const form = event.target.closest?.('#tenCalc')
      if (!form) return
      event.preventDefault()
      const input = form.querySelector('#tenIncome')
      const output = document.getElementById('tenOut')
      if (!input || !output) return
      const raw = input.value.trim().replace(/,/g, '')
      const income = /^\d+(\.\d{1,2})?$/.test(raw) ? Number(raw) : NaN
      if (!Number.isFinite(income) || income <= 0) {
        input.setAttribute('aria-invalid', 'true')
        output.textContent = 'Enter a monthly income greater than zero.'
        return
      }
      input.removeAttribute('aria-invalid')
      output.textContent = `Your 10% target: $${Math.round(income * 0.1).toLocaleString('en-US')} a month.`
    }
    document.addEventListener('submit', calculate)
    document.addEventListener('change', calculate)
    return () => {
      document.removeEventListener('submit', calculate)
      document.removeEventListener('change', calculate)
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    try {
      const scriptElement = document.createElement('script')
      scriptElement.textContent = script
      document.body.appendChild(scriptElement)
      scriptElement.remove()
    } catch (error) {
      console.error('Homepage interaction initialization failed', error)
    }
  }, [script])

  return null
}
