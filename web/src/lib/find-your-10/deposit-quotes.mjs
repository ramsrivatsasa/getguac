// Only server-fetched, same-source rates may overlay the curated product terms.
export function observedDeposit(option,quotes={}) {
 const q=quotes[option.id]
 if(!q||q.url!==option.url||!/^\d{1,2}(\.\d{1,2})?$/.test(String(q.apy))||Number(q.apy)>25||!Number.isFinite(Date.parse(q.checkedAt)))return option
 return {...option,apy:String(q.apy),termsCheckedAt:option.checkedAt,checkedAt:q.checkedAt,rateDate:`observed ${q.checkedAt.slice(0,10)}`}
}
