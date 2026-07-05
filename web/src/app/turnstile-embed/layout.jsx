// Utility page for the mobile app's in-register CAPTCHA webview — never
// something a search engine should list.
export const metadata = {
  title: 'Security check — GetGuac',
  robots: { index: false, follow: false },
}

export default function TurnstileEmbedLayout({ children }) {
  return children
}
