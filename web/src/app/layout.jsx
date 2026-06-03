import './globals.css'
import { Providers } from './providers'
import UpdatePrompt from '../components/UpdatePrompt'
import PosthogProvider from '../components/PosthogProvider'

export const metadata = {
  title: 'GetGuac',
  description: 'Smart receipt management, rewards tracking & spending insights',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* PostHog wraps the tree so its useEffect-based pageview tracker
            can read pathname/search on every route change. No-ops cleanly
            if NEXT_PUBLIC_POSTHOG_KEY is unset. */}
        <PosthogProvider>
          <Providers>{children}</Providers>
        </PosthogProvider>
        {/* Floating banner that detects a Vercel redeploy and
            prompts the user to reload — so a stale tab doesn't
            keep running on yesterday's bundle. Renders at the
            root layout so every route gets it. */}
        <UpdatePrompt />
      </body>
    </html>
  )
}
