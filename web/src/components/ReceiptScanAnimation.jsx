'use client'
// Full-screen scan animation that pops while a document is parsing.
//
// This is the single component behind ALL scanning surfaces — receipts
// (QuickAddReceipt, receipts-list reparse, receipt-detail email reparse,
// /demo/scan, /preview) and bank statements (statements upload) all render
// <ReceiptScanAnimation count={n} variant="receipt|statement" />. Swapping the
// internals here updates every scanning screen at once; the { count } prop
// (number of docs in flight, 0 = hidden) is the stable contract.
//
// Visual: the detective avocado roves a magnifier over the document while a
// green beam sweeps the page, narrating progress in a speech bubble. The copy
// and the page shape switch on `variant` (a receipt has the zigzag tear edge;
// a statement is flat). Single mascot — /public/scan-mascots/scan-detective.png.
//
// 🔒 NOTHING HERE MAY SHOW A VALUE. It once displayed sample chips reading
// "Walmart" and "$8.90" over a real scan in progress, which looked like a wrong
// answer. The parse returns one JSON blob at the end, so no true value exists
// while this is on screen. Values belong in the result, not the spinner.
//
// Mounts at the very top of the z-stack — beats toasts, modals, FABs. Self-hides
// instantly when `count` drops to 0. Rendered via dangerouslySetInnerHTML so the
// keyframes aren't HTML-escaped (matches the rest of the codebase's inline CSS).

import { useEffect, useState } from 'react'

// The detective narrates as it scans. Single voice. Smashlist voice ("smashed
// it in"), no competitor vocab.
const VARIANTS = {
  receipt: {
    eyebrow: 'Scanning receipt',
    status: 'Guac-AI is reading your receipt',
    noun: 'receipts',
    zigzag: true,
    // 🔴 NO INVENTED VALUES HERE. These used to read "Store spotted: Walmart",
    // "$8.90 total", "Tax $0.32" — placeholder numbers shown over somebody's
    // real receipt while it was still parsing. Someone scanning a Costco
    // receipt saw Walmart and $8.90 and reasonably concluded it had got it
    // wrong, at the exact moment you want them confident.
    //
    // Real values are impossible here anyway: parseReceiptFromFile makes ONE
    // Gemini call and returns a single JSON blob at the end — there is no
    // streaming and no partial output, so nothing true exists until it lands.
    // The real store and total appear a moment later in the result panel,
    // which is the honest place for them.
    dialogue: [
      'Magnifier out 🔍',
      'Reading the header…',
      'Finding the line items…',
      'Working out the totals…',
      'Sorting it into categories…',
      'Almost there 🥑',
    ],
  },
  statement: {
    eyebrow: 'Reading statement',
    status: 'Guac-AI is reading your statement',
    noun: 'statements',
    zigzag: false,
    // Same rule as above — no bank name, no amounts, no transaction counts
    // until they are real.
    dialogue: [
      'Scanning the rows 🔍',
      'Reading the statement period…',
      'Sorting purchases, refunds & fees…',
      'Counting every transaction…',
      'Checking for hidden fees…',
      'Almost there 🥑',
    ],
  },
}

