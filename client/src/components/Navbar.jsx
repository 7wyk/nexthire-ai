import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/dashboard':  'Dashboard',
  '/jobs':       'Job Listings',
  '/candidates': 'Candidates',
  '/resume-ai':  'Resume AI Screening',
  '/coding':     'Coding Assessment',
  '/interview':  'AI Interview',
  '/ranking':    'Candidate Rankings',
}

export default function Navbar() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface-800/80 backdrop-blur-sm border-b border-white/[0.07] flex-shrink-0">
      <h1 className="text-lg font-semibold text-white">
        {pageTitles[pathname] || 'NextHire AI'}
      </h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-xl bg-surface-700 border border-white/10 text-slate-300 placeholder-slate-500 text-sm focus:outline-none focus:border-primary-500/40 w-52 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-surface-700 border border-white/10 text-slate-400 hover:text-white hover:border-primary-500/30 transition-all">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
