const amount = (value,label,max=100000000) => {
  if(!/^\d{1,9}(\.\d{1,2})?$/.test(String(value))||Number(value)>max)throw Error(`Enter a valid ${label}.`)
  return Math.round(Number(value)*100)
}
export function cashComparison(input) {
  const balanceCents=amount(input.balance,'balance'),currentApy=amount(input.currentApy,'current APY',100),alternativeApy=amount(input.alternativeApy,'alternative APY',100)
  const currentFeeCents=amount(input.currentFee,'monthly fee'),alternativeFeeCents=amount(input.alternativeFee,'alternative monthly fee')
  const currentNetCents=Math.round(balanceCents*currentApy/10000)-currentFeeCents*12
  const alternativeNetCents=Math.round(balanceCents*alternativeApy/10000)-alternativeFeeCents*12
  return {balanceCents,currentApy,alternativeApy,currentFeeCents,alternativeFeeCents,currentNetCents,alternativeNetCents,differenceCents:alternativeNetCents-currentNetCents}
}
