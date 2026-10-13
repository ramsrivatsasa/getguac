// Shared visual proportions for SVG, CSS and Recharts rings. Denominators
// remain owned by each feature (spending total, goal amount, or score).
export const DONUT = Object.freeze({innerRatio:0.7, track:'#e5ddf5', primary:'#7c3aed'})
export function donutCategoryColor(category) {
  const key=String(category||'').toLowerCase()
  if(/dining|eats|restaurant|coffee|tea|bars|drinks/.test(key))return '#2563eb'
  if(/grub|grocer|food|produce|snack/.test(key))return '#f59e0b'
  if(/bill|sub|bank|cloud/.test(key))return '#0891b2'
  if(/health|pharmacy|care/.test(key))return '#db2777'
  if(/gas|travel|transport/.test(key))return '#ea580c'
  return '#7c3aed'
}
export const donutPieProps = outerRadius => ({innerRadius:outerRadius*DONUT.innerRatio,outerRadius,paddingAngle:0,strokeWidth:0,startAngle:90,endAngle:-270,isAnimationActive:false})
export function donutGeometry(size) {
  const outer = size*0.46, inner = outer*DONUT.innerRatio
  return {radius:(outer+inner)/2,stroke:outer-inner,center:size/2}
}
