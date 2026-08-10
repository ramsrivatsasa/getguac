// LOCAL-ONLY sign-in page — the /login page with the challenge taken out.
//
// The real /login keeps its word-sum challenge, and it has to: the check is
// enforced SERVER-SIDE in /api/auth/sign-in for demo@getguac.app specifically,
// because that account's password is published on the site. Deleting the widget
// from a copy of the page would not have signed anyone in — the API returns 403
// when demo_token/demo_answer are missing, whatever the form looks like.
//
// So this copy posts to /dev-signin instead, which authenticates through
// Supabase directly. The public login flow and its guard are untouched.
//
// It renders ONLY when devSignInAllowed() passes — same three gates as the
// route it posts to (not production, localhost host, GG_DEV_SIGNIN=1), read
// from one shared function so the page can never outlive the endpoint:
//
//   GG_DEV_SIGNIN=1 GG_DIST_DIR=.next-claude npx next dev -p 3001
//   http://localhost:3001/dev-login
//
import { notFound } from 'next/navigation'
import { devSignInAllowed } from '../dev-signin/route'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Dev sign in', robots: { index: false, follow: false } }

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@getguac.app'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Guac!Demo2026'

const SHORTCUTS = [
  ['/reports', 'Reports'],
  ['/receipts', 'Receipts'],
  ['/bills', 'Bills'],
  ['/dashboard', 'Dashboard'],
  ['/stash', 'Stash'],
  ['/steals', 'Steals'],
]

export default function DevLoginPage() {
  if (!devSignInAllowed()) notFound()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7f3df] via-[#eef7e7] to-white p-5">
      <div className="w-full max-w-md rounded-3xl border border-emerald-950/10 bg-white p-8 shadow-2xl shadow-emerald-950/10">
        <div className="flex items-center gap-2 text-2xl font-black text-[#12261B]">
          <span aria-hidden="true">🥑</span> GetGuac
        </div>
        <p className="mt-1 text-[11px] font-black uppercase tracking-[.16em] text-lime-700">
          Local dev sign in
        </p>

        <h1 className="mt-5 text-3xl font-black leading-tight text-[#16331f]">Welcome back.</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Signs in through Supabase directly, so no challenge is needed. This page only
          exists on localhost — the public <code className="rounded bg-gray-100 px-1">/login</code> keeps its check.
        </p>

        <form action="/dev-signin" method="post" className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Username or email</span>
            <input
              name="email"
              type="text"
              defaultValue={DEMO_EMAIL}
              autoComplete="username"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Password</span>
            <input
              name="password"
              type="password"
              defaultValue={DEMO_PASSWORD}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">Land on</span>
            <input
              name="next"
              type="text"
              defaultValue="/reports"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-[#12341F] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#1B4A2C]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-[11px] font-black uppercase tracking-wider text-gray-400">Straight to a screen</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SHORTCUTS.map(([href, label]) => (
            <a
              key={href}
              href={`/dev-signin?next=${encodeURIComponent(href)}`}
              className="rounded-full border border-emerald-950/10 bg-[#f5f8ed] px-3 py-1.5 text-xs font-extrabold text-[#31533a] transition hover:border-lime-500 hover:text-[#173d27]"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
