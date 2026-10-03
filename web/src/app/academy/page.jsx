import MarketingShell from '../../components/MarketingShell'
import { TRACKS, academyLessons } from '../../lib/academy'
import { ACADEMY_CSS } from './academy-css'
import AcademyHub from './AcademyHub'

export const metadata = {
  title: 'GetGuac Academy — free money lessons with plans and examples',
  description: 'Every GetGuac money lesson in one free course: budgeting, emergency funds, smart spending, debt, credit, investing basics, retirement and taxes — each with an action plan and a worked example.',
  alternates: { canonical: '/academy' },
  openGraph: { title: 'GetGuac Academy', description: 'Free money lessons with action plans and worked examples.', url: '/academy', images: ['/og.png'] },
}

export default function AcademyPage() {
  // Only what the hub renders crosses to the client — never the lesson bodies.
  const lessons = academyLessons().map(({ n, slug, trackId, trackName, title, excerpt, readMins }) => ({ n, slug, trackId, trackName, title, excerpt, readMins }))
  const tracks = TRACKS.map(({ id, name, icon, blurb }) => ({ id, name, icon, blurb }))
  return (
    <MarketingShell subtitle="academy" hideSearch>
      <style dangerouslySetInnerHTML={{ __html: ACADEMY_CSS }} />
      <div className="ac-page">
        <div className="ac-wrap">
          <nav className="ac-crumb" aria-label="Breadcrumb"><a className="ac-crumb-link" href="/learn">Learn</a><span aria-hidden="true">/</span><span>Academy</span></nav>
          <AcademyHub tracks={tracks} lessons={lessons} />
        </div>
      </div>
    </MarketingShell>
  )
}
