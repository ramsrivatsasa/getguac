'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'
import { Eye, EyeOff } from 'lucide-react'

// useSearchParams() requires a Suspense boundary above it for Next 14's
// static page generation — same gotcha that froze production once already
// (see project_getguac_vercel_static_export memory). Keep this wrapper.
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 font-sans">
        <div className="text-white">Loading…</div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  // `identifier` accepts a username (email_alias) OR an email address.
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Surface OAuth-callback errors as a toast. /auth/callback bounces
  // failed Google logins back to /login?oauth_error=... so we read it
  // here and clear the URL.
  const search = useSearchParams()
  useEffect(() => {
    const err = search?.get('oauth_error')
    if (err) {
      toast.error(decodeURIComponent(err))
      router.replace('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function signInWithGoogle() {
    setGoogleLoading(true)
    try {
      const sb = createClient()
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        toast.error(error.message)
        setGoogleLoading(false)
      }
      // Otherwise Supabase navigates us to Google — no further action.
    } catch (e) {
      toast.error(e.message || 'Could not start Google sign in')
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        // Email-not-confirmed gets its own UX: clear toast + offer Resend.
        if (data.email_not_confirmed && data.email) {
          toast(
            (t) => (
              <div className="space-y-2">
                <p className="font-semibold text-rose-700">Please confirm your email first</p>
                <p className="text-xs text-gray-600">We sent a link to {data.email}.</p>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-semibold"
                    onClick={async () => {
                      toast.dismiss(t.id)
                      try {
                        const r = await fetch('/api/auth/resend-confirmation', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: data.email }),
                        })
                        const j = await r.json()
                        toast.success(j.message || `Sent to ${data.email}`)
                      } catch (e) {
                        toast.error(e.message || 'Resend failed')
                      }
                    }}>
                    Resend email
                  </button>
                  <button className="px-3 py-1 rounded bg-gray-100 text-xs" onClick={() => toast.dismiss(t.id)}>Dismiss</button>
                </div>
              </div>
            ),
            { duration: 12000 }
          )
        } else {
          toast.error(data.error || 'Invalid username or password')
        }
        setLoading(false)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err.message || 'Sign-in failed')
      setLoading(false)
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetting(true)
    const sb = createClient()
    // Land on our branded /reset-password route. The Supabase email
    // template should be configured to use {{ .TokenHash }} in a
    // getguac.app/reset-password?token_hash=...&type=recovery link —
    // when the user clicks, that route verifies the OTP and lets
    // them set a new password without ever bouncing through a
    // *.supabase.co URL.
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : undefined
    const { error } = await sb.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo })
    setResetting(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Check ${resetEmail} for the reset link 🥑`)
      setResetOpen(false)
      setResetEmail('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-2">
            <GuacMascot expression="angel" size={130} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">GetGuac</h1>
          <p className="text-emerald-100 mt-1 text-sm">Money's wingman — every dollar earns its smash.</p>
        </div>

        <div className="card shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username or email</label>
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="off"
                spellCheck={false}
                className="input"
                placeholder="alex   or   alex@gmail.com"
                value={form.identifier}
                onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label mb-0">Password</label>
                <button type="button"
                  onClick={() => { setResetEmail(form.identifier.includes('@') ? form.identifier : ''); setResetOpen(true) }}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline mb-1">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-emerald-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Google sign in temporarily removed — Supabase Auth →
              Providers → Google isn't enabled on the project yet, so
              the OAuth flow 400s with "Unsupported provider: provider
              is not enabled". Add the button back once the dashboard
              config is in place. signInWithGoogle() + GoogleLogo
              remain defined below so re-enabling is a one-line
              uncomment. */}

          <div className="mt-5 text-center space-y-1.5">
            <p className="text-sm text-gray-500">
              Want to GetGuac?{' '}
              <Link href="/register" className="text-emerald-700 font-semibold hover:underline">Create account</Link>
            </p>
            <button type="button"
              onClick={() => {
                // form.email doesn't exist — the state shape is
                // { identifier, password }. Pre-fill the reset email
                // from identifier only if it looks like an email; the
                // earlier prompt-trigger at the top of the form does
                // the same thing.
                setResetEmail(form.identifier?.includes('@') ? form.identifier : '')
                setResetOpen(true)
              }}
              className="text-xs text-gray-500 hover:text-emerald-700 hover:underline">
              Trouble logging in?
            </button>
          </div>
        </div>
      </div>

      {/* Forgot-password modal */}
      {resetOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setResetOpen(false)}>
          <form onSubmit={handleResetPassword} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <GuacMascot expression="thumbsup" size={48} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Reset your password</h3>
                <p className="text-xs text-gray-500">We&apos;ll email you a link to set a new one.</p>
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                autoFocus
                className="input"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={resetting || !resetEmail.trim()} className="btn-primary">
                {resetting ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setResetOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// Inline Google "G" mark. Brand-correct colors so the button looks
// like the official Google sign-in widget without pulling in their
// branding SDK.
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.7-1.57 2.69-3.87 2.69-6.65z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.27c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.69A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.69V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  )
}
