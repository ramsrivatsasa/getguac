import Link from 'next/link'

// Drop-in for next/link on public pages. The goals/resources guides are static
// .html files in /public; a <Link> to one prefetches `?_rsc=` on production,
// which 404s (only Vercel shows it), so those get a plain anchor instead.
export default function SiteLink({ href, prefetch, replace, scroll, shallow, ...rest }) {
  const path = typeof href === 'string' ? href.split(/[?#]/)[0] : ''
  if (path.endsWith('.html')) return <a href={href} {...rest} />
  return <Link href={href} prefetch={prefetch} replace={replace} scroll={scroll} shallow={shallow} {...rest} />
}
