'use client'
import { useStore } from '../store'
import { Menu } from 'lucide-react'
export default function TopBar({ user }) {
  const { setSidebarOpen } = useStore()
  return (
    <header className="bg-white text-gray-900 border-b border-gray-200 px-4 h-14 flex items-center gap-3 lg:hidden flex-shrink-0">
      <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100">
        <Menu size={22} />
      </button>
      <span className="text-2xl">🥑</span>
      <span className="font-display font-extrabold tracking-tight">GetGuac</span>
      <span className="text-[10px] uppercase tracking-wider text-gray-400 ml-1">money's wingman</span>
    </header>
  )
}
