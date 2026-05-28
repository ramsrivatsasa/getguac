'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, CreditCard, Plus, Trash2 } from 'lucide-react'
import GuacMascot from '../../../components/GuacMascot'
import PrivacyPanel from '../../../components/PrivacyPanel'
import EmailAliasPicker from '../../../components/EmailAliasPicker'
import HouseholdPanel from '../../../components/HouseholdPanel'

export default function ProfilePage() {
  const sb = createClient()
  const qc = useQueryClient()

  const { data: user } = useQuery({ queryKey: ['user'], queryFn: async () => { const { data } = await sb.auth.getUser(); return data.user } })
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => { const { data } = await sb.from('profiles').select('*').eq('id', user.id).single(); return data },
    enabled: !!user?.id,
  })
  const { data: payments = [] } = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => { const { data } = await sb.from('payment_options').select('*').eq('user_id', user.id); return data ?? [] },
    enabled: !!user?.id,
  })

  const [form, setForm] = useState({})
  const [payForm, setPayForm] = useState({ payment_type: '', card_last4: '', card_type: 'Visa', business_card: false })
  const [showPayForm, setShowPayForm] = useState(false)

  useEffect(() => { if (profile) setForm(profile) }, [profile])

  const saveProfile = useMutation({
    mutationFn: async () => sb.from('profiles').update(form).eq('id', user.id),
    onSuccess: () => { toast.success('Profile saved'); qc.invalidateQueries({ queryKey: ['profile'] }) },
    onError: err => toast.error(err.message),
  })

  const addPayment = useMutation({
    mutationFn: async () => sb.from('payment_options').insert({ ...payForm, user_id: user.id }),
    onSuccess: () => { toast.success('Payment option added'); setPayForm({ payment_type: '', card_last4: '', card_type: 'Visa', business_card: false }); setShowPayForm(false); qc.invalidateQueries({ queryKey: ['payments'] }) },
    onError: err => toast.error(err.message),
  })

  const deletePayment = useMutation({
    mutationFn: (id) => sb.from('payment_options').delete().eq('id', id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['payments'] }) },
  })

  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const sp = k => e => setPayForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <GuacMascot expression="sitting" size={56} />
        <h1 className="page-title">My Profile</h1>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-4 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white text-2xl font-black shadow-md ring-2 ring-white">
            {(form.first_name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-lg">{form.first_name} {form.last_name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">First Name</label><input className="input" value={form.first_name || ''} onChange={s('first_name')} /></div>
          <div><label className="label">Last Name</label><input className="input" value={form.last_name || ''} onChange={s('last_name')} /></div>
          <div><label className="label">Email <span className="text-gray-400 font-normal normal-case">(read-only)</span></label><input className="input bg-gray-50 text-gray-500" value={user?.email || ''} readOnly /></div>
          <div><label className="label">Mobile No</label><input type="tel" className="input" value={form.mobile_no || ''} onChange={s('mobile_no')} /></div>
          <div><label className="label">Birth Date</label><input type="date" className="input" value={form.birth_date || ''} onChange={s('birth_date')} /></div>
          <div><label className="label">Age</label><input type="number" className="input" value={form.age || ''} onChange={s('age')} /></div>
        </div>

        <button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="btn-primary">
          <Save size={15} /> {saveProfile.isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      {/* Vanity email picker (replaces the static GetGuac Email line) */}
      {user?.id && <EmailAliasPicker userId={user.id} />}

      {/* Household — shared shopping list + family chat. Scoped to a
          tight set (2-4 people); receipts + analytics stay personal.
          Self-contained: this component handles create, invite,
          member roster, leave, and the chat thread, all reading +
          writing through lib/households.js.
          The id="household" anchor is the target of the sidebar
          "House" entry (/profile#household). */}
      <div id="household" className="scroll-mt-20">
        <HouseholdPanel />
      </div>

      {/* Payment options */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><CreditCard size={17} /> Payment Options</h3>
          <button onClick={() => setShowPayForm(v => !v)} className="btn-secondary text-xs py-1.5"><Plus size={13} /> Add</button>
        </div>

        {showPayForm && (
          <form onSubmit={e => { e.preventDefault(); addPayment.mutate() }} className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label text-xs">Payment Type</label><input required className="input text-sm" placeholder="Credit / Debit" value={payForm.payment_type} onChange={sp('payment_type')} /></div>
              <div><label className="label text-xs">Last 4 Digits</label><input required maxLength={4} className="input text-sm" value={payForm.card_last4} onChange={sp('card_last4')} /></div>
              <div>
                <label className="label text-xs">Card Type</label>
                <select className="input text-sm" value={payForm.card_type} onChange={sp('card_type')}>
                  <option>Visa</option><option>MC</option><option>Amex</option><option>Discover</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input type="checkbox" id="bizCard" className="w-4 h-4" checked={payForm.business_card}
                  onChange={e => setPayForm(p => ({ ...p, business_card: e.target.checked }))} />
                <label htmlFor="bizCard" className="text-sm">Business Card</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addPayment.isPending} className="btn-primary text-xs py-1.5">Save</button>
              <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => setShowPayForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {payments.length === 0 ? (
          <p className="text-sm text-gray-400">No payment options added.</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-blue-800 rounded-md flex items-center justify-center text-white text-[10px] font-bold">{p.card_type}</div>
                  <div>
                    <p className="text-sm font-medium">{p.payment_type} •••• {p.card_last4}</p>
                    <p className="text-xs text-gray-400">{p.business_card ? 'Business' : 'Personal'}</p>
                  </div>
                </div>
                <button onClick={() => deletePayment.mutate(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PrivacyPanel />
    </div>
  )
}
