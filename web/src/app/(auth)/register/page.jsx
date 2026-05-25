'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'
import PrivacyNote from '../../../components/PrivacyNote'
import { Check, X, Loader2, AlertCircle, AtSign } from 'lucide-react'
const VALID_USERNAME_RE = /^[a-z0-9]([a-z0-9._-]{1,30}[a-z0-9])?$/

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    username: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    birthDate: '', age: '', alternativeEmail: '', mobileNo: ''
  })

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
          alternative_email: form.alternativeEmail || null,
          mobile_no: form.mobileNo || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Sign-up failed')
        setLoading(false)
        return
      }
      if (data.needs_email_confirmation) {
        toast.success('Account created — check your email to confirm.')
      } else {
        toast.success(`Welcome, @${data.username || form.username} — your GetGuac account is live.`)
      }
      router.push('/login')
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

        <div className="card shadow-2xl">
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
              <div><label className="label">Password</label><input type="password" required minLength={10} autoComplete="new-password" className="input" placeholder="Min 10 chars" value={form.password} onChange={s('password')} /></div>
              <div><label className="label">Confirm Password</label><input type="password" required autoComplete="new-password" className="input" value={form.confirmPassword} onChange={s('confirmPassword')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Birth Date</label><input type="date" className="input" value={form.birthDate} onChange={s('birthDate')} /></div>
              <div><label className="label">Age</label><input type="number" className="input" placeholder="25" value={form.age} onChange={s('age')} /></div>
            </div>
            <div><label className="label">Alternative Email</label><input type="email" className="input" value={form.alternativeEmail} onChange={s('alternativeEmail')} /></div>
            <div><label className="label">Mobile No <span className="text-gray-400 normal-case font-normal">(Optional)</span></label><input type="tel" className="input" value={form.mobileNo} onChange={s('mobileNo')} /></div>
            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available'}
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
