import {expenseComparison} from './expense-comparison.mjs'

export const INVESTMENT_CATEGORIES=[['mutual','Mutual funds'],['etf','ETFs'],['stocks','Stocks'],['bonds','Bonds']]
export const INVESTMENT_GUIDES={
 mutual:'https://www.nerdwallet.com/investing/learn/how-to-invest-in-mutual-funds',
 etf:'https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-2',
 stocks:'https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks',
 bonds:'https://www.investor.gov/introduction-investing/investing-basics/investment-products/bonds-or-fixed-income-products/bonds',
}
const checkedAt='2026-09-29'
const equityRisk='Stock-market losses; diversification does not prevent losses.'
const brokerNotes='Eligible U.S.-listed securities only. Other service, regulatory or product charges may apply. Fractional shares may need to be sold rather than transferred to another broker.'
export const INVESTMENT_OPTIONS=[
 {id:'fidelity-fzrox',category:'mutual',provider:'Fidelity',title:'ZERO Total Market Index',ticker:'FZROX',approach:'Index · U.S. stocks',minimumCents:0,expenseRatio:0,fee:'0.00% / year',risk:equityRisk,account:'Fidelity retail brokerage account',accountMinimum:'$0 to open a retail brokerage account',additional:'No fund investment minimum; recurring order rules depend on the account.',charges:'No fund expense ratio. Review the brokerage fee schedule for other services.',notes:'Tracks a broad U.S. stock index. ZERO funds are available through Fidelity; review transfer restrictions before choosing an account.',url:'https://www.fidelity.com/mutual-funds/investing-ideas/index-funds'},
 {id:'schwab-swtsx',category:'mutual',provider:'Charles Schwab',title:'Total Stock Market Index',ticker:'SWTSX',approach:'Index · U.S. stocks',minimumCents:0,expenseRatio:0.03,fee:'0.03% / year',risk:equityRisk,account:'Brokerage account offering SWTSX',accountMinimum:'Separate broker account rules apply',additional:'No initial fund minimum; check recurring-order requirements with your broker.',charges:'Fund expense ratio is separate from any broker transaction or account fees.',notes:'Tracks the Dow Jones U.S. Total Stock Market Index. Broker availability and transaction charges may differ.',url:'https://www.schwabassetmanagement.com/products/swtsx'},
 {id:'vanguard-vtsax',category:'mutual',provider:'Vanguard',title:'Total Stock Market Index Admiral',ticker:'VTSAX',approach:'Index · U.S. stocks',minimumCents:300000,expenseRatio:0.04,fee:'0.04% / year',risk:equityRisk,account:'Account offering Admiral shares',accountMinimum:'Fund minimum is not an account-opening fee',additional:'Check subsequent and automatic purchase minimums with the provider.',charges:'Fund expense ratio is separate from account and transaction charges.',notes:'Broad U.S. stock exposure. The $3,000 initial minimum applies to this share class; other share classes have different terms.',url:'https://investor.vanguard.com/investment-products/mutual-funds/profile/vtsax',sources:['https://investor.vanguard.com/investment-products/list/all','https://advisors.vanguard.com/investments/products/vtsax/vanguard-total-stock-market-index-fund-admiral-shares']},
 {id:'fidelity-fcntx',category:'mutual',provider:'Fidelity',title:'Contrafund',ticker:'FCNTX',approach:'Active · stock selection',minimumCents:0,expenseRatio:0.74,fee:'0.74% / year',risk:'Stock-market losses and manager-selection risk.',account:'Brokerage account offering FCNTX',accountMinimum:'Separate broker account rules apply',additional:'No fund purchase minimum; broker order rules may differ.',charges:'Prospectus lists no shareholder fees; intermediary fees may still apply. The management fee can vary with relative performance.',notes:'Actively managed capital-appreciation strategy. Higher fees do not establish better future returns.',url:'https://fundresearch.fidelity.com/mutual-funds/summary/316071109',sources:['https://www.sec.gov/Archives/edgar/data/24238/000002423826000030/filing10989.htm']},
 ...['etf','stocks'].flatMap(category=>[
  {id:`fidelity-${category}`,category,provider:'Fidelity',title:category==='etf'?'Fractional ETF access':'Fractional stock access',approach:'Brokerage access',minimumCents:100,fee:'$0 online commission',risk:category==='etf'?'Holdings determine risk; fund prices can fall.':'Individual-company losses; dividends are not guaranteed.',account:'Eligible Fidelity brokerage account',accountMinimum:'$0 to open a retail brokerage account',additional:'Eligible dollar-based orders start at $1.',charges:category==='etf'?'ETF expense ratios and bid-ask spreads still apply; this is a trading commission, not a fund fee.':'Bid-ask spreads and other applicable charges are separate.',notes:brokerNotes,url:'https://www.fidelity.com/trading/fractional-shares'},
  {id:`schwab-${category}`,category,provider:'Charles Schwab',title:category==='etf'?'Fractional ETF access':'Fractional stock access',approach:'Brokerage access',minimumCents:100,fee:'$0 online commission',risk:category==='etf'?'Holdings determine risk; fund prices can fall.':'Individual-company losses; dividends are not guaranteed.',account:'Eligible Schwab brokerage account',accountMinimum:'Separate account rules apply',additional:'Most eligible U.S.-listed stocks and ETFs start at $1.',charges:category==='etf'?'ETF expense ratios and bid-ask spreads are separate from the online commission.':'Bid-ask spreads and other applicable charges are separate.',notes:brokerNotes,url:'https://www.schwab.com/fractional-shares-stock-slices'},
 ]),
 {id:'treasury-marketable',category:'bonds',provider:'TreasuryDirect',title:'Treasury bills, notes & bonds',approach:'U.S. Treasury auctions',minimumCents:10000,fee:'Auction price varies',risk:'Selling before maturity can produce a loss.',account:'TreasuryDirect',accountMinimum:'$100 minimum bid, in $100 increments',additional:'Additional bids use $100 increments.',charges:'The bid is a face-value amount. Actual settlement cost depends on the security and auction; this milestone is not a purchase quote.',notes:'Choose a maturity that matches your access needs. TreasuryDirect does not sell securities for you; early sale requires transfer to a broker and applicable holding rules.',url:'https://www.treasurydirect.gov/marketable-securities/buying-a-marketable-security/'},
 {id:'treasury-i-bonds',category:'bonds',provider:'TreasuryDirect',title:'Series I savings bonds',approach:'Inflation-linked savings bond',minimumCents:2500,fee:'Early-redemption penalty',risk:'No redemption for 12 months; inflation rate changes.',account:'TreasuryDirect',accountMinimum:'$25 minimum electronic purchase',additional:'Amounts above $25 may be entered to the penny.',charges:'Redeeming before five years forfeits the last three months of interest.',notes:'Annual purchase limits apply. Not a bank deposit or a tradable bond fund. Keep money needed during the first year accessible elsewhere.',url:'https://www.treasurydirect.gov/savings-bonds/i-bonds/'},
].map(o=>({...o,checkedAt,guide:INVESTMENT_GUIDES[o.category]}))