export default function ReceiptScanAnimation({ count = 0, variant = 'receipt' }) {
  const [i, setI] = useState(0)
  const cfg = VARIANTS[variant] || VARIANTS.receipt

  useEffect(() => {
    if (!count) return
    const id = setInterval(() => setI((n) => (n + 1) % cfg.dialogue.length), 1900)
    return () => clearInterval(id)
  }, [count, cfg.dialogue.length])

  if (!count) return null

  const line = cfg.dialogue[i % cfg.dialogue.length]

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {/* Soft frosted-glass backdrop — readable + light. */}
      <div className="absolute inset-0 bg-white/75 backdrop-blur-md" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ggBeamDrop { 0% { transform: translateY(-30px); opacity: 0; } 14% { opacity: 1; } 86% { opacity: 1; } 100% { transform: translateY(168px); opacity: 0; } }
        @keyframes ggMagScan  { 0% { transform: translate(0,0) rotate(-5deg); } 25% { transform: translate(26px,20px) rotate(3deg); } 50% { transform: translate(6px,52px) rotate(7deg); } 75% { transform: translate(-12px,24px) rotate(-2deg); } 100% { transform: translate(0,0) rotate(-5deg); } }
        @keyframes ggPopIn    { 0% { opacity: 0; transform: scale(0.62) translateY(9px); } 58% { opacity: 1; transform: scale(1.06) translateY(0); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes ggSheen    { 0% { transform: translateX(-160px) skewX(-18deg); } 100% { transform: translateX(220px) skewX(-18deg); } }
        @keyframes ggDotPulse { 0%,100% { opacity: 0.25; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes ggIndet    { 0% { left: -45%; } 100% { left: 100%; } }
        @keyframes ggGlint    { 0%,100% { opacity: 0.15; } 50% { opacity: 0.6; } }
        @keyframes ggFloatY   { 0%,100% { transform: translateX(-50%) rotate(-5deg) translateY(0); } 50% { transform: translateX(-50%) rotate(-5deg) translateY(-7px); } }
        @keyframes ggGlideX   { 0%,100% { transform: translateX(0); } 50% { transform: translateX(34px); } }
        @keyframes ggLegA     { 0%,100% { transform: rotate(17deg); } 50% { transform: rotate(-17deg); } }
        @keyframes ggLegB     { 0%,100% { transform: rotate(-17deg); } 50% { transform: rotate(17deg); } }
        @keyframes ggStepBob  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @media (prefers-reduced-motion: reduce) {
          .gg-scan * { animation: none !important; }
        }
      `}} />

      <div className="gg-scan relative flex flex-col items-center pointer-events-auto">
        {/* eyebrow */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(101,163,13,0.12)', color: '#4D7C0F', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 999 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#84CC16', animation: 'ggDotPulse 1s ease-in-out infinite' }} />
            {cfg.eyebrow}
          </span>
        </div>

        {/* ===== animation stage ===== */}
        <div style={{ position: 'relative', width: 354, height: 372 }}>
          {/* document being scanned — receipt has a torn zigzag edge, statement is flat */}
          <div style={{ position: 'absolute', left: '50%', top: 116, transform: 'translateX(-50%) rotate(-5deg)', width: 132, height: 166, background: '#FFFFFF', boxShadow: '0 22px 38px -18px rgba(20,40,28,0.4)', overflow: 'hidden', borderRadius: cfg.zigzag ? 0 : 6, clipPath: cfg.zigzag ? 'polygon(0 0, 132px 0, 132px 154px, 110px 162px, 88px 154px, 66px 162px, 44px 154px, 22px 162px, 0 154px)' : 'none', animation: 'ggFloatY 4s ease-in-out infinite' }}>
            <div style={{ padding: '13px 12px' }}>
              <div style={{ height: 13, width: '64%', borderRadius: 3, background: '#15281C', marginBottom: 4 }} />
              <div style={{ height: 6, width: '40%', borderRadius: 3, background: '#D7E0CE', marginBottom: 12 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[['46%', '20%'], ['54%', '18%'], ['38%', '22%'], ['50%', '16%']].map(([a, b], k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ height: 6, width: a, borderRadius: 3, background: '#E2E8DA', display: 'block' }} />
                    <span style={{ height: 6, width: b, borderRadius: 3, background: '#E2E8DA', display: 'block' }} />
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: 'repeating-linear-gradient(90deg,#CDD7C3 0 5px,transparent 5px 10px)', margin: '11px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ height: 9, width: '36%', borderRadius: 3, background: '#4D7C0F', display: 'block' }} />
                <span style={{ height: 11, width: '30%', borderRadius: 3, background: '#65A30D', display: 'block' }} />
              </div>
            </div>
            {/* diagonal sheen */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 54, height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)', animation: 'ggSheen 2.4s ease-in-out infinite' }} />
            {/* green scan beam */}
            <div style={{ position: 'absolute', top: 0, left: -6, right: -6, height: 24, background: 'linear-gradient(180deg, rgba(132,204,22,0) 0%, rgba(132,204,22,0.55) 45%, rgba(163,230,53,0.95) 50%, rgba(132,204,22,0.55) 55%, rgba(132,204,22,0) 100%)', boxShadow: '0 0 16px 3px rgba(132,204,22,0.6)', animation: 'ggBeamDrop 2.1s ease-in-out infinite' }} />
          </div>

          {/* DETECTIVE — the single mascot: avocado walks, magnifier roves independently */}
          <div style={{ position: 'absolute', left: 12, top: 222, zIndex: 5, animation: 'ggGlideX 5s ease-in-out infinite' }}>
            <div style={{ position: 'relative', width: 90, height: 122, animation: 'ggStepBob 0.36s ease-in-out infinite' }}>
              <div style={{ position: 'absolute', left: 34, top: 66, width: 6, height: 30, borderRadius: 4, background: '#1F5E33', transformOrigin: '3px 2px', animation: 'ggLegA 0.72s ease-in-out infinite', zIndex: 1 }}>
                <div style={{ position: 'absolute', left: -4, bottom: -3, width: 14, height: 7, borderRadius: '50%', background: '#1F5E33' }} />
              </div>
              <div style={{ position: 'absolute', left: 49, top: 66, width: 6, height: 30, borderRadius: 4, background: '#194E2E', transformOrigin: '3px 2px', animation: 'ggLegB 0.72s ease-in-out infinite', zIndex: 1 }}>
                <div style={{ position: 'absolute', left: -4, bottom: -3, width: 14, height: 7, borderRadius: '50%', background: '#194E2E' }} />
              </div>
              <img src="/scan-mascots/scan-detective.png" alt="" style={{ position: 'absolute', left: 0, top: 0, height: 100, width: 'auto', zIndex: 2, filter: 'drop-shadow(0 9px 11px rgba(20,40,28,0.2))' }} />
            </div>
          </div>
          {/* magnifier roving over the page */}
          <div style={{ position: 'absolute', left: 128, top: 148, zIndex: 6, animation: 'ggMagScan 5.2s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', left: 6, top: 46, width: 13, height: 30, borderRadius: 7, background: 'linear-gradient(180deg,#3C7A27,#234D17)', border: '2px solid #18411F', transform: 'rotate(34deg)', transformOrigin: 'top center' }} />
            <div style={{ position: 'relative', width: 56, height: 60, borderRadius: '50%', border: '7px solid #2F6B1E', background: 'radial-gradient(circle at 36% 30%, rgba(204,251,241,0.82), rgba(45,212,191,0.32) 55%, rgba(13,148,136,0.16))', boxShadow: '0 7px 14px -5px rgba(20,40,28,0.4), inset 0 0 0 3px rgba(255,255,255,0.5)' }}>
              <div style={{ position: 'absolute', top: 11, left: 12, width: 18, height: 11, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', transform: 'rotate(-28deg)', animation: 'ggGlint 1.6s ease-in-out infinite' }} />
            </div>
          </div>

          {/* speech bubble — the detective narrates, tail pointing toward it */}
          <div key={i} style={{ position: 'absolute', left: 86, top: 174, maxWidth: 180, zIndex: 9, animation: 'ggPopIn 0.42s cubic-bezier(.34,1.56,.64,1) both' }}>
            <div style={{ background: '#fff', border: '1.5px solid rgba(20,83,45,0.16)', borderRadius: 17, boxShadow: '0 16px 28px -16px rgba(20,40,28,0.5)', padding: '11px 14px', fontSize: 13.5, fontWeight: 700, lineHeight: 1.34, color: '#15281C' }}>{line}</div>
            <div style={{ position: 'absolute', left: 20, bottom: -8, width: 16, height: 16, background: '#fff', borderRight: '1.5px solid rgba(20,83,45,0.16)', borderBottom: '1.5px solid rgba(20,83,45,0.16)', transform: 'rotate(45deg)' }} />
          </div>

        </div>

        {/* ===== status + progress ===== */}
        <div style={{ width: 320, maxWidth: '88vw' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#65A30D', animation: 'ggDotPulse 1.2s ease-in-out infinite' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#65A30D', animation: 'ggDotPulse 1.2s ease-in-out infinite 0.2s' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#65A30D', animation: 'ggDotPulse 1.2s ease-in-out infinite 0.4s' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4D7C0F', marginLeft: 5 }}>{cfg.status}</span>
          </div>

          <div style={{ position: 'relative', height: 7, borderRadius: 4, background: '#E4EDD8', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ position: 'absolute', top: 0, width: '42%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#A3E635,#65A30D)', animation: 'ggIndet 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#5F6D63', fontWeight: 600 }}>
            Usually takes 5–15 seconds{count > 1 ? ` · ${count} ${cfg.noun} in line` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
