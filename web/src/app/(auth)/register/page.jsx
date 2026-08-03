'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'
import PrivacyNote from '../../../components/PrivacyNote'
import { Check, X, Loader2, AlertCircle, AtSign, Eye, EyeOff } from 'lucide-react'
import { createClient as createBrowserClient } from '../../../lib/supabase/client'
import ReferralCapture from '../../../components/ReferralCapture'
import MetaPixel, { trackSignup } from '../../../components/MetaPixel'
const VALID_USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/
const REFERRAL_RE = /^[A-Z0-9]{6}$/
const REF_STORAGE_KEY = 'pending_referral_code'
// Benefit bullets for the desktop brand panel (left split). Clean, non-preachy.
const SIGNUP_BENEFITS = [
  { icon: '🧾', text: 'Track every receipt & bank statement' },
  { icon: '🔍', text: 'See exactly where your money goes' },
  { icon: '✂️', text: 'Catch hidden fees & forgotten subscriptions' },
  { icon: '↩️', text: 'Never miss a return or refund deadline' },
  { icon: '🏷️', text: 'Find a better price with Steals' },
]
// TURNSTILE_SITE_KEY removed 2026-08-03 with the widget — registration
// now uses the distorted-image sum in lib/demo-challenge.js.

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Same Google OAuth path as /login. Lands on /auth/callback which
  // exchanges the code for a session cookie, then drops the user on
  // the dashboard. The profile-row trigger in Supabase fills the
  // first_name / last_name from Google's name fields.
  async function signInWithGoogle() {
    setGoogleLoading(true)
    try {
      const sb = createBrowserClient()
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })
      if (error) { toast.error(error.message); setGoogleLoading(false) }
    } catch (e) {
      toast.error(e.message || 'Could not start Google sign in')
      setGoogleLoading(false)
    }
  }
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
  // In-page error, rendered as a red banner above the submit button —
  // more visible than a transient toast, per product ask.
  const [errorMsg, setErrorMsg] = useState('')
  // Referral code (optional). Synced with the pending_referral_code stash so a
  // manually typed code applies exactly like one captured from a ?ref= link.
  const [referralCode, setReferralCode] = useState('')
  useEffect(() => {
    try { const c = window.localStorage.getItem(REF_STORAGE_KEY); if (c && REFERRAL_RE.test(c)) setReferralCode(c) } catch {}
  }, [])
  // Honeypot field — real users never see / touch this. Bots that
  // auto-fill every input on the page will populate it and get
  // bounced by the server-side check.
  const [honeypot, setHoneypot] = useState('')
  // Cloudflare Turnstile token — populated by the widget on success.
  // Server-side verify treats a missing token as a failed CAPTCHA
  // (unless TURNSTILE_SECRET_KEY isn't set, in which case it skips).
  // 🔴 Turnstile REPLACED 2026-08-03 with a distorted-image sum.
  // Measured on /register: 0.5-1.3 MB and ~2,227 ms desktop / ~5,996 ms on a
  // mid-tier Android over 4G, with the submit button disabled the whole time.
  // Registration is a harder target than the demo login, so the server also
  // enforces MIN_FORM_SECONDS on top of the sum and the honeypot.
  const [challenge, setChallenge] = useState(null)   // { svg, token }
  const [answer, setAnswer] = useState('')

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

  // Fetch the signed challenge once on mount. One ~1 KB JSON response, no
  // third-party script, nothing an ad-blocker can break.
  useEffect(() => {
    let live = true
    fetch('/api/auth/demo-challenge', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (live && d?.token) setChallenge(d) })
      .catch(() => {})
    return () => { live = false }
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

  const underage = form.age !== '' && Number(form.age) < 18

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    if (form.password !== form.confirmPassword) { setErrorMsg('Passwords do not match.'); return }
    if (usernameStatus !== 'available') { setErrorMsg('Pick an available username first.'); return }
    if (!form.birthDate) { setErrorMsg('Please enter your birth date — GetGuac is for adults 18 and older.'); return }
    if (underage) { setErrorMsg('You must be at least 18 years old to create a GetGuac account.'); return }
    if (!acceptTerms) { setErrorMsg('Please accept the Terms & Privacy Policy.'); return }
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
          demo_token: challenge?.token,
          demo_answer: answer,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Sign-up failed')
        setLoading(false)
        return
      }
      // THE conversion. /api/auth/sign-up returned ok, so the account exists —
      // fire it here and nowhere else. It used to fire on the <Link> click that
      // merely navigated to this page, which measured intent, counted everyone
      // who bounced off this form, and would have taught Meta's optimiser to buy
      // more link-clickers. That is the exact failure the ad rebuild is undoing.
      trackSignup(data.needs_email_confirmation ? 'email-unconfirmed' : 'email')
      if (data.needs_email_confirmation) {
        // Hold the user on this page and show the confirmation panel.
        setConfirmation({ email: data.email || form.email, username: data.pending_username || form.username })
      } else {
        toast.success(`Welcome, @${data.username || form.username} — your GetGuac account is live.`)
        router.push('/login')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword
  const usernameNorm = form.username.toLowerCase().trim()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] bg-white font-sans">
      {/* The pixel has to exist on the page where the conversion actually
          happens, or trackSignup() above no-ops into a missing window.fbq.
          /register is public and pre-authentication, which keeps the promise
          the privacy policy makes: no ad tracker once you are signed in. */}
      <MetaPixel />
      {/* Capture ?ref=<CODE> on register too — direct deep-links to
          /register?ref=ABC123 should also seed localStorage so the
          post-signup hook on the dashboard credits both sides. */}
      <ReferralCapture />

      {/* LEFT — brand & benefits panel. DESKTOP ONLY: the mobile layout drops
          this entirely and shows a compact header above the form instead. */}
      <aside className="hidden lg:flex flex-col justify-center gap-9 px-12 xl:px-20 py-12 relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-lime-50/70 border-r border-emerald-100/70">
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-emerald-100/40 pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-lime-200/30 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <GuacMascot expression="celebrating" size={76} />
            <div>
              <div className="text-2xl font-black leading-none text-gray-900">GetGuac</div>
              <div className="text-emerald-700 text-sm font-semibold mt-1">your money&apos;s wingman</div>
            </div>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black mt-9 leading-[1.05] text-gray-900 tracking-tight">Take control<br />of your money.</h2>
          <p className="text-gray-600 mt-4 max-w-md text-lg">
            Create your free account and start seeing exactly where your money goes — in about a minute.
          </p>
        </div>
        <ul className="relative space-y-3.5 max-w-md">
          {SIGNUP_BENEFITS.map((b) => (
            <li key={b.text} className="flex items-center gap-3 text-gray-800">
              <span className="w-9 h-9 rounded-xl bg-emerald-100 ring-1 ring-emerald-200 flex items-center justify-center text-lg flex-shrink-0">{b.icon}</span>
              <span className="font-semibold">{b.text}</span>
            </li>
          ))}
        </ul>
        <div className="relative flex flex-wrap gap-x-5 gap-y-2 text-sm text-emerald-800 font-semibold">
          <span className="inline-flex items-center gap-1.5"><Check size={15} /> Free forever</span>
          <span className="inline-flex items-center gap-1.5"><Check size={15} /> No card required</span>
          <span className="inline-flex items-center gap-1.5"><Check size={15} /> We never sell your data</span>
        </div>
      </aside>

      {/* RIGHT — the form. Light panel on desktop; the green page background
          shows through on mobile for a single-column stacked layout. */}
      <main className="flex items-start lg:items-center justify-center p-4 py-8 lg:py-10 lg:bg-gray-50 min-h-screen overflow-y-auto">
      <div className="w-full max-w-lg space-y-6">
        {/* MOBILE ONLY brand header (desktop uses the left panel). */}
        <div className="lg:hidden text-center anim-logo-in">
          {/* anim-logo-in entrance — first impression on signup. */}
          <div className="inline-flex justify-center rounded-full bg-gray-100 ring-1 ring-gray-200 p-3 lg:bg-transparent lg:ring-0 lg:p-0">
            <GuacMascot expression="celebrating" size={96} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-2">GetGuac</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account — money&apos;s wingman</p>
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
          <h2 className="text-xl font-bold">Create your account</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">Free forever · no card required.</p>

          {/* Google fast-path — skip the whole form for anyone who'd rather
              just connect Google. Profile trigger fills first/last name. */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleLoading || loading}
            className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 disabled:opacity-60 font-semibold text-gray-700 shadow-sm transition"
          >
            <RegisterGoogleLogo />
            {googleLoading ? 'Opening Google…' : 'Sign up with Google'}
          </button>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">or sign up with email</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

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
                    aria-invalid={passwordMismatch}
                    className={`input pr-10 ${passwordMismatch ? 'border-rose-400 ring-2 ring-rose-200 focus:border-rose-400' : ''}`}
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
                {passwordMismatch && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <X size={12} /> Passwords do not match
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Birth Date</label>
                <input
                  type="date"
                  required
                  aria-invalid={underage}
                  className={`input ${underage ? 'border-rose-400 ring-2 ring-rose-200 focus:border-rose-400' : ''}`}
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.birthDate}
                  onChange={s('birthDate')}
                />
                {underage && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <X size={12} /> You must be 18 or older to join GetGuac
                  </p>
                )}
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

            {/* Referral code (optional). A friend's 6-char code — applies the
                same as clicking their ?ref= link. */}
            <div>
              <label className="label">Referral code <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
              <input
                type="text"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={6}
                className="input font-mono uppercase tracking-[0.3em]"
                placeholder="ABC123"
                value={referralCode}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                  setReferralCode(v)
                  try {
                    if (REFERRAL_RE.test(v)) window.localStorage.setItem(REF_STORAGE_KEY, v)
                    else if (!v) window.localStorage.removeItem(REF_STORAGE_KEY)
                  } catch {}
                }}
              />
              {referralCode.length > 0 && (
                REFERRAL_RE.test(referralCode)
                  ? <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1"><Check size={12} /> Code accepted — you’ll both get Smash days after sign-up</p>
                  : <p className="text-[11px] text-gray-400 mt-1">A referral code is 6 letters or numbers</p>
              )}
            </div>

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

            {/* Distorted-image sum. The digits are SVG PATHS, so the DOM
                holds no machine-readable text. Numerals are universal — no
                English required, which the worded version wrongly assumed.
                ⚠️ Not screen-reader readable: that is the real cost of any
                image CAPTCHA. If a blind user is blocked, add an audio or
                email fallback — do NOT weaken the image. */}
            <div>
              <label htmlFor="signup-answer" className="block text-sm font-semibold text-gray-700 mb-1">
                Solve this to continue
              </label>
              <div
                aria-hidden="true"
                className="inline-flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 mb-2 select-none"
                dangerouslySetInnerHTML={{ __html: challenge?.svg || '' }}
              />
              <input
                id="signup-answer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type the result"
                className="input w-full"
                aria-describedby="signup-answer-help"
              />
              <p id="signup-answer-help" className="text-[11px] text-gray-500 mt-1">
                Confirms you are a person. No tracking, no third-party script. Stuck? Contact support.
              </p>
            </div>

            {/* In-page error — red, persistent, right where the user is looking. */}
            {errorMsg && (
              <div role="alert" className="rounded-xl bg-rose-50 border-2 border-rose-300 px-3 py-2.5 text-sm font-semibold text-rose-700 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available' || !acceptTerms || underage || !answer.trim()}
              className="btn-primary w-full justify-center py-2.5 mt-1"
            >
              {loading ? 'Creating account…' : 'Create my free account'}
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
      </main>
    </div>
  )
}

// Same multi-color G mark as the /login button. Duplicated rather than
// extracted to a shared component because both auth pages live in their
// own route folders and this keeps the bundle leaner.
function RegisterGoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84c-.21 1.13-.84 2.09-1.79 2.73v2.27h2.9c1.7-1.57 2.69-3.87 2.69-6.65z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.27c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.95 10.69A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.69V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  )
}
