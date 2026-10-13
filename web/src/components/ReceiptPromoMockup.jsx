import ProductScreenPair from './ProductScreenPair'

export default function ReceiptPromoMockup({ compact = false, eager = false }) {
  return <ProductScreenPair
    webSrc="/marketing/current/receipts.webp"
    phoneSrc="/home/goals/phone-receipts.webp"
    webAlt="GetGuac web receipt workspace"
    phoneAlt="GetGuac mobile receipt workspace"
    compact={compact}
    eager={eager}
  />
}
