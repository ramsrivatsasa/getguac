export const planPeriod = (date = new Date()) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
}
export function choiceRevision(c) {
  return encodeURIComponent(JSON.stringify([c.selectedAlternative || c.key || null,c.choice,c.baselineCents,c.alternativeCents,c.mode || 'future',c.cadence || 'once',c.occurrences || 1]))
}
export function configureChoice(c, input = {}) {
  const cadence = input.cadence || c.cadence || 'once'
  const occurrences = Number(input.occurrences ?? c.occurrences ?? 1)
  const mode = input.mode || c.mode || 'future'
  if (!['once','monthly'].includes(cadence) || !['future','return_replace'].includes(mode)) throw Error('Choose a valid plan type.')
  if (!Number.isInteger(occurrences) || occurrences < 1 || occurrences > (cadence === 'monthly' ? c.observedFrequency || 1 : 1)) throw Error('Choose a frequency supported by your recorded purchases.')
  if (cadence === 'monthly' && !c.repeatEligible) throw Error('This purchase is a one-time opportunity.')
  if (mode === 'return_replace' && (cadence !== 'once' || c.sourceLabel !== 'Product')) throw Error('Return and replace requires a one-time product choice.')
  return {...c,cadence,occurrences,mode}
}
export function planTasks(progress, period = planPeriod()) {
  return (progress?.quickPlan?.choices || []).filter(c => c.decision === 'accept').flatMap(c => {
    const cycle = c.cadence === 'monthly' ? period : 'once'
    const revision = choiceRevision(c)
    const mode=c.mode || (progress.taskProgress?.[`${c.id}:return`]?.completedAt?'return_replace':'future')
    const steps = mode === 'return_replace' ? [['return',`Return ${c.title}`],['replace',`Buy ${c.choice}`]] : [['action',c.choice]]
    return Array.from({length:c.cadence === 'monthly' ? c.occurrences || 1 : 1},(_,index)=>steps.map(([step,title])=>{
      const prefix = `${c.id}:${revision}:${cycle}:${index}`
      const id = `${prefix}:${step}`
      const legacyDate=c.completedAt || progress.taskProgress?.[`${c.id}:${step}`]?.completedAt
      const legacy = !c.lifecycleVersion && legacyDate && (cycle === 'once' || String(legacyDate).startsWith(period)) ? legacyDate : null
      const event = progress.taskProgress?.[id]
      return {id,choiceId:c.id,revision,period,occurrence:index,step,title:c.cadence === 'monthly'?`${title} · ${index+1}/${c.occurrences||1}`:title,
        dependsOn:step==='replace'?`${prefix}:return`:null,receiptId:c.receiptIds?.[0],sourceUrl:step==='return'?null:c.sourceUrl,needsReview:c.needsReview,
        completedAt:event ? event.completedAt : legacy,estimateCents:step==='return'?0:c.estimateCents,cadence:c.cadence||'once',mode}
    })).flat()
  })
}
export function completedChoiceCents(progress, choice, period) {
  return planTasks({...progress,quickPlan:{choices:[choice]}},period).filter(t=>t.choiceId===choice.id && t.completedAt && String(t.completedAt).startsWith(period)).reduce((sum,t)=>sum+t.estimateCents,0)
}
export function accountingChoices(progress) {
  const choices=[...(progress?.planHistory||[]),...(progress?.quickPlan?.choices||[])]
  return [...new Map(choices.filter(c=>c.decision==='accept').map(c=>[`${c.id}:${choiceRevision(c)}`,c])).values()]
}
export function quickPlanTotals(progress, period = planPeriod()) {
  const choices=(progress?.quickPlan?.choices||[]).filter(c=>c.decision==='accept'&&!c.needsReview)
  const monthlyCents=choices.filter(c=>c.cadence==='monthly').reduce((s,c)=>s+c.estimateCents*(c.occurrences||1),0)
  const oneTimeCents=choices.filter(c=>c.cadence!=='monthly').reduce((s,c)=>s+c.estimateCents,0)
  const completedCents=accountingChoices(progress).reduce((s,c)=>s+completedChoiceCents(progress,c,period),0)
  return {monthlyCents,oneTimeCents,completedCents,plannedCents:monthlyCents+oneTimeCents}
}
export function completeTasks(state, changes, now) {
  if (!Array.isArray(changes) || !changes.length || new Set(changes.map(c=>c.id)).size!==changes.length) throw Error('Select tasks to confirm.')
  const period=planPeriod(now)
  state.taskProgress ||= {}
  for (const task of planTasks(state,period)) if (task.completedAt && !state.taskProgress[task.id]) state.taskProgress[task.id]={completedAt:task.completedAt}
  const originalTasks=planTasks(state,period)
  for (const change of changes) {
    const tasks=planTasks(state,period),task=tasks.find(t=>t.id===change.id)
    if (!task || task.needsReview || typeof change.done!=='boolean') throw Error('This task changed. Review your plan.')
    if(change.done && task.dependsOn && !originalTasks.find(t=>t.id===task.dependsOn)?.completedAt) throw Error('Confirm the return before buying the replacement.')
    if(!change.done && tasks.some(t=>t.dependsOn===task.id && t.completedAt)) throw Error('Undo the replacement first.')
    state.taskProgress[task.id]={completedAt:change.done?now:null,period,revision:task.revision}
    const choice=state.quickPlan.choices.find(c=>c.id===task.choiceId)
    choice.lifecycleVersion=1
    const own=planTasks(state,period).filter(t=>t.choiceId===choice.id)
    choice.completedAt=own.every(t=>t.completedAt)?now:null
  }
}
