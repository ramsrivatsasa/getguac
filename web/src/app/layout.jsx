import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'GetGuac',
  description: 'Smart receipt management, rewards tracking & spending insights',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
