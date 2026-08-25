// Custom 404 page — replaces Next.js's default with our mascot
// (holding a magnifying glass, "searching" for the page) + Shopping List-
// style copy. Renders for any URL that doesn't match a route.

import Link from 'next/link'
import GuacMascotAnimated from '../components/GuacMascotAnimated'

export const metadata = {
  title: 'Page not found — GetGuac',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="flex items-center justify-center mb-6">
          <GuacMascotAnimated animation="search" size={200} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 mb-2">
          Oops, page not found
        </h1>
        <p className="text-base text-gray-500 mb-8 leading-relaxed">
          Nobody&apos;s here — this URL doesn&apos;t match anything in GetGuac.
          Could be a stale link, a typo, or something we moved.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/dashboard"
            className="px-5 py-3 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white font-bold shadow hover:shadow-lg transition-all"
          >
            Go to dashboard
          </Link>
          <Link
            href="/receipts"
            className="px-5 py-3 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-bold hover:border-emerald-200 hover:text-emerald-700 transition-all"
          >
            See receipts
          </Link>
        </div>
      </div>
    </div>
  )
}
