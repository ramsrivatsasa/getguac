'use client'

import { useEffect, useRef } from 'react'

export default function HomeStandaloneClient({ markup, css, script }) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    try {
      // The approved standalone design already contains the carousel, receipt
      // circle, zoom dialog and reveal behaviour. Execute it after React has
      // mounted the matching markup.
      const runHomepage = new Function(script)
      runHomepage()
    } catch (error) {
      console.error('Homepage interaction initialization failed', error)
    }
  }, [script])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: markup }} />
    </>
  )
}
