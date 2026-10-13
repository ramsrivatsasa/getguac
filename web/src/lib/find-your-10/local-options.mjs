// Menu observations, not model-generated prices. Hide stale observations.
export function localCoffeeOptions(postalCode, baselineCents, now=new Date()) {
  if (postalCode!=='20171' || now < new Date('2026-09-28') || now > new Date('2026-10-05')) return []
  const common={editableHomeCost:false,needsPrice:false,sourceUrl:'https://weirdbrotherscoffee.order.tryperdiem.com/order',checkedAt:'2026-09-28',location:'Worldgate · 13035A Worldgate Dr, Herndon',basis:'one drink replaced',math:'Recorded purchase minus published pickup menu price, before taxes and extras.',tradeoff:'Regular hot drink with whole milk, no extras. Ounces were not listed. Café au lait uses brewed coffee instead of espresso. Compare your preferred serving; taxes, extras and travel reduce the difference.'}
  return [
    {...common,key:'menu:weird-au-lait',choice:'Weird Bros · café au lait',alternativeCents:499,estimateCents:Math.max(0,baselineCents-499)},
    {...common,key:'menu:weird-latte',choice:'Weird Bros · latte',alternativeCents:575,estimateCents:Math.max(0,baselineCents-575)},
    {key:'menu:vingt-latte',choice:'Le Vingt Trois · latte',quotedPriceCents:315,alternativeCents:null,estimateCents:0,needsPrice:true,sourceUrl:'https://levingttroiscafebakery.toast.site/order/le-vingt-trois-cafe-bakery-311-sunset-park-dr/item-latte_1ce13109-7707-4579-9b5e-6e425f81a2b3',checkedAt:'2026-09-28',location:'311 Sunset Park Dr, Herndon',basis:'menu starting price',tradeoff:'Menu starts at $3.15; cup size and to-go extras require confirmation. No savings counted until the final matching price is known.'},
  ]
}
export const DINNER_RECIPES=[
  {title:'Chicken Parmesan Pasta',detail:'30 min · 4 servings',publisher:'Well Plated',url:'https://www.wellplated.com/chicken-parmesan-pasta/'},
  {title:'Skillet Pasta Dinner',detail:'6 servings · turkey & vegetables',publisher:'Kansas State University / USDA',url:'https://www.lyon.k-state.edu/health-nutrition/whatscooking/skillet-pasta-dinner.pdf'},
]

// Published US prices checked 2026-09-28; comparable purpose, not identical quality.
export function comparableProductOption(title, baselineCents, now = new Date()) {
  if (now < new Date('2026-09-28') || now > new Date('2026-10-05')) return null
  const offers = [
    [/^Nike Revolution 7 running shoes$/i,'nike-revolution-8','Nike Revolution 8',4697,'https://www.nike.com/t/revolution-8-mens-road-running-shoes-U0b8oy8S/HJ9198-011','Alternative model to Revolution 7 · men’s HJ9198-011 · sale price · confirm size/fit and stock; tax and delivery extra'],
    [/\b(?:regular|cotton) t-shirt\b/i,'target-tee','Goodfellow crewneck T-shirt',500,'https://www.target.com/p/-/A-94905473','Cream · men’s L · cotton/poly blend'],
    [/wireless headphones/i,'sony-ch520','Sony WH-CH520',6999,'https://electronics.sony.com/audio/headphones/headband/p/whch520-b','Black · on-ear wireless · microphone'],
    [/^phone stand$/i,'ikea-stand','IKEA BERGENES stand',499,'https://www.ikea.com/us/en/p/bergenes-holder-for-mobile-phone-tablet-bamboo-10457999/','Bamboo holder · fixed slots'],
    [/^ground coffee 12 oz$/i,'target-coffee','Good & Gather coffee · 12 oz',899,'https://www.target.com/c/coffee-beverages-grocery/good-gather/-/N-4yi5pZyfqzk','Donut Shop blend · medium roast'],
  ]
  const offer=offers.find(([pattern])=>pattern.test(title))
  if (!offer || offer[3]>=baselineCents) return null
  const [,id,choice,alternativeCents,sourceUrl,difference]=offer
  return {key:`product:${id}`,choice,alternativeCents,estimateCents:baselineCents-alternativeCents,needsPrice:false,editableHomeCost:false,sourceUrl,sourceLabel:'Product',checkedAt:'2026-09-28',expiresAt:'2026-10-05T00:00:00Z',difference,basis:'one future purchase replaced',math:'Recorded unit price minus published alternative price, before tax and delivery.',tradeoff:`${difference}. A comparable use, not an identical product or quality guarantee. Applies to a planned future purchase; replacing an owned item saves only if a refund covers the replacement and fees. Size, availability, tax and delivery can change the difference.`}
}
