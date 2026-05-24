'use client'
import { useStore } from '../store'
import { Menu } from 'lucide-react'

export default function TopBar({ user }) {
  const { setSidebarOpen } = useStore()
  return (
    <header className="bg-gradient-to-r from-emerald-900 to-green-800 text-white px-4 h-14 flex items-center gap-3 lg:hidden flex-shrink-0 shadow-md">
      <button onClick={() => setSidebarOpen(true)} className="text-emerald-100 hover:text-white p-1 rounded-full hover:bg-white/10">
        <Menu size={22} />
      </button>
      <span className="text-2xl drop-shadow">🥑</span>
      <span className="font-black tracking-tight">GetGuac</span>
      <span className="text-[10px] uppercase tracking-wider text-emerald-200/80 ml-1">smash your spend</span>
    </header>
  )
}
