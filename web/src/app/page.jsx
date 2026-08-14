import fs from 'node:fs'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import HomeInteractions from './HomeInteractions'

export const metadata = {
  title: 'GetGuac: Make Every Dollar Worth It',
  description:
    'Turn receipts and statements into smarter money decisions. Find spending patterns, hidden fees, missed refunds, better prices, and purchases truly worth repeating.',
  alternates: { canonical: '/' },
}

function extract(source, pattern, label) {
  const match = source.match(pattern)
  if (!match) throw new Error(`Homepage source is missing ${label}`)
  return match[1]
}

function loadHomepage() {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'homepage-source.html'), 'utf8')
  const css = extract(source, /<style>([\s\S]*?)<\/style>/i, 'styles')
  const body = extract(source, /<body[^>]*>([\s\S]*?)<\/body>/i, 'body')
  const script = extract(body, /<script>([\s\S]*?)<\/script>/i, 'interaction script')
  const markup = body.replace(/<script>[\s\S]*?<\/script>/i, '')
  return { css, markup, script }
}

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { css, markup, script } = loadHomepage()
  // Markup and styles are rendered HERE, by the server component, so React never
  // owns or re-creates them on hydration. That is what lets the browser record a
  // Largest Contentful Paint against the real first paint instead of waiting for
  // the client to take over. Only the behaviour is an island.
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      <HomeInteractions script={script} />
    </>
  )
}
