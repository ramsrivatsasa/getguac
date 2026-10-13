// Fresh produce belongs to a basket/trip decision, not separate retailer tasks.
// Keep the purchases in receipt history; do not invent a basket saving from
// incomplete price coverage or compare different varieties/weights as equal.
export function isBasketProduce(group) {
 const context=[group.title,...(group.rows||[]).map(r=>r.category||'')].join(' ')
 if(/\b(?:seeds?|seedlings?|plant|tree|potting|soil|fertilizer)\b/i.test(group.title))return false
 return /\b(?:produce|tomato(?:es)?|apples?|limes?|lemons?|avocados?|avacado(?:s)?|bananas?|onions?|broccoli|cauliflower|celery|carrots?|peppers?|lettuce|cabbage|spinach|cucumbers?|mushrooms?|cilantro|guavas?|grapes?|oranges?|berries|chard)\b/i.test(context)
}
