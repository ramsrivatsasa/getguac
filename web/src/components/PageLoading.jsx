import GuacMascot from './GuacMascot'
// Route loading owns the lifetime; no animation or minimum delay.
export default function PageLoading() {
  return <div role="status" aria-label="Loading screen" className="fixed inset-0 z-[100] flex items-center justify-center bg-white p-4"><GuacMascot size={140} expression="happy" /><span className="sr-only">Loading…</span></div>
}
