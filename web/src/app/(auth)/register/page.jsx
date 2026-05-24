'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../../lib/supabase/client'
import toast from 'react-hot-toast'
import GuacMascot from '../../../components/GuacMascot'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    birthDate: '', age: '', alternativeEmail: '', mobileNo: ''
  })

  const s = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    setLoading(true)
    const sb = createClient()
    const { data, error } = await sb.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          birth_date: form.birthDate,
          age: form.age,
          alternative_email: form.alternativeEmail,
          mobile_no: form.mobileNo,
        }
      }
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Please check your email to verify.')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700 p-4 py-8 font-sans">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex justify-center">
            <GuacMascot expression="celebrating" size={110} />
          </div>
          <h1 className="text-3xl font-black text-white mt-2">GetGuac</h1>
          <p className="text-emerald-100 text-sm mt-1">Create your account — smash your spend</p>
        </div>

        <div className="card shadow-2xl">
          <h2 className="text-xl font-bold mb-5">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">First Name</label><input required className="input" placeholder="John" value={form.firstName} onChange={s('firstName')} /></div>
              <div><label className="label">Last Name</label><input required className="input" placeholder="Doe" value={form.lastName} onChange={s('lastName')} /></div>
            </div>
            <div><label className="label">Email Address</label><input type="email" required className="input" placeholder="you@example.com" value={form.email} onChange={s('email')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Password</label><input type="password" required minLength={6} className="input" placeholder="Min 6 chars" value={form.password} onChange={s('password')} /></div>
              <div><label className="label">Confirm Password</label><input type="password" required className="input" value={form.confirmPassword} onChange={s('confirmPassword')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Birth Date</label><input type="date" className="input" value={form.birthDate} onChange={s('birthDate')} /></div>
              <div><label className="label">Age</label><input type="number" className="input" placeholder="25" value={form.age} onChange={s('age')} /></div>
            </div>
            <div><label className="label">Alternative Email</label><input type="email" className="input" value={form.alternativeEmail} onChange={s('alternativeEmail')} /></div>
            <div><label className="label">Mobile No <span className="text-gray-400 normal-case font-normal">(Optional)</span></label><input type="tel" className="input" value={form.mobileNo} onChange={s('mobileNo')} /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-700 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
