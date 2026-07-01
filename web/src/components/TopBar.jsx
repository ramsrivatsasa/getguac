'use client'
import { useStore } from '../store'
import { Menu } from 'lucide-react'
export default function TopBar({ user }) {
  const { setSidebarOpen } = useStore()
  return (
    <header className="bg-gradient-to-r from-guac-700 to-guac-logo text-white px-4 h-14 flex items-center gap-3 lg:hidden flex-shrink-0 shadow-md">
      <button onClick={() => setSidebarOpen(true)} className="text-guac-100 hover:text-white p-1 rounded-full hover:bg-white/10">
        <Menu size={22} />
      </button>
      <span className="text-2xl drop-shadow">🥑</span>
      <span className="font-display font-extrabold tracking-tight">GetGuac</span>
      <span className="text-[10px] uppercase tracking-wider text-guac-100/80 ml-1">money's wingman</span>
    </header>
  )
}
