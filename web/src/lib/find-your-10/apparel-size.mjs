const apparel=/\b(shirts?|t-shirts?|tees?|knits?|hoodies?|sweaters?|jackets?|pants|jeans|shorts|dresses|shoes?|sneakers?|footwear|downshifter|revolution|jacquard|clothing|apparel|socks?|polos?|blouses?|leggings?|bras?|underwear|swimwear|swimsuits?|boots?|sandals?|slippers?|skirts?|suits?|coats?|tank tops?)\b/i
const apparelCategory=/\b(clothing|clothes|apparel|fashion|footwear|shoes)\b/i
export function apparelSize(title='') {
 const text=String(title)
 const aliases={'extra small':'XS',small:'S',medium:'M',large:'L','extra large':'XL','2xl':'XXL','3xl':'XXXL'}
 const matches=[...text.matchAll(/\b(extra small|extra large|small|medium|large|XXXL|XXL|XL|XS|2XL|3XL)\b/ig),...text.matchAll(/(?<![a-zA-Z'’])\b(S|M|L)\b/g),...text.matchAll(/\bsize\s*[:=-]?\s*([sml])\b/ig)].map(m=>{const value=m[1];return aliases[value.toLowerCase()]||value.toUpperCase()})
 const numeric=[...text.matchAll(/\bsize\s*[:=-]?\s*(\d+(?:\.\d+)?)(?:\s*(US|UK|EU))?\b/ig)].map(m=>(m[2]?.toUpperCase()||'unspecified')+':'+m[1])
 const leading=[...text.matchAll(/\b(US|UK|EU)\s*(?:size\s*)?(\d+(?:\.\d+)?)\b/ig)].map(m=>m[1].toUpperCase()+':'+m[2])
 const sizes=[...new Set([...matches,...numeric,...leading])]
 return sizes.length===1?sizes[0]:null
}
export function sameApparelSize(purchase,offer,category='') {
 if(!apparel.test(purchase)&&!apparelCategory.test(category))return true
 const original=apparelSize(purchase),candidate=apparelSize(offer)
 return Boolean(original&&candidate&&original===candidate)
}
