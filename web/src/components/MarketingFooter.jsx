import Link from 'next/link'

const COLS = [
  { heading: 'Product', links: [['Marketplace','/marketplace'],['Coupons','/coupons'],['Games','/games'],['Features','/features'],['How it works','/how-it-works'],['Pricing','/pricing']] },
  { heading: 'Learn', links: [['Resources','/learn'],['Articles','/articles'],['Calculators','/calculators'],['FAQ','/faq'],['How email works','/how-email-works'],['Security','/security']] },
  { heading: 'Company', links: [['About','/about'],['Contact','/contact'],['Privacy','/privacy'],['Terms','/terms'],['Sitemap','/sitemap.html'],['Get started','/register']] },
]

export default function MarketingFooter() {
  return <footer style={{borderTop:'1px solid rgba(20,83,45,.10)',background:'#FBFCF8',fontFamily:'var(--font-jakarta), system-ui, sans-serif'}}>
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 py-7 sm:grid-cols-3 lg:grid-cols-[1.35fr_1fr_1fr_.8fr]" style={{width:'min(1180px, calc(100% - clamp(24px, 5vw, 56px)))',margin:'0 auto'}}>
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-[13px] font-extrabold text-[#15281C] lg:min-h-6"><span aria-hidden="true">🥑</span>GetGuac</Link>
        <p className="mt-1 text-xs leading-5 text-[#5C6B60]">Your money’s wingman. Keep more guac in your pocket.</p>
      </div>
      {COLS.map(col=><nav key={col.heading} aria-label={`${col.heading} footer links`}>
        <h2 className="flex min-h-6 items-center text-[13px] font-bold text-[#15281C]">{col.heading}</h2>
        <ul>{col.links.map(([label,href])=><li key={href}><Link href={href} className={`flex min-h-11 items-center text-xs leading-5 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:min-h-6 ${label==='Get started'?'text-green-700':'text-[#5C6B60]'}`}>{label}</Link></li>)}</ul>
      </nav>)}
    </div>
  </footer>
}
