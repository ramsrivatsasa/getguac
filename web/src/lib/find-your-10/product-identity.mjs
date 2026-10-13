export function recordedModel(group) {
 const latest=[...(group.rows||[])].sort((a,b)=>String(b.receipts?.date||'').localeCompare(String(a.receipts?.date||'')))[0]
 return String(latest?.model||'').trim()
}
export function productSearchQuery(group) {
 const model=recordedModel(group)
 return model&&!containsModel(group.title,model)?`${group.title} ${model}`:group.title
}
export function containsModel(text,model) {
 if(!model)return false
 const parts=model.split(/[\s-]+/).map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
 return new RegExp(`(?<![a-z0-9])${parts.join('[\\s-]*')}(?![a-z0-9-])`,'i').test(String(text||''))
}
