import GuacMascot from './GuacMascot'

export default function PlanPageHeader({title,subtitle}) {
  return <div className="space-y-3"><header className="flex items-center gap-3"><span className="shrink-0"><GuacMascot size={56}/></span><div className="min-w-0"><h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-600">{subtitle}</p></div></header></div>
}
