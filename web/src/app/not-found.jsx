// Custom 404 page — replaces Next.js's default with a character
// Lottie + Smashlist-style copy. Renders for any URL that doesn't
// match a route, including deep links that go stale.
//
// The Lottie slot uses src="" — until you drop a real 404 JSON in
// place, LottieAnimation gracefully renders the fallback emoji. To
// wire in the iconscout 404 character: download the .json, save to
// web/src/lottie/404.json, then change this file to:
//
//   import notFoundLottie from '../lottie/404.json'
//   <LottieAnimation data={notFoundLottie} size={240} />

import Link from 'next/link'
import LottieAnimation from '../components/LottieAnimation'
import searchingLottie from '../lottie/searching.json'

export const metadata = {
  title: 'Page not found — GetGuac',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="flex items-center justify-center mb-6">
          <LottieAnimation
            data={searchingLottie}
            size={240}
            fallback="🔍"
          />
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
        <p className="text-[11px] text-gray-400 mt-10">
          Drop a 404-character Lottie JSON into <code className="font-mono">web/src/lottie/404.json</code> and update <code className="font-mono">app/not-found.jsx</code> to wire it in.
        </p>
      </div>
    </div>
  )
}
