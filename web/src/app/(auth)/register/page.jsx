'use client'
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'
import PrivacyNote from '../../../components/PrivacyNote'
import { Check, X, Loader2, AlertCircle, AtSign, Eye, EyeOff } from 'lucide-react'
const VALID_USERNAME_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/
// Cloudflare Turnstile site key — public, safe to ship in the client
// bundle. When unset (local dev / before keys are provisioned in
// Vercel), the widget renders nothing and the server-side verify is
// also silently skipped, so the signup path still works.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // When the server returns needs_email_confirmation we render an in-place
  // "Check your inbox" panel instead of redirecting away — the user is more
  // likely to actually go look for the email if we hold them on this page.
  const [confirmation, setConfirmation] = useState(null) // { email, username }
  const [resending, setResending] = useState(false)
  const [form, setForm] = useState({
    username: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    birthDate: '', age: '', mobileNo: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  // Honeypot field — real users never see / touch this. Bots that
  // auto-fill every input on the page will populate it and get
  // bounced by the server-side check.
  const [honeypot, setHoneypot] = useState('')
  // Cloudflare Turnstile token — populated by the widget on success.
  // Server-side verify treats a missing token as a failed CAPTCHA
  // (unless TURNSTILE_SECRET_KEY isn't set, in which case it skips).
  const [turnstileToken, setTurnstileToken] = useState('')

  // Auto-derive age from birth date so the two fields can't disagree.
  // Years between today and birthDate, rounded down at the month/day boundary.
  useEffect(() => {
    if (!form.birthDate) {
      if (form.age !== '') setForm(p => ({ ...p, age: '' }))
      return
    }
    const bd = new Date(form.birthDate)
    if (Number.isNaN(bd.getTime())) return
    const today = new Date()
    let age = today.getFullYear() - bd.getFullYear()
    const m = today.getMonth() - bd.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
    if (age < 0 || age > 150) return
    const next = String(age)
    if (form.age !== next) setForm(p => ({ ...p, age: next }))
  }, [form.birthDate])

  // Listen for the Turnstile success callback (the global JS handlers
  // dispatch a CustomEvent because Next.js's <Script> can't reference
  // React setState directly). Same listener handles success + error +
  // expiry (error/expiry pass an empty string → disables submit).
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    function onToken(e) { setTurnstileToken(e?.detail || '') }
    window.addEventListener('turnstile-token', onToken)
    return () => window.removeEventListener('turnstile-token', onToken)
  }, [])

  // Live availability check for username
  const [usernameStatus, setUsernameStatus] = useState(null)  // 'available' | 'taken' | 'reserved' | 'invalid' | null
  const [checkingUsername, setCheckingUsername] = useState(false)
  const debounceRef = useRef(null)

  const s = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const u = form.username.toLowerCase().trim()
    if (!u) { setUsernameStatus(null); return }
    if (!VALID_USERNAME_RE.test(u)) { setUsernameStatus('invalid'); return }
    debounceRef.current = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(u)}`)
        const data = await res.json()
        setUsernameStatus(data.status)
      } catch {
        setUsernameStatus(null)
      } finally {
        setCheckingUsername(false)
      }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [form.username])

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (usernameStatus !== 'available') { toast.error('Pick an available username first'); return }
    if (!acceptTerms) { toast.error('Please accept the Terms & Privacy Policy'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.toLowerCase().trim(),
          email: form.email,
          password: form.password,
          first_name: form.firstName,
          last_name: form.lastName,
          birth_date: form.birthDate || null,
          age: form.age || null,
          mobile_no: form.mobileNo || null,
          // Bot-prevention payload — honeypot must be empty, Turnstile
          // token comes from the widget (or empty if no key configured).
          website: honeypot,
          turnstile_token: turnstileToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Sign-up failed')
        setLoading(false)
        return
      }
      if (data.needs_email_confirmation) {
        // Hold the user on this page and show the confirmation panel.
        setConfirmation({ email: data.email || form.email, username: data.pending_username || form.username })
      } else {
        toast.success(`Welcome, @${data.username || form.username} — your GetGuac account is live.`)
        router.push('/login')
      }
    } catch (err) {
      toast.error(err.message || 'Sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  const usernameNorm = form.username.toLowerCase().trim()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 p-4 py-8 font-sans">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex justify-center">
            <GuacMascot expression="celebrating" size={110} />
          </div>
          <h1 className="text-3xl font-black text-white mt-2">GetGuac</h1>
          <p className="text-emerald-100 text-sm mt-1">Create your account — money's wingman</p>
        </div>

        {confirmation && (
          <div className="card shadow-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">📬</div>
              <div>
                <h2 className="text-lg font-bold text-emerald-800">Check your email</h2>
                <p className="text-xs text-gray-500">We need to verify it's really you before unlocking the account.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              We sent a confirmation link to <strong className="text-emerald-700">{confirmation.email}</strong>. Click it and you'll land on your dashboard with the handle <strong className="font-mono text-emerald-700">@{confirmation.username}</strong> reserved.
            </p>
            <p className="text-xs text-gray-500">
              Not in your inbox in a minute? Check spam, or hit Resend below.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={resending}
                onClick={async () => {
                  setResending(true)
                  try {
                    const res = await fetch('/api/auth/resend-confirmation', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: confirmation.email }),
                    })
                    const data = await res.json()
                    toast.success(data.message || `Sent — check ${confirmation.email}`)
                  } catch (e) {
                    toast.error(e.message || 'Resend failed')
                  } finally {
                    setResending(false)
                  }
                }}
                className="btn-primary"
              >
                {resending ? 'Sending…' : 'Resend email'}
              </button>
              <Link href="/login" className="btn-secondary">Go to sign in</Link>
            </div>
          </div>
        )}

        <div className={`card shadow-2xl ${confirmation ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="text-xl font-bold mb-4">Create Account</h2>
          <PrivacyNote className="mb-5" showDelete={false} />
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username = sign-in handle AND @getguac.app email alias */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-3">
              <label className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1.5">
                <AtSign size={12} /> Pick your GetGuac handle
              </label>
              <p className="text-[11px] text-emerald-900/80 mt-1 mb-2">
                This becomes your sign-in name <strong>and</strong> your free <span className="font-mono">@getguac.app</span> email — yours forever.
              </p>
              <div className="flex items-stretch rounded-xl border-2 border-white focus-within:border-emerald-400 transition-colors overflow-hidden bg-white">
                <input
                  required
                  autoCapitalize="off"
                  spellCheck={false}
                  autoComplete="username"
                  maxLength={32}
                  className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                  placeholder="e.g. alex"
                  value={form.username}
                  onChange={s('username')}
                />
                <span className="flex items-center px-3 text-xs text-gray-500 font-mono bg-gray-50 border-l border-gray-200">
                  @getguac.app
                </span>
              </div>
              <div className="mt-1.5 min-h-[18px] text-xs">
                {!usernameNorm ? (
                  <span className="text-gray-500">3–32 chars · a-z 0-9 . _ -</span>
                ) : checkingUsername ? (
                  <span className="text-gray-500 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Checking…</span>
                ) : usernameStatus === 'available' ? (
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Check size={12} /> <span className="font-mono">{usernameNorm}@getguac.app</span> is available</span>
                ) : usernameStatus === 'taken' ? (
                  <span className="text-rose-700 font-semibold inline-flex items-center gap-1"><X size={12} /> Already taken</span>
                ) : usernameStatus === 'reserved' ? (
                  <span className="text-amber-700 font-semibold inline-flex items-center gap-1"><AlertCircle size={12} /> Reserved word — try something else</span>
                ) : usernameStatus === 'invalid' ? (
                  <span className="text-gray-500">Must start and end with a letter or number · 3–32 chars</span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First Name</label><input required className="input" placeholder="Alex" value={form.firstName} onChange={s('firstName')} /></div>
              <div><label className="label">Last Name</label><input required className="input" placeholder="Smith" value={form.lastName} onChange={s('lastName')} /></div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" required autoComplete="email" className="input" placeholder="you@example.com" value={form.email} onChange={s('email')} />
              <p className="text-[11px] text-gray-400 mt-1">Used for password resets — never shown publicly.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required minLength={10} autoComplete="new-password"
                    className="input pr-10"
                    placeholder="Min 10 chars"
                    value={form.password}
                    onChange={s('password')}
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
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required autoComplete="new-password"
                    className="input pr-10"
                    value={form.confirmPassword}
                    onChange={s('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-emerald-700"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Birth Date</label>
                <input
                  type="date"
                  className="input"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.birthDate}
                  onChange={s('birthDate')}
                />
              </div>
              <div>
                <label className="label">Age <span className="text-gray-400 normal-case font-normal">(auto)</span></label>
                <input
                  type="number"
                  readOnly
                  tabIndex={-1}
                  className="input bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="—"
                  value={form.age}
                />
              </div>
            </div>
            <div><label className="label">Mobile No <span className="text-gray-400 normal-case font-normal">(Optional)</span></label><input type="tel" className="input" value={form.mobileNo} onChange={s('mobileNo')} /></div>

            <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-600 leading-snug">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-emerald-700 font-semibold hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-emerald-700 font-semibold hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            {/* Honeypot — invisible to real users, irresistible to
                form-fillers. aria-hidden + tabindex=-1 means
                screen-readers + keyboard users also skip it. Anything
                non-empty on submit = a bot, server rejects. */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
            >
              <label htmlFor="website">Website (leave blank)</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Cloudflare Turnstile CAPTCHA — invisible most of the
                time; falls back to a micro-challenge for suspicious
                traffic. Self-hides when no site key is configured so
                local-dev signups still work. */}
            {TURNSTILE_SITE_KEY && (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
                <div
                  className="cf-turnstile flex justify-center"
                  data-sitekey={TURNSTILE_SITE_KEY}
                  data-callback="onTurnstileSuccess"
                  data-error-callback="onTurnstileError"
                  data-expired-callback="onTurnstileExpired"
                />
                <Script id="turnstile-callbacks" strategy="lazyOnload">
                  {`
                    window.onTurnstileSuccess = function(token) {
                      window.dispatchEvent(new CustomEvent('turnstile-token', { detail: token }))
                    }
                    window.onTurnstileError = function() {
                      window.dispatchEvent(new CustomEvent('turnstile-token', { detail: '' }))
                    }
                    window.onTurnstileExpired = function() {
                      window.dispatchEvent(new CustomEvent('turnstile-token', { detail: '' }))
                    }
                  `}
                </Script>
              </>
            )}

            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available' || !acceptTerms || (TURNSTILE_SITE_KEY && !turnstileToken)}
              className="btn-primary w-full justify-center py-2.5 mt-1"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-700 font-semibold hover:underline">Sign In</Link>
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500">
              You stay in control. Change your mind?{' '}
              <Link href="/profile" className="text-emerald-700 font-semibold hover:underline">
                Delete your account + all data
              </Link>{' '}
              in one click — no questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
