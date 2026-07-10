'use client'
// Client half of /delete-account — the sign-in check + self-serve deletion
// flow. Chrome (nav/footer) comes from MarketingShell in page.jsx. Required
// by Google Play's data-deletion policy: names the app, shows the deletion
// steps, and lists what data is deleted/kept + retention.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'

const CONFIRM = 'DELETE MY ACCOUNT'

export default function DeleteAccountClient() {
  const [user, setUser] = useState(undefined) // undefined = loading
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => setUser(data?.user || null)).catch(() => setUser(null))
  }, [])

  async function handleDelete() {
    setBusy(true); setError('')
    try {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      const resp = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ confirm_phrase: CONFIRM }),
      })
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(json.error || `Server error ${resp.status}`)
      await sb.auth.signOut().catch(() => {})
      setDone(true)
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-12 text-gray-800">
      <h1 className="text-3xl font-black text-emerald-900">Delete your GetGuac account &amp; data</h1>
      <p className="mt-3 text-gray-600">
        You can permanently delete your <strong>GetGuac</strong> account and all associated data at any time.
        This is irreversible.
      </p>

      {done ? (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-bold text-emerald-900">Your account and all data were deleted.</p>
          <p className="text-sm text-emerald-800 mt-1">You&apos;ve been signed out. Thanks for trying GetGuac.</p>
          <Link href="/" className="inline-block mt-4 text-sm font-semibold text-emerald-700 underline">Back to home</Link>
        </div>
      ) : (
        <>
          {/* How to delete */}
          <h2 className="mt-9 text-lg font-extrabold text-emerald-900">How to delete your account</h2>
          <ol className="mt-3 space-y-3 text-sm text-gray-700 list-decimal pl-5">
            <li><strong>In the app:</strong> tap the <strong>🗑 Delete my data</strong> icon in the top-right of any screen, then confirm.</li>
            <li><strong>On the web (here):</strong> sign in, then use the deletion box below.</li>
            <li><strong>By email:</strong> can&apos;t access your account? Email <a href="mailto:support@getguac.app" className="text-emerald-700 underline">support@getguac.app</a> from your registered address and we&apos;ll delete it within 30 days.</li>
          </ol>

          {/* Web self-serve */}
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            {user === undefined ? (
              <p className="text-sm text-gray-500">Checking your sign-in…</p>
            ) : user === null ? (
              <div className="text-sm text-gray-700">
                <p className="font-bold text-red-800">Delete on the web</p>
                <p className="mt-1">You&apos;re not signed in. <Link href="/login?next=/delete-account" className="text-emerald-700 underline font-semibold">Sign in</Link> to delete your account here, or use the app/email options above.</p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-red-800">Permanently delete this account</p>
                <p className="text-sm text-gray-700 mt-1">Signed in as <strong>{user.email}</strong>. Type <code className="font-mono bg-white px-1 rounded">{CONFIRM}</code> to confirm.</p>
                <input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={CONFIRM}
                  className="mt-3 w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-mono"
                  autoCapitalize="characters" autoCorrect="off"
                />
                {error && <p className="mt-2 text-sm text-red-700">Couldn&apos;t delete: {error}</p>}
                <button
                  onClick={handleDelete}
                  disabled={busy || phrase.trim().toUpperCase() !== CONFIRM}
                  className="mt-3 w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-2.5 transition-colors"
                >
                  {busy ? 'Deleting…' : 'Delete everything'}
                </button>
              </div>
            )}
          </div>

          {/* What's deleted / kept */}
          <h2 className="mt-10 text-lg font-extrabold text-emerald-900">What gets deleted</h2>
          <p className="mt-2 text-sm text-gray-700">Deleting your account permanently removes <strong>all</strong> of your data, including:</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc pl-5">
            <li>Your profile and login (you can no longer sign in)</li>
            <li>All receipts, line items, and spending history</li>
            <li>Your GetGuac inbox and any auto-imported email receipts (and your @getguac.app mailbox)</li>
            <li>Shopping/Smashlists, car-trip logs, saved searches, and price-tracking data</li>
            <li>GuacMoney, ratings, and app settings</li>
          </ul>

          <h2 className="mt-8 text-lg font-extrabold text-emerald-900">What we keep, and for how long</h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc pl-5">
            <li><strong>Deleted immediately</strong> from our live systems when you confirm.</li>
            <li>We retain a minimal <strong>audit record</strong> (an internal account ID + the deletion timestamp, no personal data) for security and legal compliance.</li>
            <li>Residual copies in encrypted backups are purged within <strong>30 days</strong>.</li>
          </ul>

          <p className="mt-8 text-xs text-gray-500">
            Prefer to remove only some data instead of your whole account? You can delete individual receipts and
            items inside the app without deleting your account. See our{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </>
      )}
    </div>
  )
}
