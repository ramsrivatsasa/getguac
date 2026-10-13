import {academyReferences} from '../lib/academy-references.mjs'
export default function AcademyReferences({sourceSlug}){
 const sources=academyReferences(sourceSlug);if(!sources.length)return null
 return <aside className="mt-6 border-t border-slate-200 pt-4" aria-label="Further reading"><h2 className="text-lg font-bold text-slate-900">Explore another explanation</h2><ul className="mt-2 space-y-2">{sources.map(s=><li key={s.href}><a className="inline-flex min-h-11 items-center text-violet-700 font-semibold text-sm" href={s.href} target="_blank" rel="noopener noreferrer">{s.label} ↗</a><p className="text-sm text-slate-600">{s.note}</p></li>)}</ul></aside>
}
