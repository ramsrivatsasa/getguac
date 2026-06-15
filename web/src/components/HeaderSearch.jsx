import { Search } from 'lucide-react'

// Compact Marketplace search for the top header bar. Native GET form → fully
// server-safe (no client JS): submitting navigates to /marketplace?q=… which
// runs the live best-price search. Used in the home header + MarketingShell.
export default function HeaderSearch({ className = '' }) {
  return (
    <form action="/marketplace" method="GET" role="search" className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        name="q"
        placeholder="Search products or stores…"
        aria-label="Search the GetGuac Marketplace"
        autoComplete="off"
        className="w-full pl-9 pr-3 py-2 rounded-full border border-emerald-200 bg-white/90 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
    </form>
  )
}
