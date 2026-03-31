import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Search, Filter, ChevronDown, Star,
  Code2, MessageSquare, FileText, Trophy, UserCheck,
  Trash2, ExternalLink, MoreVertical
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const STATUSES = ['applied', 'screening', 'interview', 'shortlisted', 'rejected', 'hired']

const statusStyles = {
  applied:     'badge bg-slate-500/15 text-slate-300 border-slate-500/25',
  screening:   'badge-warning',
  interview:   'badge-primary',
  shortlisted: 'badge-success',
  rejected:    'badge-danger',
  hired:       'badge bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
}

const ScoreBar = ({ value, color = 'bg-primary-500' }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-surface-600 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value || 0}%` }} />
    </div>
    <span className="text-xs text-slate-400 w-7 text-right">{value || 0}</span>
  </div>
)

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy]         = useState('-totalScore')
  const [activeMenu, setActiveMenu] = useState(null)

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const params = { sort: sortBy }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/candidates', { params })
      setCandidates(data.candidates)
      setTotal(data.total)
    } catch {
      toast.error('Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCandidates() }, [statusFilter, sortBy])

  const changeStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/candidates/${id}/status`, { status })
      setCandidates(prev => prev.map(c => c._id === id ? data.candidate : c))
      toast.success(`Status updated to ${status}`)
      setActiveMenu(null)
    } catch { toast.error('Update failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this candidate?')) return
    try {
      await api.delete(`/candidates/${id}`)
      setCandidates(prev => prev.filter(c => c._id !== id))
      toast.success('Candidate removed')
    } catch { toast.error('Delete failed') }
  }

  const filtered = search
    ? candidates.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.currentRole?.toLowerCase().includes(search.toLowerCase())
      )
    : candidates

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <p className="text-slate-400 text-sm">{total} candidate{total !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input type="text" placeholder="Search candidates…" value={search}
              onChange={e => setSearch(e.target.value)} className="input pl-9 w-52" />
          </div>
          <div className="relative">
            <select className="input pr-8 appearance-none cursor-pointer"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="input pr-8 appearance-none cursor-pointer"
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="-totalScore">≡ Top Score</option>
              <option value="-resumeScore">≡ Resume Score</option>
              <option value="-codeScore">≡ Code Score</option>
              <option value="-createdAt">≡ Newest</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status Pipeline summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {STATUSES.map(s => {
          const count = candidates.filter(c => c.status === s).length
          return (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`card py-3 px-3 text-center cursor-pointer transition-all hover:border-primary-500/30
                ${statusFilter === s ? 'border-primary-500/50 bg-primary-500/10' : ''}`}
            >
              <p className="text-xl font-bold text-white">{count}</p>
              <p className="text-slate-400 text-xs capitalize">{s}</p>
            </button>
          )
        })}
      </div>

      {/* Candidate Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-surface-700" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No candidates found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Candidate', 'Status', 'Resume', 'Code', 'Interview', 'Total', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c, i) => (
                <motion.tr
                  key={c._id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600/30 to-accent-500/30 border border-primary-500/20 flex items-center justify-center text-primary-300 font-bold text-sm flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        <p className="text-slate-500 text-xs">{c.currentRole || c.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={`${statusStyles[c.status]} badge capitalize`}>{c.status}</span>
                  </td>
                  {/* Scores */}
                  <td className="px-5 py-4 w-28">
                    <ScoreBar value={c.resumeScore} color="bg-blue-500" />
                  </td>
                  <td className="px-5 py-4 w-28">
                    <ScoreBar value={c.codeScore} color="bg-purple-500" />
                  </td>
                  <td className="px-5 py-4 w-28">
                    <ScoreBar value={c.interviewScore} color="bg-emerald-500" />
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-white font-bold text-sm">{c.totalScore}</span>
                    <span className="text-slate-500 text-xs">/100</span>
                  </td>
                  {/* Actions */}
                  <td className="px-5 py-4 relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === c._id ? null : c._id)}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === c._id && (
                      <div className="absolute right-10 top-3 z-30 bg-surface-700 border border-white/10 rounded-xl shadow-xl p-1 w-44"
                        onMouseLeave={() => setActiveMenu(null)}>
                        <p className="text-slate-500 text-xs px-3 py-1.5 font-medium">Move to stage</p>
                        {STATUSES.map(s => (
                          <button key={s} onClick={() => changeStatus(c._id, s)}
                            className={`w-full text-left px-3 py-1.5 text-sm rounded-lg capitalize transition-colors
                              ${c.status === s ? 'text-primary-400 bg-primary-500/10' : 'text-slate-300 hover:bg-white/5'}`}>
                            {s}
                          </button>
                        ))}
                        <hr className="border-white/10 my-1" />
                        <button onClick={() => handleDelete(c._id)}
                          className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
