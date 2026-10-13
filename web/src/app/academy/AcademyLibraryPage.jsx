import Link from 'next/link'
import MarketingShell from '../../components/MarketingShell'
import AdSlot from '../../components/AdSlot'
import {TRACKS, academyLessons} from '../../lib/academy'
import {ACADEMY_CSS} from './academy-css'
import AcademyHub from './AcademyHub'
import AcademyResources from './AcademyResources'

const CONTENT = {
 articles:{heading:'Fresh perspectives on everyday money.',intro:'Read practical articles about spending habits, shopping costs, refunds and everyday savings. Choose a topic, then explore the ideas behind your next decision.',photo:'/home/story-people/capture-blonde-produce-v1-768.webp',photoAlt:'A shopper reviewing a receipt in a grocery store'},
 guides:{heading:'A little guidance. A clearer next step.',intro:'Follow practical guides for budgeting, saving and consumer protection, with checklists and trusted educational references to help you put an idea into practice.',photo:'/home/campaign-story/understand-couple-v2.webp',photoAlt:'A couple reviewing household records together'},
 tools:{heading:'Turn money questions into a useful plan.',intro:'Explore budgeting and savings calculators, planning worksheets and GetGuac tools. Check the numbers and assumptions before choosing your next step.',photo:'/home/campaign-story/protect-return-v2.webp',photoAlt:'A woman checking a receipt and phone beside a purchase'},
}

export default function AcademyLibraryPage({section='lessons'}) {
 const lessons=academyLessons().map(({n,slug,progressSlug,trackId,trackName,title,excerpt,readMins})=>({n,slug,progressSlug,trackId,trackName,title,excerpt,readMins}))
 const tracks=TRACKS.map(({id,name,icon,blurb})=>({id,name,icon,blurb}))
 const structured={
  '@context':'https://schema.org','@type':'CollectionPage',
  name:`GetGuac Academy ${section}`,url:`https://getguac.app/academy/${section}`,
  description:CONTENT[section]?.intro || 'Free money lessons with examples, practice questions and practical action steps.',
  breadcrumb:{'@type':'BreadcrumbList',itemListElement:[
   {'@type':'ListItem',position:1,name:'Home',item:'https://getguac.app/'},
   {'@type':'ListItem',position:2,name:section.charAt(0).toUpperCase()+section.slice(1),item:`https://getguac.app/academy/${section}`},
  ]},
 }
 return <MarketingShell subtitle="academy" hideSearch>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}} />
  <style dangerouslySetInnerHTML={{__html:ACADEMY_CSS}} />
  <div className="ac-page"><div className="ac-wrap">
   <nav className="ac-crumb" aria-label="Breadcrumb"><Link className="ac-crumb-link" href="/">Home</Link><span aria-hidden="true">/</span><Link className="ac-crumb-link" href="/academy">Academy</Link><span aria-hidden="true">/</span><span>{section.charAt(0).toUpperCase()+section.slice(1)}</span></nav>
   <AcademyHub tracks={tracks} lessons={lessons} section={section} {...CONTENT[section]} resources={section==='lessons'?{}:{[section]:<AcademyResources section={section} />}} />
   <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOTTOM||'9142744455'} minHeight={90} />
  </div></div>
 </MarketingShell>
}
