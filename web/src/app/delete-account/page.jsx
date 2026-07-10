// Public /delete-account — required by Google Play's data-deletion policy.
// The URL (getguac.app/delete-account) goes in the Play Console Data safety
// form. Server wrapper: MarketingShell needs cookies(), so the sign-in check
// and deletion flow live in the client component DeleteAccountClient.jsx.

import MarketingShell from '../../components/MarketingShell'
import DeleteAccountClient from './DeleteAccountClient'

export const metadata = {
  title: 'Delete your GetGuac account & data',
  description: 'Permanently delete your GetGuac account and all associated data — in the app, on the web, or by email. What gets deleted and retention explained.',
}

export default function DeleteAccountPage() {
  return (
    <MarketingShell subtitle="delete account">
      <DeleteAccountClient />
    </MarketingShell>
  )
}
