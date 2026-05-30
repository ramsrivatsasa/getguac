'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  // `identifier` accepts a username (email_alias) OR an email address.
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetting, setResetting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

          <div className="mt-5 text-center space-y-1.5">
            <p className="text-sm text-gray-500">
              Want to GetGuac?{' '}
              <Link href="/register" className="text-emerald-700 font-semibold hover:underline">Create account</Link>
            </p>
            <button type="button"
              onClick={() => { setResetEmail(form.email); setResetOpen(true) }}
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
