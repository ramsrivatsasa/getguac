// Charges and unidentified prescription entries are not replenishable products.
export function eligibleRestockItem(item) {
  const name=String(typeof item==='string'?item:item?.item_name||'').trim().toLowerCase().replace(/[._-]+/g,' ').replace(/\s+/g,' ')
  if(!name)return false
  if(/^(?:tip|tips|gratuity|gratuities|tax|taxes|sales tax|service charge|service fee|delivery fee|shipping|shipping fee|handling|handling fee|fee|fees|discount|coupon|subtotal|sub total|total|receipt total|balance due|amount paid|payment|refund)(?:\s*[:$\d%().+-].*)?$/.test(name))return false
  if(/^(?:pharm(?:acy)?\s*rx|rx|prescription|prescription charge|pharmacy charge)$/.test(name))return false
  return true
}

export const visibleShoppingItem=item=>!item.predicted||item.approved||eligibleRestockItem(item)
