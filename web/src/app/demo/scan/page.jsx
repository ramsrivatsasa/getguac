'use client'
// Preview of the full-screen receipt-scanning animation (the genie casting a
// spell + the money-magic hat conjuring cash, with the talking status bubble).
// Lets us see it without actually parsing a receipt. Toggle batch count.
import { useState } from 'react'
import ReceiptScanAnimation from '../../../components/ReceiptScanAnimation'

export default function ScanPreview() {
  const [count, setCount] = useState(1)
  return (
    <div className="min-h-screen bg-gray-100 flex items-end justify-center p-6 font-sans">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 bg-white rounded-full shadow-lg px-3 py-2 text-sm">
        <span className="font-semibold text-gray-600">Receipt scan preview:</span>
        <button onClick={() => setCount(0)} className={`px-3 py-1 rounded-full font-semibold ${count === 0 ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>Off</button>
        <button onClick={() => setCount(1)} className={`px-3 py-1 rounded-full font-semibold ${count === 1 ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>1 receipt</button>
        <button onClick={() => setCount(3)} className={`px-3 py-1 rounded-full font-semibold ${count === 3 ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>3 receipts</button>
      </div>
      <ReceiptScanAnimation count={count} />
    </div>
  )
}
