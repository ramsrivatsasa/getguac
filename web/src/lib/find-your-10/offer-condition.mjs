export function offerCondition(offer={}) {
 const text=[offer.condition,offer.second_hand_condition,offer.title,offer.choice,offer.notes].filter(Boolean).join(' ')
 if(/\b(pre[ -]?owned|used|refurbished|renewed|open[ -]?box|second[ -]?hand|parts only)\b/i.test(text))return 'pre-owned'
 if(/(?:UsedCondition|RefurbishedCondition|DamagedCondition)$/i.test(String(offer.condition||'')))return 'pre-owned'
 if(/^(new|brand new|new with tags|new in box)$/i.test(String(offer.condition||'').trim())||/\/NewCondition$/i.test(String(offer.condition||'')))return 'new'
 return 'unknown'
}
export function comparableCondition(offer={}) {
 const condition=offerCondition(offer)
 if(condition==='pre-owned')return false
 const seller=[offer.store,offer.url,offer.sourceUrl].filter(Boolean).join(' ')
 return condition==='new'||!/ebay|resell|poshmark|mercari|depop|thredup|restsell/i.test(seller)
}
