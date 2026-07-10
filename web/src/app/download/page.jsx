// /download — fresh-install + manual-update page for the mobile apps.
// Server wrapper: MarketingShell needs cookies(), so the platform-detect
// and copy-link logic lives in the client component DownloadClient.jsx.

import MarketingShell from '../../components/MarketingShell'
import DownloadClient from './DownloadClient'

export const metadata = {
  title: 'Download GetGuac — Android APK, iPhone & web',
  description: 'Get the GetGuac app: direct Android APK download, iPhone home-screen install, or use it right in your browser.',
}

export default function DownloadPage() {
  return (
    <MarketingShell subtitle="download">
      <DownloadClient />
    </MarketingShell>
  )
}
