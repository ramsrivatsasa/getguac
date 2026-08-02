'use client'
// The viewer's currency symbol, hydration-safe.
//
// 🔴 WHY A HOOK AND NOT A PLAIN FUNCTION — this is the whole point, do not
// "simplify" it back.
// Reading navigator.language directly inside render puts '$' in the server
// HTML and '€' in the client HTML. Measured: React #418/#423/#425 on every
// non-US locale, against a production build with zero. React responds by
// throwing away the server markup and re-rendering, which undoes the
// first-paint work done on /join the same day.
//
// useState(DEFAULT_SYMBOL) guarantees the first client render matches the
// server exactly. The effect then swaps in the real symbol — an ordinary
// post-mount state update, which React expects and handles without warnings.
//
// The visible cost is one frame of '$' before it settles. That is invisible
// on the pages this is used on, because their amounts arrive from a
// post-mount fetch and render after this has already resolved.
import { useEffect, useState } from 'react'
import { DEFAULT_SYMBOL, detectCurrency, symbolFor } from '../lib/currency'

export default function useCurrencySymbol() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)
  useEffect(() => {
    const next = symbolFor(detectCurrency())
    // Skip the state update entirely for the ~majority US case, so the common
    // path costs one render rather than two.
    if (next !== DEFAULT_SYMBOL) setSymbol(next)
  }, [])
  return symbol
}
