import './globals.css'
import { Providers } from './providers'
import UpdatePrompt from '../components/UpdatePrompt'

export const metadata = {
  title: 'GetGuac',
  description: 'Smart receipt management, rewards tracking & spending insights',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        {/* Floating banner that detects a Vercel redeploy and
            prompts the user to reload — so a stale tab doesn't
            keep running on yesterday's bundle. Renders at the
            root layout so every route gets it. */}
        <UpdatePrompt />
      </body>
    </html>
  )
}