export function investmentFresh(option,now=new Date()){
 const age=(new Date(now)-new Date(`${option.checkedAt}T00:00:00Z`))/86400000
 return Number.isFinite(age)&&age>=0&&age<31
}
function cents(value){
 if(value===''||value==null||!/^\d+(\.\d{1,2})?$/.test(String(value))||Number(value)>100000000)throw Error('Enter a valid available amount, with up to two decimal places.')
 return Math.round(Number(value)*100)
}
export function investmentMilestone(option,available,monthlyCents){
 const startingCents=cents(available)
 if(!Number.isSafeInteger(monthlyCents)||monthlyCents<0)throw Error('Monthly savings must be a non-negative amount.')
 const gapCents=Math.max(0,option.minimumCents-startingCents)
 return {startingCents,monthlyCents,minimumCents:option.minimumCents,gapCents,months:gapCents===0?0:monthlyCents>0?Math.ceil(gapCents/monthlyCents):null}
}
export function saveInvestmentChoice(input,state,data,now){
 const option=INVESTMENT_OPTIONS.find(o=>o.id===input.productId)
 if(!option||!investmentFresh(option,now))throw Error('Choose an option with current verified terms.')
 if(input.cashConfirmed!==true)throw Error('Confirm the available amount after bills and your cash reserve.')
 const monthly=expenseComparison({...data,progress:state},now).monthlyCents
 const milestone=investmentMilestone(option,input.available,monthly)
 return {optionId:option.category,productId:option.id,title:option.title,guide:option.guide,decision:'review',savedAt:now,option:{...option},milestone,cashConfirmed:true}
}
