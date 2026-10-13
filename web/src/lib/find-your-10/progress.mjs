import {saveInvestmentChoice} from './investment-options.mjs'
import {cashOptions,CASH_SUBJECT,saveCashChoice} from './cash-options.mjs'
import {cdOptions,CD_SUBJECT,saveCdChoice} from './cd-options.mjs'
import {updateWealthJourney} from './wealth-journey.mjs'
import {WEALTH_OPTIONS} from './wealth-options.mjs'
import {suggestionKey} from './suggestion-feedback.mjs'
import {evidenceAmount} from './evidence.mjs'
import {configureChoice,choiceRevision,completeTasks,planPeriod,quickPlanTotals} from './lifecycle.mjs'
import { planTasks } from './tasks.mjs'
import { quickOpportunities, selectQuickAlternative } from './quick-plan.mjs'
import {purchasePlanRows} from './purchase-plan.mjs'
import {cashComparison} from './cash-comparison.mjs'
import {PLAN_LESSONS,checkPlanLesson} from './lessons.mjs'
import {billOptions} from './bill-options.mjs'
import {utilityGuidance} from './utility-guidance.mjs'
// Savings evidence references existing records; it never creates parallel captures.
import { accountOpportunities, comparableItem, usableItem, usableReceipt } from './opportunities.mjs'
import { WIZARD_STEPS, WIZARD_TARGETS, purchaseChoices, itemKey } from './wizard.mjs'
export const emptyProgress = () => ({ version: 0, actions: [], ledger: [], requests: [] })
const cents = value => Math.round(Number(value) * 100)
const reject = message => { throw new Error(message) }
function conflicts(actions, candidate, ledger = []) {
  return actions.some(a => (a.accepted || ledger.some(l => l.actionId === a.id)) && a.id !== candidate.id && (
    (a.itemKey && a.itemKey === candidate.itemKey) ||
    ((a.type === 'spending' || candidate.type === 'spending') && a.category && a.category === candidate.category) ||
    (a.seriesId && a.seriesId === candidate.seriesId)
  ))
}
export function progressTotals(state = emptyProgress(), month) {
  return {
    foundCents: state.actions.filter(a => a.accepted).reduce((sum, a) => sum + a.estimateCents, 0) + quickPlanTotals(state,month).plannedCents,
    keptCents: state.ledger.filter(l => l.period === month).reduce((sum, l) => sum + l.amountCents, 0),
    totalKeptCents: state.ledger.reduce((sum, l) => sum + l.amountCents, 0),
    movedCents: state.ledger.reduce((sum, l) => sum + (l.movedCents || 0), 0),
  }
}
export function applyProgress(state, operation, data, now = new Date().toISOString()) {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation) || !operation.data || typeof operation.data !== 'object' || Array.isArray(operation.data)) reject('Invalid progress request.')
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(operation.requestId || '')) reject('Invalid request identifier.')
  const receipt = JSON.stringify({ type: operation.type, data: operation.data })
  const prior = state.requests.find(r => r.id === operation.requestId)
  if (prior) { if (prior.receipt !== receipt) reject('This request was already used.'); return state }
  if (operation.version !== state.version) throw Object.assign(new Error('Your plan changed in another tab. Refresh before retrying.'),{status:409})
  data = {...data,progress:state}
  const next = structuredClone(state), input = operation.data || {}, bills = data.billCycles || []
  if(operation.type==='savings-plan') {
    const purchases=input.choices===null?state:applyProgress(state,{...operation,type:'quick-plan',requestId:operation.requestId+'-p',data:{choices:input.choices}},data,now)
    const combined=applyProgress(purchases,{...operation,type:'bill-plan',version:purchases.version,requestId:operation.requestId+'-b',data:{choices:input.bills}},data,now)
    combined.version=state.version+1
    combined.requests=[...state.requests,{id:operation.requestId,receipt}]
    return combined
  }
  if(operation.type==='suggestion-feedback') {
    next.suggestionFeedback ||= []
    if(input.restore===true) {
      const entry=next.suggestionFeedback.find(f=>f.key===input.key&&!f.restoredAt)
      if(!entry)reject('This preference changed. Refresh your plan.')
      entry.restoredAt=now
    } else {
      let subject,option,label,candidateSnapshot
      if(input.scope==='purchase') {
        const candidate=quickOpportunities(data,new Date(now)).find(c=>c.itemKey===input.subject)
        option=candidate?.alternatives?.find(o=>o.key===input.option)
        subject=candidate?.itemKey;label=candidate?.title;candidateSnapshot=candidate
      } else if(input.scope==='bill') {
        const bill=billOptions(data,new Date(now)).find(b=>b.seriesId===input.subject)
        option=bill?.options.find(o=>o.id===input.option)
        subject=bill?.seriesId;label=bill?.title;candidateSnapshot=option
      } else if(input.scope==='cash'&&input.subject===CD_SUBJECT) {
        option=cdOptions(state,new Date(now),data.depositQuotes).find(o=>o.id===input.option)
        subject=CD_SUBJECT;label='CD';candidateSnapshot=option
      } else if(input.scope==='cash'&&input.subject===CASH_SUBJECT) {
        option=cashOptions(state,new Date(now),data.depositQuotes).find(o=>o.id===input.option)
        subject=CASH_SUBJECT;label='Savings account';candidateSnapshot=option
      }
      if(!option||!subject)reject('This suggestion changed. Refresh your plan.')
      const key=suggestionKey(input.scope,subject,option)
      const entry={key,scope:input.scope,subject,label,optionLabel:option.title||option.choice,rejectedAt:now,snapshot:{...candidateSnapshot,...option},excluded:true}
      next.suggestionFeedback=next.suggestionFeedback.filter(f=>f.key!==key)
      next.suggestionFeedback.push(entry)
      if(input.scope==='purchase') {
        for(const choice of next.quickPlan?.choices||[]) {
          if(suggestionKey('purchase',choice.itemKey,choice)===key) {
            choice.decision='excluded';choice.excludedAt=now
          }
        }
        if(next.quickPlan)next.quickPlan.estimatedCents=next.quickPlan.choices.filter(c=>c.decision==='accept').reduce((n,c)=>n+c.estimateCents,0)
      } else if(input.scope==='bill') {
        for(const action of next.actions)if(action.seriesId===subject&&action.optionId===option.id) {
          action.accepted=false;action.excludedAt=now
        }
      }
      if(input.scope==='cash') {
        if(next.cdChoice?.optionId===option.id) {
          next.cdChoice.decision='excluded'
          next.cdChoice.excludedAt=now
        }
        if(next.cashChoice?.optionId===option.id) {
          next.cashChoice.decision='excluded'
          next.cashChoice.excludedAt=now
        }
      }
    }
  } else if(operation.type==='bill-quote') {
    const action=next.actions.find(a=>a.id===input.id&&a.accepted&&a.optionId&&a.optionId!=='keep'&&!a.usageReduction)
    if(!action||action.optionId!==input.optionId)reject('Save this provider choice before confirming its quote.')
    if(input.eligible!==true||input.comparable!==true)reject('Confirm eligibility, matching service and all recurring charges.')
    const monthly=String(input.monthly??''),switching=String(input.switching??'')
    if(!/^\d{1,7}(\.\d{1,2})?$/.test(monthly)||!/^\d{1,7}(\.\d{1,2})?$/.test(switching))reject('Enter the full monthly price and one-time costs.')
    if(cents(monthly)>=action.baselineCents)reject('This quote does not lower the recorded monthly bill.')
    const terms=String(input.terms||'').trim()
    if(!terms||terms.length>500)reject('Record the contract, promotion and cancellation terms (up to 500 characters).')
    action.confirmedQuote={monthlyCents:cents(monthly),switchingCents:cents(switching),terms,confirmedAt:now,source:'member-confirmed provider quote'}
    action.eligibilityPending=false;action.switchingCents=cents(switching);action.estimateCents=action.baselineCents-cents(monthly)
  } else if(operation.type==='utility-guide') {
    const action=next.actions.find(a=>a.id===input.id&&a.accepted&&a.usageReduction)
    if(!action||typeof input.done!=='boolean')reject('Choose a valid utility guide task.')
    if(input.done)action.completedAt=now;else delete action.completedAt
  } else if(operation.type==='utility-steps') {
    const action=next.actions.find(a=>a.id===input.id&&a.accepted&&a.usageReduction)
    if(!action)reject('Choose a utility usage task first.')
    const allowed=utilityGuidance(`${action.title} ${action.category||''}`).steps.map(s=>s.id)
    if(!Array.isArray(input.steps)||input.steps.length>allowed.length||new Set(input.steps).size!==input.steps.length||input.steps.some(id=>!allowed.includes(id)))reject('Choose valid utility steps.')
    action.utilitySteps=input.steps;action.utilityUpdatedAt=now
  } else if (operation.type === 'bill-plan') {
    const available=billOptions(data,new Date(now))
    if(!Array.isArray(input.choices)||input.choices.length>available.length||new Set(input.choices.map(c=>c.seriesId)).size!==input.choices.length)reject('Refresh your bill choices and try again.')
    for(const choice of input.choices) {
      const bill=available.find(b=>b.seriesId===choice.seriesId),option=bill?.options.find(o=>o.id===choice.optionId)
      if(!bill||(!option&&choice.optionId!=='keep'))reject('This bill option changed. Refresh before saving.')
      const id=`bill-option:${bill.seriesId}`
      const existing=next.actions.find(a=>a.id===id)
      if(existing&&next.ledger.some(l=>l.actionId===id)) {
        if(existing.optionId!==choice.optionId)reject('This choice has verified history. Keep it while reviewing a new bill.')
        existing.accepted=choice.optionId!=='keep'
        delete existing.excludedAt
        continue
      }
      // Preserve existing evidence history, but never layer two forecasts on a service.
      next.actions.filter(a=>a.seriesId===bill.seriesId).forEach(a=>{a.accepted=false})
      const action={id,type:'bill',seriesId:bill.seriesId,sourceId:bill.id,title:bill.title,category:bill.category,baselineCents:bill.amountCents,sourceDate:bill.date,optionId:choice.optionId,optionTitle:option?.title||'Keep current plan',sourceUrl:option?.url,checkedAt:option?.checkedAt,feeCents:0,switchingCents:option?.setupCents||0,potentialCents:option?.differenceCents||0,estimateCents:0,accepted:choice.optionId!=='keep',acceptedAt:now,perLine:Boolean(option?.perLine),eligibilityPending:choice.optionId!=='keep'&&!option?.usage,usageReduction:Boolean(option?.usage)}
      if(existing?.optionId===choice.optionId&&existing.confirmedQuote) {
        action.confirmedQuote=existing.confirmedQuote;action.eligibilityPending=false
        action.switchingCents=existing.confirmedQuote.switchingCents
        action.estimateCents=Math.max(0,bill.amountCents-existing.confirmedQuote.monthlyCents)
      } else if(existing)delete existing.confirmedQuote
      if(action.usageReduction) {
        const steps=utilityGuidance(`${bill.title} ${bill.category||''}`).steps.map(s=>s.id)
        action.utilitySteps=(existing?.utilitySteps||[]).filter(id=>steps.includes(id))
      }
      if(existing)Object.assign(existing,action);else next.actions.push(action)
    }
  } else if (operation.type === 'quick-plan') {
    const available = purchasePlanRows(data, new Date(now))
    if (!Array.isArray(input.choices) || input.choices.length > available.length+(state.quickPlan?.choices?.length||0) || new Set(input.choices.map(c => c.id)).size !== input.choices.length) reject('Invalid plan choices.')
    const choices = input.choices.map(choice => {
      const savedChoice = state.quickPlan?.choices.find(c => c.id === choice.id)
      // Saving another purchase must not re-price completed work against a refreshed catalogue.
      if (savedChoice && (savedChoice.completedAt || savedChoice.lifecycleVersion) &&
          choice.decision === savedChoice.decision &&
          (choice.alternative ?? null) === (savedChoice.selectedAlternative ?? null) &&
          ['homeCost','cadence','occurrences','mode'].every(key => (choice[key] ?? null) === (savedChoice[key] ?? null))) {
        return structuredClone(savedChoice)
      }
      const candidate = available.find(c => c.id === choice.id)
      if (!candidate || !['accept','keep'].includes(choice.decision)) reject('Your opportunities changed. Refresh before saving.')
      if(choice.decision==='keep')return {...candidate,decision:'keep',choice:'Keep current purchase',alternativeCents:candidate.baselineCents,estimateCents:0,selectedAlternative:null,cadence:'once',occurrences:1,mode:'future',acceptedAt:now}
      if(candidate.keepOnly)reject('A comparable lower price is required before selecting a saving.')
      const selected = { ...configureChoice(selectQuickAlternative(candidate, choice.alternative, choice.homeCost),choice), decision: choice.decision, acceptedAt:now }
      if(selected.reviewOnly)Object.assign(selected,{estimateCents:0,needsReview:true,cadence:'once',occurrences:1,mode:'future'})
      const previous = state.quickPlan?.choices.find(c=>c.id===selected.id)
      if(previous && choiceRevision(previous)===choiceRevision({...selected,choice:previous.choice})) selected.choice=previous.choice
      if (previous && !previous.needsReview && previous.decision===selected.decision && choiceRevision(previous)===choiceRevision(selected)) { selected.completedAt=previous.completedAt; selected.lifecycleVersion=previous.lifecycleVersion; selected.acceptedAt=previous.acceptedAt||now }
      return selected
    })
    // Saving visible recent purchases must preserve choices outside this window.
    for(const previous of state.quickPlan?.choices||[])if(!available.some(c=>c.id===previous.id)&&!choices.some(c=>c.id===previous.id))choices.push(structuredClone(previous))
    next.planHistory ||= []
    for(const previous of state.quickPlan?.choices||[]) {
      if(previous.decision==='accept' && !choices.some(c=>c.id===previous.id&&c.decision==='accept'&&choiceRevision(c)===choiceRevision(previous)) && !next.planHistory.some(c=>c.id===previous.id&&choiceRevision(c)===choiceRevision(previous))) next.planHistory.push(structuredClone(previous))
    }
    next.quickPlan = { choices, savedAt: now, status: 'planned', estimatedCents: choices.filter(c => c.decision === 'accept').reduce((sum,c) => sum+c.estimateCents,0) }
  } else if (operation.type === 'plan-task' || operation.type === 'plan-tasks') {
    const taskChanges=operation.type==='plan-task'?[input]:input.tasks
    const utilities=operation.type==='plan-tasks'?(input.utilities??[]):[]
    if(!Array.isArray(taskChanges)||!Array.isArray(utilities)||(!taskChanges.length&&!utilities.length)||new Set(utilities.map(c=>c.id)).size!==utilities.length)reject('Select valid tasks to confirm.')
    for(const change of utilities){
      const action=next.actions.find(a=>a.id===change.id&&a.accepted&&a.usageReduction)
      if(!action||typeof change.done!=='boolean')reject('Choose a valid utility guide task.')
      if(change.done)action.completedAt=action.completedAt||now;else delete action.completedAt
    }
    if(taskChanges.length)completeTasks(next,taskChanges,now)
  } else if (operation.type === 'quick-evidence') {
    const task=planTasks(next,planPeriod(now)).find(t=>t.id===input.taskId)
    const choice=next.quickPlan?.choices.find(c=>c.id===task?.choiceId)
    if(!task?.completedAt||task.step==='return'||!choice||choice.needsReview) reject('Complete this action before linking savings evidence.')
    if(next.ledger.some(l=>l.taskId===task.id||l.evidenceId===input.evidenceId||l.evidenceIds?.includes(input.evidenceId)||(input.refundId&&l.refundId===input.refundId))) reject('This task or receipt already has savings recorded.')
    const result=evidenceAmount(choice,input,data,now)
    if(result.amountCents<=0)reject('These costs do not show a net saving.')
    next.ledger.push({id:operation.requestId,actionId:choice.id,taskId:task.id,type:'quick',choiceSnapshot:structuredClone(choice),evidenceId:input.evidenceId,refundId:input.refundId||null,comparable:true,...result,verifiedAt:now,movedCents:0})
  } else if (operation.type === 'quick-complete') {
    if (!Array.isArray(input.actions) || !input.actions.length || new Set(input.actions.map(a=>a.id)).size!==input.actions.length) reject('Select completed actions.')
    for (const change of input.actions) {
      const action=next.quickPlan?.choices.find(a=>a.id===change.id && a.decision==='accept')
      if (!action || action.needsReview || action.completedAt) reject('This action is not available.')
      if (change.alternative!==undefined) {
        const candidate=quickOpportunities(data,new Date(now)).find(c=>c.id===change.id)
        if (!candidate || !candidate.alternatives?.some(a=>a.key===change.alternative)) reject('This option changed. Refresh your plan.')
        Object.assign(action,selectQuickAlternative(candidate,change.alternative),{decision:'accept'})
      }
      completeTasks(next,planTasks(next,planPeriod(now)).filter(t=>t.choiceId===action.id&&!t.completedAt).map(t=>({id:t.id,done:true})),now)
    }
    next.quickPlan.estimatedCents=next.quickPlan.choices.filter(c=>c.decision==='accept').reduce((sum,c)=>sum+c.estimateCents,0)
  } else if (operation.type === 'quick-alternative') {
    const index = next.quickPlan?.choices.findIndex(c=>c.id===input.id && c.decision==='accept')
    const candidate = quickOpportunities(data, new Date(now)).find(c=>c.id===input.id)
    if (index == null || index < 0 || !candidate || typeof input.alternative !== 'string' || !candidate.alternatives?.some(a=>a.key===input.alternative)) reject('This option is no longer available. Refresh your plan.')
    next.quickPlan.choices[index] = {...selectQuickAlternative(candidate,input.alternative),decision:'accept',completedAt:null}
    next.quickPlan.estimatedCents = next.quickPlan.choices.filter(c=>c.decision==='accept').reduce((sum,c)=>sum+c.estimateCents,0)
    next.quickPlan.savedAt = now
  } else if (operation.type === 'quick-action') {
    const action = next.quickPlan?.choices.find(c=>c.id===input.id && c.decision==='accept')
    if (!action || action.needsReview || typeof input.done !== 'boolean') reject('This action is not available. Review your plan.')
    if (input.done && input.alternative !== undefined) {
      const candidate = quickOpportunities(data, new Date(now)).find(c=>c.id===input.id)
      if (!candidate || typeof input.alternative !== 'string' || !candidate.alternatives?.some(a=>a.key===input.alternative)) reject('This option is no longer available. Refresh your plan.')
      Object.assign(action,selectQuickAlternative(candidate,input.alternative),{decision:'accept'})
      next.quickPlan.estimatedCents = next.quickPlan.choices.filter(c=>c.decision==='accept').reduce((sum,c)=>sum+c.estimateCents,0)
    }
    const pending=planTasks(next,planPeriod(now)).filter(t=>t.choiceId===action.id)
    completeTasks(next,(input.done?pending:pending.reverse()).map(t=>({id:t.id,done:input.done})),now)
  } else if (operation.type === 'capture-review') {
    if (!['receipts', 'bills', 'payments', 'debt'].includes(input.id) || typeof input.checked !== 'boolean') reject('Invalid capture review.')
    next.captureReview = { ...next.captureReview, [input.id]: input.checked }
  } else if (operation.type === 'learning-choice') {
    if(!PLAN_LESSONS.some(l=>l.id===input.id))reject('Choose an available lesson.')
    next.learning={...next.learning,selectedId:input.id}
  } else if (operation.type === 'learning-check') {
    const id=checkPlanLesson(input.id,input.answer)
    next.learning={...next.learning,selectedId:id,completed:{...next.learning?.completed,[id]:next.learning?.completed?.[id]||now}}
  } else if (operation.type === 'wealth-journey') {
    next.wealthJourney=updateWealthJourney(state.wealthJourney,input,now)
  } else if (operation.type === 'cash-choice') {
    next.cashChoice=saveCashChoice(input,state,now,data.depositQuotes)
  } else if (operation.type === 'cd-choice') {
    next.cdChoice=saveCdChoice(input,state,now,data.depositQuotes)
  } else if (operation.type === 'investment-choice') {
    if(input.productId)next.investmentChoice=saveInvestmentChoice(input,state,data,now)
    else {
    const option=WEALTH_OPTIONS.find(o=>o.id===input.optionId&&o.kind==='Investment')
    if(!option)reject('Choose an available investment path.')
    next.investmentChoice={optionId:option.id,title:option.name,guide:option.source,decision:'review',savedAt:now}
    }
  } else if (operation.type === 'cash-comparison') {
    const inputs=Object.fromEntries(['balance','currentApy','alternativeApy','currentFee','alternativeFee'].map(key=>[key,String(input[key]??'')]))
    next.cashComparison={inputs,result:cashComparison(inputs),savedAt:now}
  } else if (operation.type === 'wizard') {
    if (!WIZARD_TARGETS.includes(input.target) || !WIZARD_STEPS.includes(input.step)) reject('Invalid wizard page.')
    if (input.complete && (input.target !== 'learn' || input.answer !== 'after-costs')) reject('Complete the knowledge check first.')
    next.wizard ||= {}
    next.wizard[input.target] = { ...next.wizard[input.target], step: input.step, updatedAt: now, ...(input.complete ? { completedAt: now } : {}) }
  } else if (operation.type === 'purchase-decision') {
    const candidate = purchaseChoices(data, new Date(now)).find(c => c.id === input.id)
    if (!candidate || !['skip', 'reduce', 'keep', 'later'].includes(input.choice)) reject('This purchase choice is no longer available. Refresh your records.')
    next.decisions ||= {}
    next.decisions[candidate.itemKey] = { choice: input.choice, updatedAt: now }
    if (['keep', 'later'].includes(input.choice)) {
      next.actions.filter(a => a.itemKey === candidate.itemKey && a.type === 'purchase').forEach(a => { a.accepted = false })
    } else {
      const units = Number(input.units), fees = String(input.fees ?? '0')
      if (!Number.isInteger(units) || units < 1 || units > candidate.maxUnits || !/^\d{1,7}(\.\d{1,2})?$/.test(fees)) reject('Choose a quantity within your low-rated purchases and valid extra costs.')
      if (conflicts(next.actions.filter(a => a.type !== 'purchase'), candidate, next.ledger)) reject('An existing action or savings history already covers this purchase.')
      const estimateCents = units * candidate.baselineCents - cents(fees)
      if (estimateCents <= 0) reject('Extra costs remove the estimated saving.')
      const existing = next.actions.find(a => a.type === 'purchase' && a.itemKey === candidate.itemKey)
      if (existing && next.ledger.some(l => l.actionId === existing.id)) reject('This action has savings history. Undo it or continue verifying later months without changing its baseline.')
      const action = { ...candidate, units, choice: input.choice, feeCents: cents(fees), estimateCents, accepted: true, acceptedAt: now }
      if (existing) Object.assign(existing, action)
      else next.actions.push(action)
    }
  } else if (operation.type === 'confirm-purchase') {
    const action = next.actions.find(a => a.id === input.id && a.type === 'purchase' && a.accepted)
    const period = String(input.period || ''), fees = String(input.fees ?? '0')
    if (!action || input.completePeriod !== true || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period >= now.slice(0, 7) || period <= action.acceptedAt.slice(0, 7) || !/^\d{1,7}(\.\d{1,2})?$/.test(fees)) reject('Choose a full completed month after choosing this action and confirm complete records including replacement purchases.')
    if (next.ledger.some(l => l.actionId === action.id && l.period === period)) reject('This month is already recorded.')
    if (conflicts(next.actions, action, next.ledger)) reject('Another action or savings history covers these records.')
    const sources = (action.baselineIds || []).map(id => (data.items || []).find(i => i.id === id))
    if (!sources.length || !sources.every(usableItem)) reject('Your original purchases changed. Review the baseline again.')
    if (!(data.items || []).some(i => usableItem(i) && i.receipts.date.startsWith(period))) reject('Capture the later month’s purchases before confirming its completeness.')
    const rows = (data.items || []).filter(i => usableItem(i) && itemKey(i.item_name) === action.itemKey && i.receipts.date.startsWith(period))
    const baseline = Math.min(action.periodBaselineCents, sources.reduce((s, i) => s + cents(i.price), 0))
    const amountCents = Math.min(action.estimateCents, baseline - rows.reduce((s, i) => s + cents(i.price), 0) - cents(fees))
    if (amountCents <= 0) reject('These records do not show savings after replacement and other costs.')
    next.ledger.push({ id: operation.requestId, actionId: action.id, period, amountCents, evidenceIds: rows.map(i => i.id), coverageConfirmed: true, feeCents: cents(fees), movedCents: 0, verifiedAt: now })
  } else if (operation.type === 'accept-spending') {
    const candidate = accountOpportunities(data, new Date(now)).spending.find(c => c.id === input.id)
    if (!candidate || input.completeBaseline !== true) reject('Confirm that the prior month includes all spending in this category.')
    const amount = String(input.amount ?? '')
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(amount) || !(cents(amount) > 0) || cents(amount) > candidate.baselineCents) reject('Choose a reduction within the captured baseline.')
    if (conflicts(next.actions, candidate, next.ledger)) reject('This category already has purchase savings. Use one method to avoid counting the same savings twice.')
    const existing = next.actions.find(a => a.id === input.id)
    if (existing) existing.accepted = true
    else next.actions.push({ ...candidate, estimateCents: cents(amount), accepted: true, acceptedAt: now, sourceDate: now.slice(0, 10) })
  } else if (operation.type === 'accept-shopping') {
    const candidate = accountOpportunities(data, new Date(now)).shopping.find(c => c.id === input.id)
    if (!candidate || input.comparable !== true) reject('Confirm the same product, size and package before choosing a comparison.')
    const quantity = Number(input.quantity)
    const fees = String(input.fees ?? '0')
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(fees)) reject('Enter valid monthly travel, shipping and other costs.')
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) reject('Enter the quantity you expect to buy each month (1–1000).')
    if (conflicts(next.actions, candidate, next.ledger)) reject('An existing action or savings history covers this purchase.')
    const estimateCents = candidate.differenceCents * quantity - cents(fees)
    if (estimateCents <= 0) reject('Extra costs remove the estimated saving.')
    const existing = next.actions.find(a => a.id === input.id)
    if (existing) {
      if (next.ledger.some(l => l.actionId === existing.id)) reject('This action has savings history. Its estimate and baseline are preserved.')
      Object.assign(existing, { quantity, feeCents: cents(fees), estimateCents, accepted: true })
    }
    else {
      if (next.actions.some(a => a.type === 'shopping' && a.itemKey === candidate.itemKey)) reject('This product already has an action.')
      next.actions.push({ ...candidate, quantity, feeCents: cents(fees), estimateCents, accepted: true, acceptedAt: now, sourceDate: now.slice(0, 10) })
    }
  } else if (operation.type === 'resume') {
    const action = next.actions.find(a => a.id === input.id)
    if (!action) reject('This action is no longer available.')
    if (conflicts(next.actions, action, next.ledger)) reject('Another action or savings history covers these records.')
    action.accepted = true
  } else if (operation.type === 'confirm-spending') {
    const action = next.actions.find(a => a.id === input.id && a.type === 'spending' && a.accepted)
    if (!action || input.completePeriod !== true) reject('Confirm that all category spending for the closed month has been captured.')
    const period = String(input.period || ''), currentMonth = now.slice(0, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period >= currentMonth || period <= action.previousMonth || period < action.acceptedAt.slice(0, 7)) reject('Choose a completed month after the baseline and no earlier than your action.')
    if (next.ledger.some(l => l.actionId === action.id && l.period === period)) reject('This month is already recorded.')
    const rows = (data.receipts || []).filter(r => usableReceipt(r) && r.date.startsWith(period) && r.category === action.category)
    if (!rows.length) reject('Capture this month’s records before confirming savings.')
    const actual = rows.reduce((sum, r) => sum + cents(r.total_amount), 0)
    const amountCents = Math.min(action.estimateCents, action.baselineCents - actual)
    if (!(amountCents > 0)) reject('These records do not show a reduction from your baseline.')
    next.ledger.push({ id: operation.requestId, actionId: action.id, period, amountCents, evidenceIds: rows.map(r => r.id), coverageConfirmed: true, movedCents: 0, verifiedAt: now })
  } else if (operation.type === 'confirm-shopping') {
    const action = next.actions.find(a => a.id === input.id && a.type === 'shopping' && a.accepted)
    const item = (data.items || []).find(i => i.id === input.evidenceId)
    const key = String(item?.item_name || '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (!action || !comparableItem(item) || !comparableItem((data.items || []).find(i => i.id === action.sourceId)) || key !== action.itemKey || item.receipts.date <= action.sourceDate || item.receipts.date > now.slice(0, 10) || input.comparable !== true) reject('Choose a later receipt for the same product, size and package.')
    const fees = String(input.fees ?? '0')
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(fees)) reject('Enter fees with up to two decimal places.')
    if (next.ledger.some(l => l.evidenceId === item.id)) reject('This purchase is already recorded.')
    const quantity = Number(item.qty)
    const amountCents = Math.round(action.baselineCents * quantity) - cents(item.price) - cents(fees)
    if (!(quantity > 0) || !(amountCents > 0)) reject('This purchase does not show savings after additional costs.')
    next.ledger.push({ id: operation.requestId, actionId: action.id, evidenceId: item.id, period: item.receipts.date.slice(0, 7), amountCents, feeCents: cents(fees), movedCents: 0, verifiedAt: now })
  } else if (operation.type === 'accept-bill') {
    const savedAction = next.actions.find(a => a.id === input.id)
    if (savedAction) {
      if (conflicts(next.actions, savedAction)) reject('Another chosen action covers this service.')
      savedAction.accepted = true
      // Shared legacy tools cannot layer another estimate over the same quick-plan expense.
  if(['accept-shopping','accept-spending','purchase-decision'].includes(operation.type)) {
    for(const action of next.actions.filter(a=>a.accepted)) {
      if((next.quickPlan?.choices||[]).some(c=>c.decision==='accept'&&!c.needsReview&&((action.itemKey&&action.itemKey===c.itemKey)||(action.type==='spending'&&action.category===c.category)))) reject('This expense is already in your plan. Edit that choice first.')
    }
  }
  next.version += 1; next.requests.push({ id: operation.requestId, receipt }); return next
    }
    const bill = bills.find(b => b.id === input.id)
    const baseline = bills.filter(b => b.bill_series_id === bill?.bill_series_id && b.due_date < bill?.due_date && b.statement_amount != null && !['needs_review', 'canceled', 'skipped'].includes(b.status)).sort((a, b) => b.due_date.localeCompare(a.due_date))[0]
    if (!bill || !baseline || !Number.isFinite(Number(baseline.statement_amount)) || Number(baseline.statement_amount)<0 || bill.due_date > now.slice(0, 10) || bill.statement_amount == null || !Number.isFinite(Number(bill.statement_amount)) || Number(bill.statement_amount) < 0 || bill.bill_series?.cadence !== 'monthly' || ['needs_review', 'canceled', 'skipped'].includes(bill.status)) reject('This action needs comparable monthly bill statements.')
    const fees = String(input.fees ?? '0')
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(fees)) reject('Enter valid monthly fees.')
    const switching=String(input.switching??'0')
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(switching)) reject('Enter valid one-time switching costs.')
    const estimateCents = cents(bill.statement_amount) - cents(baseline.statement_amount) - cents(fees)
    if (!(estimateCents > 0)) reject('These statements do not show an increase to review.')
    const existing = next.actions.find(a => a.id === bill.id)
    if (existing) {
      if (!next.ledger.some(l=>l.actionId===existing.id)) Object.assign(existing,{feeCents:cents(fees),switchingCents:cents(switching),estimateCents})
      existing.accepted = true
    }
    else {
      if (next.actions.some(a => a.seriesId === bill.bill_series_id)) reject('This service already has an action. Continue that action rather than counting it twice.')
      next.actions.push({ id: bill.id, seriesId: bill.bill_series_id, title: bill.bill_series?.name || 'Bill', baselineCents: cents(bill.statement_amount), feeCents: cents(fees), switchingCents:cents(switching), estimateCents, sourceDate: bill.due_date, accepted: true, acceptedAt: now })
    }
  } else if (operation.type === 'undo') {
    const action = next.actions.find(a => a.id === input.id)
    if (!action) reject('This action is no longer available.')
    action.accepted = false
  } else if (operation.type === 'confirm-bill') {
    const action = next.actions.find(a => a.id === input.id && a.accepted)
    const evidence = bills.find(b => b.id === input.evidenceId)
    if(evidence && (!Number.isFinite(Number(evidence.statement_amount)) || Number(evidence.statement_amount)<0)) reject('Use a valid nonnegative statement amount.')
    const feeText = String(input.fees ?? '0')
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(feeText)) reject('Enter fees with up to two decimal places.')
    if (!action || !evidence || evidence.bill_series_id !== action.seriesId || evidence.bill_series?.cadence !== 'monthly' || evidence.statement_amount == null || evidence.due_date <= action.sourceDate || evidence.due_date > now.slice(0, 10) || ['needs_review', 'canceled', 'skipped'].includes(evidence.status)) reject('Choose a later monthly statement for the same service.')
    if (input.comparable !== true) reject('Confirm the same service and billing period length.')
    const period = evidence.due_date.slice(0, 7)
    if (next.ledger.some(l => l.evidenceId === evidence.id || (l.actionId === action.id && l.period === period))) reject('Savings for this statement or month are already recorded.')
    const amountCents = action.baselineCents - cents(evidence.statement_amount) - cents(feeText)
    // Keep losses as well as savings: later months must recover switching costs.
    next.ledger.push({ id: operation.requestId, actionId: action.id, evidenceId: evidence.id, period, amountCents, feeCents: cents(feeText), movedCents: 0, verifiedAt: now })
  } else if (operation.type === 'moved') {
    const entry = next.ledger.find(l => l.id === input.id), amount = String(input.amount ?? '')
    if (!entry || !/^\d{1,7}(\.\d{1,2})?$/.test(amount) || cents(amount) > entry.amountCents) reject('Enter an amount no greater than this confirmed saving.')
    entry.movedCents = cents(amount)
  } else reject('Unknown progress action.')
  // Shared legacy tools cannot layer another estimate over the same quick-plan expense.
  if(['accept-shopping','accept-spending','purchase-decision'].includes(operation.type)) {
    for(const action of next.actions.filter(a=>a.accepted)) {
      if((next.quickPlan?.choices||[]).some(c=>c.decision==='accept'&&!c.needsReview&&((action.itemKey&&action.itemKey===c.itemKey)||(action.type==='spending'&&action.category===c.category)))) reject('This expense is already in your plan. Edit that choice first.')
    }
  }
  next.version += 1
  next.requests.push({ id: operation.requestId, receipt })
  return next
}

