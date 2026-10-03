import { Compass, PieChart, ShieldCheck, ShoppingCart, Receipt, CreditCard, TrendingUp, Landmark, FileText, Home, BookOpen, Brain, BarChart3, Umbrella } from 'lucide-react'

// Track icon names in lib/academy.js resolve here, so the data file stays free
// of component imports.
const ICONS = { Compass, PieChart, ShieldCheck, ShoppingCart, Receipt, CreditCard, TrendingUp, Landmark, FileText, Home, Brain, BarChart3, Umbrella }

export function TrackIcon({ name, size = 16 }) {
  const Icon = ICONS[name] || BookOpen
  return <Icon size={size} aria-hidden="true" />
}
