import fs from 'node:fs'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import HomeStandaloneClient from './HomeStandaloneClient'

export const metadata = {
  title: 'GetGuac: Free Receipt Scanner & Spending Tracker',
  description:
    'Scan receipts, see where your money goes, catch hidden fees, and never miss a refund. GetGuac is a free AI receipt scanner and spending tracker.',
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

  const homepage = loadHomepage()
  return <HomeStandaloneClient {...homepage} />
}
