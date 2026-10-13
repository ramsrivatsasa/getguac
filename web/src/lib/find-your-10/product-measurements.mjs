// Compare recorded quantities without treating the digits in 1/2 as one gallon.
// Conversions are intentionally absent: a different pack/size needs a separate comparison.
export function productMeasurements(title='') {
  const aliases={gallons:'gal',gallon:'gal',gal:'gal',ounces:'oz',ounce:'oz',oz:'oz',pounds:'lb',pound:'lb',lbs:'lb',lb:'lb',liters:'l',liter:'l',litres:'l',litre:'l',l:'l',milliliters:'ml',milliliter:'ml',ml:'ml',kilograms:'kg',kilogram:'kg',kg:'kg',grams:'g',gram:'g',g:'g',quarts:'qt',quart:'qt',qt:'qt',feet:'ft',foot:'ft',ft:'ft',inches:'in',inch:'in',in:'in',rolls:'roll',roll:'roll'}
  const text=String(title).toLowerCase().replace(/½/g,'1/2').replace(/¼/g,'1/4').replace(/¾/g,'3/4').replace(/\bhalf[- ]/g,'1/2 ').replace(/\bfl(?:uid)?\s*(?:ounces?|oz)\b/g,'oz')
  const result={}
  for(const match of text.matchAll(/(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)\s*-?\s*(gallons?|gal|ounces?|oz|pounds?|lbs?|liters?|litres?|l|milliliters?|ml|kilograms?|kg|grams?|g|quarts?|qt|feet|foot|ft|inches|inch|in|rolls?)\b/g)) {
    const parts=match[1].split('/').map(Number),value=parts.length===2?parts[0]/parts[1]:parts[0],unit=aliases[match[2]]
    if(!Number.isFinite(value)||value<=0)continue
    result[unit] ||= [];result[unit].push(value)
  }
  return result
}
export function sameMeasurements(purchase,offer) {
  const required=productMeasurements(purchase),actual=productMeasurements(offer)
  return Object.entries(required).every(([unit,values])=>values.every(value=>actual[unit]?.includes(value)))
}
