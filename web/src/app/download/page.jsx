'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Smartphone, Apple, Monitor, Share2, Check } from 'lucide-react'
import GuacMascot from '../../components/GuacMascot'

// Latest Android release — bump these when you cut a new version on GitHub.
// In a future iteration we can fetch /repos/ramsrivatsasa/getguac/releases/latest at build time.
const ANDROID_RELEASE = {
  version: 'v0.2.30',
  releasedAt: '2026-05-26',
  base: 'https://github.com/ramsrivatsasa/getguac/releases/download/v0.2.30',
  apks: [
    { abi: 'arm64-v8a',   sizeMB: 20.6, label: 'Most modern Android phones (Samsung, Pixel, OnePlus, etc.)', file: 'app-arm64-v8a-release.apk',   primary: true  },
    { abi: 'armeabi-v7a', sizeMB: 18.4, label: 'Older 32-bit Android phones',                                   file: 'app-armeabi-v7a-release.apk', primary: false },
    { abi: 'x86_64',      sizeMB: 22.1, label: 'Android emulators + Chromebooks',                                file: 'app-x86_64-release.apk',      primary: false },
  ],
}

function detectPlatform(ua) {
  if (!ua) return 'desktop'
  const s = ua.toLowerCase()
  if (/android/.test(s)) return 'android'
  if (/iphone|ipad|ipod/.test(s)) return 'ios'
  return 'desktop'
}

export default function DownloadPage() {
  const [platform, setPlatform] = useState('desktop')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent))
    // Set the dismiss cookie so the middleware doesn't keep redirecting them
    // here on every homepage visit. 30-day expiry — they'll see the redirect
    // again later when new releases are likely.
    document.cookie = 'seen_download=1; path=/; max-age=2592000; samesite=lax'
  }, [])

  const primaryApk = ANDROID_RELEASE.apks.find(a => a.primary)

  function copy(text) {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-lime-700">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-lime-300 via-emerald-400 to-emerald-700 shadow-2xl ring-4 ring-white mb-4">
            <span className="text-6xl">🥑</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Download GetGuac</h1>
          <p className="text-emerald-100 mt-2 text-sm sm:text-base">Money's wingman — on your phone, in your pocket.</p>
        </div>

        {/* Android — primary on Android, but always visible */}
        <section className={`card bg-white rounded-3xl p-6 sm:p-8 shadow-2xl mb-6 ${platform === 'android' ? 'ring-4 ring-lime-300' : ''}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Smartphone size={28} className="text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-emerald-900 flex items-center gap-2 flex-wrap">
                Android
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full px-2 py-0.5">{ANDROID_RELEASE.version}</span>
                {platform === 'android' && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-lime-300 text-emerald-900 rounded-full px-2 py-0.5">You&apos;re on Android</span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Native app for Android 5.0+ · {primaryApk.sizeMB} MB · released {ANDROID_RELEASE.releasedAt}</p>
            </div>
          </div>

          {/* Big primary download button */}
          <a
            href={`${ANDROID_RELEASE.base}/${primaryApk.file}`}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white text-base font-bold shadow-lg hover:shadow-xl transition-all"
            download
          >
            <Download size={20} />
            Download GetGuac APK
            <span className="ml-2 text-[11px] font-semibold opacity-80">({primaryApk.sizeMB} MB)</span>
          </a>

          {/* Install instructions */}
          <details className="mt-4 text-sm text-gray-700">
            <summary className="cursor-pointer font-semibold text-emerald-800 hover:text-emerald-900">How to install on Android</summary>
            <ol className="list-decimal pl-5 mt-2 space-y-1.5 text-gray-700">
              <li>Tap the green button above on your phone &mdash; the APK downloads.</li>
              <li>Open your <strong>Downloads</strong> notification or the file manager.</li>
              <li>Tap <strong>app-arm64-v8a-release.apk</strong>.</li>
              <li>Android may ask: &ldquo;Allow this source to install unknown apps?&rdquo; &mdash; tap <strong>Settings</strong> → toggle <strong>Allow from this source</strong> → back.</li>
              <li>Tap <strong>Install</strong> → done. The GetGuac icon appears in your app drawer.</li>
            </ol>
          </details>

          {/* Other ABIs */}
          <details className="mt-3 text-xs text-gray-600">
            <summary className="cursor-pointer font-semibold hover:text-emerald-800">Other devices (32-bit, emulators)</summary>
            <div className="mt-2 space-y-1">
              {ANDROID_RELEASE.apks.filter(a => !a.primary).map(a => (
                <a
                  key={a.abi}
                  href={`${ANDROID_RELEASE.base}/${a.file}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors"
                  download
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-emerald-900 truncate">{a.file}</p>
                    <p className="text-[10px] text-gray-500 truncate">{a.label}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 shrink-0">{a.sizeMB} MB</span>
                </a>
              ))}
            </div>
          </details>
        </section>

        {/* iOS */}
        <section className={`card bg-white rounded-3xl p-6 sm:p-8 shadow-2xl mb-6 ${platform === 'ios' ? 'ring-4 ring-lime-300' : ''}`}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
              <Apple size={28} className="text-gray-800" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2 flex-wrap">
                iPhone
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">Web app</span>
                {platform === 'ios' && (
                  <span className="text-[11px] font-semibold uppercase tracking-wider bg-lime-300 text-emerald-900 rounded-full px-2 py-0.5">You&apos;re on iOS</span>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Install GetGuac on your home screen via Safari. Native iOS app coming soon via TestFlight.</p>
            </div>
          </div>

          <ol className="mt-5 list-decimal pl-5 space-y-2 text-sm text-gray-700">
            <li>Open <strong>getguac.app</strong> in <strong>Safari</strong> (not Chrome).</li>
            <li>Tap the <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 font-mono text-xs"><Share2 size={11} /> Share</span> button at the bottom of the screen.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right.</li>
            <li>The avocado icon appears on your home screen. Tap it to open GetGuac fullscreen.</li>
          </ol>
        </section>

        {/* Web */}
        <section className="card bg-white rounded-3xl p-6 sm:p-8 shadow-2xl mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Monitor size={28} className="text-indigo-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-gray-900">Web</h2>
              <p className="text-sm text-gray-600 mt-1">Use GetGuac in your browser &mdash; everything works.</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow transition-colors"
          >
            Open in this browser
          </Link>
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-emerald-100 mt-8">
          Source &amp; full release notes: <a href="https://github.com/ramsrivatsasa/getguac/releases" className="underline hover:text-white">GitHub</a>
        </p>
        <p className="text-center mt-3">
          <button
            onClick={() => copy(`${ANDROID_RELEASE.base}/${primaryApk.file}`)}
            className="inline-flex items-center gap-2 text-xs text-emerald-200 hover:text-white"
          >
            {copied ? <Check size={12} /> : '🔗'}
            {copied ? 'Copied!' : 'Copy direct APK link'}
          </button>
        </p>
      </div>
    </div>
  )
}
