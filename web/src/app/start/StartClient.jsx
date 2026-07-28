'use client'
// /start — the paid-ad landing page, modelled on the Origin ad flow.
//
// WHY A DEDICATED PAGE: the App-installs ads sent people to the App/Play Store
// and converted nobody (21 link clicks, ~2 store-listing visitors, 0 installs).
// Every extra hop kills a share of the traffic: click -> store -> install ->
// open -> sign up. GetGuac is a full web app, so a web signup is the complete
// product, not a consolation prize. This page removes every hop it can.
//
// Deliberately NOT the homepage: no nav, no marketing links, no store badges,
// nothing to click except signing up. Ad traffic has one job here.
//
// ⚠️ HONESTY: Origin's page leans on "180K+ MEMBERS" and a 5-star rating. We
// have neither, so this page makes no claim about user counts, ratings or
// results. The hooks used are all things that are actually true today: it's
// free, there's no card, and it reads receipts you already get. Do not add
// invented social proof here — it is the first page a stranger ever sees.
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import { trackSignup } from '../../components/MetaPixel'

const INK = '#0B1410'

export default function StartClient() {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  async function oauth(provider) {
    setBusy(provider); setErr('')
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      })
      if (error) { setErr(error.message); setBusy('') }
      else trackSignup(provider)
    } catch (e) {
      setErr(e?.message || `Could not start ${provider} sign in`)
      setBusy('')
    }
  }

  const btn = 'w-full flex items-center justify-center gap-3 rounded-2xl py-4 font-bold text-[15px] transition-transform active:scale-[0.99]'

  return (
    <main style={{ background: INK, minHeight: '100svh' }} className="px-5 py-9">
      <div className="mx-auto w-full" style={{ maxWidth: 430 }}>

        <div className="text-center">
          <div aria-hidden style={{ fontSize: 44, lineHeight: 1 }}>🥑</div>
          <h1 className="font-display font-extrabold mt-4 mb-0 text-white" style={{ fontSize: 40, lineHeight: 1.05 }}>
            Free
          </h1>
          <p className="font-display text-white/90 m-0" style={{ fontSize: 26, lineHeight: 1.2 }}>
            forever
          </p>
          <p className="mt-3 mb-0 text-sm" style={{ color: 'rgba(255,255,255,0.62)' }}>
            No card. No trial. No subscription to cancel.
          </p>

          {/* Honest capability claims — what the product does, not how many
              people use it or what they saved. */}
          <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
            {['Reads your email receipts', 'Finds what you overpaid', 'Works on any phone'].map((t) => (
              <span key={t} className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(134,239,172,0.12)', color: '#86efac' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Product shot — a real screenshot of the real dashboard.
            NB: this pointed at /og-dashboard.png, which does not exist in
            public/. The onError below hid the broken image, so the ad's landing
            page had been shipping with no product shot at all and nothing
            surfaced it. Use the goal art the homepage already ships. */}
        <div className="mt-7 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home/goals/phone-guacscore.webp"
            alt="GetGuac on iPhone: a GuacScore of 74, net spent, refunds, bank fees, receipts and tax paid"
            width={244} height={514} loading="eager"
            style={{ width: 244, maxWidth: '72%', height: 'auto', display: 'block', filter: 'drop-shadow(0 26px 46px rgba(0,0,0,0.55))' }} />
        </div>

        <div className="mt-7 space-y-3">
          <button type="button" onClick={() => oauth('google')} disabled={!!busy}
            className={btn} style={{ background: '#fff', color: '#1f2937' }}>
            {busy === 'google' ? 'Opening Google…' : (<><span aria-hidden style={{ fontSize: 18 }}>🔵</span> Continue with Google</>)}
          </button>

          <Link href="/register" onClick={() => trackSignup('email')}
            className={`${btn} no-underline`} style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}>
            Continue with email
          </Link>
        </div>

        {err && <p className="mt-3 text-center text-sm" style={{ color: '#fca5a5' }}>{err}</p>}

        <p className="mt-6 text-center text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#fff', fontWeight: 700 }}>SIGN IN</Link>
        </p>

        <p className="mt-7 text-center text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
          By creating an account you agree to our{' '}
          <Link href="/terms" style={{ color: 'rgba(255,255,255,0.72)' }}>Terms of Service</Link> and{' '}
          <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.72)' }}>Privacy Policy</Link>. We never sell your data.
        </p>
      </div>
    </main>
  )
}
