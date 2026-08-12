import MarketingShell from '../../components/MarketingShell'
import JoinDemoClient from './JoinDemoClient'

export const metadata = {
  title: { absolute: 'One receipt. A clearer picture. | GetGuac' },
  description: 'See how GetGuac turns a receipt into organized, searchable purchases.',
  robots: { index: false, follow: false },
}

export default function JoinDemoPage() {
  return (
    <MarketingShell ads={false} hideSearch>
      <JoinDemoClient />
    </MarketingShell>
  )
}
