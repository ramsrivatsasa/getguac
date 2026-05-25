'use client'
import Link from 'next/link'
import { Shield, Trash2 } from 'lucide-react'

// Small reusable banner shown above forms / sensitive screens so users always
// know what we keep, what we don't, and how to nuke everything.
// Variants:
//   - 'banner'  — full-width info card (default)
//   - 'inline'  — single-line hint, smaller
//
// Renders consistent copy across the site/app so users see the same promise
// everywhere — registration, profile, privacy, etc.
export default function PrivacyNote({ variant = 'banner', showDelete = true, className = '' }) {
  if (variant === 'inline') {
    return (
      <p className={`text-[11px] text-gray-500 flex items-center gap-1.5 ${className}`}>
        <Shield size={11} className="text-emerald-600 shrink-0" />
        Private by default — row-level security on every table.{' '}
        {showDelete && (
          <Link href="/profile" className="text-emerald-700 hover:underline font-semibold">Delete anytime →</Link>
        )}
      </p>
    )
  }

  return (
    <div className={`rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 ring-1 ring-emerald-200 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-900">Your guac. Your rules.</p>
          <ul className="mt-1.5 space-y-1 text-[12px] text-emerald-900/90 leading-snug">
            <li>• Row-level security — only you can see your data. No selling, no ads, no third-party sharing.</li>
            <li>• Inbox sync is opt-in — turn it off in Profile and we stop reading your mail.</li>
            <li>• Receipts, statements, and emails are encrypted at rest. <Link href="/security" className="underline hover:text-emerald-700">Full security details</Link>.</li>
            {showDelete && (
              <li className="font-semibold text-emerald-900">
                <Trash2 size={11} className="inline mr-1 -mt-0.5" />
                One-click <Link href="/profile" className="underline hover:text-emerald-700">delete your account + all data</Link> anytime.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
