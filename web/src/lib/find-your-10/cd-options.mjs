import {observedDeposit} from './deposit-quotes.mjs'
import {cashComparison} from './cash-comparison.mjs'
import {allowedSuggestions} from './suggestion-feedback.mjs'
export const CD_SUBJECT='cash-cds'
// Public standard offers, verified on the bank's dated rate table. No rankings.
export const CD_OPTIONS=[
  {id:'marcus-cd-6',title:'Marcus · 6-month CD',termMonths:6,apy:'3.95'},
  {id:'marcus-cd-9',title:'Marcus · 9-month CD',termMonths:9,apy:'4.30'},
  {id:'marcus-cd-12',title:'Marcus · 12-month CD',termMonths:12,apy:'3.90'},
  {id:'marcus-cd-18',title:'Marcus · 18-month CD',termMonths:18,apy:'4.35'},
].map(o=>({...o,minimumCents:50000,checkedAt:'2026-09-29',bank:'Goldman Sachs Bank USA',url:'https://www.marcus.com/us/en/savings/high-yield-cds',guide:'https://www.marcus.com/us/en/savings/cd-info-guide',penalty:'Early withdrawal costs 90 days of interest on the original principal at the CD interest rate; it can reduce principal.',funding:'Additional deposits are allowed only during the first 30 days after opening.',renewal:'Choose a maturity instruction. Otherwise the CD normally renews; a 10-day grace period applies.',insurance:'Goldman Sachs Bank USA · Member FDIC. Coverage combines deposits at the same bank within an ownership category.'}))
CD_OPTIONS.find(o=>o.id==='marcus-cd-18').penalty='Early withdrawal costs 180 days of interest on the original principal at the CD interest rate; it can reduce principal.'
CD_OPTIONS.push(...[[6,'3.90'],[12,'4.35'],[18,'4.00'],[24,'4.30']].map(([termMonths,apy])=>({id:`bask-cd-${termMonths}`,title:`Bask · ${termMonths}-month CD`,termMonths,apy,minimumCents:100000,checkedAt:'2026-09-29',bank:'Texas Capital Bank',url:'https://baskbank.com/products/certificates-of-deposit',guide:'https://baskbank.com/products/certificates-of-deposit',penalty:`Early principal withdrawal costs ${termMonths<=12?90:180} days of interest on the amount withdrawn and can reduce principal.`,funding:'Fund at least $1,000 within 10 business days or the account closes. Confirm whether additional funding is permitted before depositing.',renewal:'Renews if not redeemed. Review maturity instructions and the 10-calendar-day grace period.',insurance:'Bask Bank is a division of Texas Capital Bank · Member FDIC. Deposits at both brands share coverage limits.'})))
export function cdOptions(progress,now=new Date(),quotes={}) {
  return allowedSuggestions(progress,'cash',CD_SUBJECT,CD_OPTIONS).map(o=>observedDeposit(o,quotes)).map(o=>({...o,fresh:now>=new Date(o.checkedAt)&&now-new Date(o.checkedAt)<=7*86400000}))
}
export function cdIllustration(option,balance){
  const {balanceCents}=cashComparison({balance,currentApy:'0',currentFee:'0',alternativeApy:option.apy,alternativeFee:'0'})
  const interestCents=Math.round(balanceCents*(Math.pow(1+Number(option.apy)/100,option.termMonths/12)-1))
  return {balanceCents,interestCents,maturityCents:balanceCents+interestCents,termMonths:option.termMonths}
}
export function saveCdChoice(input,progress,now,quotes={}){
  if(input.optionId==='keep')return {optionId:'keep',decision:'keep',savedAt:now}
  const option=cdOptions(progress,new Date(now),quotes).find(o=>o.id===input.optionId&&o.fresh)
  if(!option)throw Error('Review current CD terms before saving this option.')
  const result=cdIllustration(option,String(input.balance??''))
  if(result.balanceCents<option.minimumCents)throw Error(`This CD needs at least $${option.minimumCents/100}. Save toward its minimum or choose savings for now.`)
  if(input.accessConfirmed!==true)throw Error('Confirm this amount can remain deposited for the CD term.')
  return {optionId:option.id,decision:'review',inputs:{balance:String(input.balance),accessConfirmed:true},option:{...option},result,savedAt:now}
}
