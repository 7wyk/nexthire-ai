import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, Medal, Award, TrendingUp, Filter,
  ChevronDown, Star, Code2, FileText, MessageSquare,
  ChevronUp, Minus
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const statusConfig = {
  hired:       { cls: 'badge bg-emerald-400/15 text-emerald-200 border-emerald-400/30', label: 'Hired' },
  shortlisted: { cls: 'badge-success',  label: 'Shortlisted' },
  interview:   { cls: 'badge-primary',  label: 'Interview' },
  screening:   { cls: 'badge-warning',  label: 'Screening' },
  applied:     { cls: 'badge',          label: 'Applied' },
  rejected:    { cls: 'badge-danger',   label: 'Rejected' },
}

const MedalIcon = ({ rank }) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-amber-400" />
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
  return <span className="text-slate-400 font-mono text-sm w-5 text-center">#{rank}</span>
}

const MiniBar = ({ value, color, icon: Icon }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <Icon size={11} className={color} />
    <div className="w-16 h-1.5 bg-surface-600 rounded-full overflow-hidden">
      <div className={`h-full ${color.replace('text-', 'bg-')} rounded-full`}
        style={{ width: `${value || 0}%` }} />
    </div>
    <span className="text-slate-400 w-5 text-right">{value || 0}</span>
  </div>
)

export default function RankingPage() {
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs]             = useState([])
  const [selectedJob, setSelectedJob] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading]       = useState(true)
  const [sortField, setSortField]   = useState('totalScore')

  useEffect(() => {
    api.get('/jobs').then(r => setJobs(r.data.jobs)).catch(() => {})
    fetchCandidates()
  }, [selectedJob, statusFilter])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const params = { sort: `-${sortField}`, limit: 50 }
      if (selectedJob)  params.job    = selectedJob
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/candidates', { params })
      // Sort locally to allow re-sort without fetch
      const sorted = [...data.candidates].sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0))
      setCandidates(sorted)
    } catch { toast.error('Failed to load rankings') }
    finally { setLoading(false) }
  }

  const handleSort = (field) => {
    setSortField(field)
    setCandidates(prev => [...prev].sort((a, b) => (b[field] || 0) - (a[field] || 0)))
  }

  const SortHeader = ({ field, label }) => (
    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 pr-3 cursor-pointer hover:text-white transition-colors"
      onClick={() => handleSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        {sortField === field
          ? <ChevronDown size={12} className="text-primary-400" />
          : <Minus size={12} className="text-slate-600" />}
      </span>
    </th>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top 3 Podium */}
      {candidates.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-2">
          {[candidates[1], candidates[0], candidates[2]].map((c, podiumIdx) => {
            const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3
            const heights = ['h-24', 'h-32', 'h-20']
            return (
              <motion.div key={c._id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumIdx * 0.1 }}
                className={`card text-center flex flex-col items-center justify-end pt-4
                  ${rank === 1 ? 'border-amber-500/30 bg-amber-500/5' : ''}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500/40 to-accent-500/40 border-2 border-primary-500/30 flex items-center justify-center text-white font-bold mb-2">
                  {c.name[0]}
                </div>
                <MedalIcon rank={rank} />
                <p className="text-white font-semibold text-sm mt-1 line-clamp-1">{c.name}</p>
                <p className="text-slate-400 text-xs mb-2">{c.currentRole || c.job?.title || '–'}</p>
                <div className={`w-full ${heights[podiumIdx]} rounded-xl mt-2 flex items-center justify-center
                  ${rank === 1 ? 'bg-amber-500/20' : 'bg-surface-700'}`}>
                  <span className="text-2xl font-extrabold text-white">{c.totalScore}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <p className="text-slate-400 text-sm">{candidates.length} candidates ranked</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select className="input pr-8 appearance-none cursor-pointer text-sm"
              value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
              <option value="">All Jobs</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
          </div>
          <div className="relative">
            <select className="input pr-8 appearance-none cursor-pointer text-sm"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {Object.keys(statusConfig).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3.5 w-10">#</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 pr-3">Candidate</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 pr-3">Status</th>
              <SortHeader field="resumeScore"    label="Resume" />
              <SortHeader field="codeScore"      label="Code" />
              <SortHeader field="interviewScore" label="Interview" />
              <SortHeader field="totalScore"     label="Total" />
              <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 pr-5">Skills</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-5 py-3">
                    <div className="h-8 bg-surface-700 rounded-lg animate-pulse" />
                  </td>
                </tr>
              ))
            ) : candidates.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No candidates found</td></tr>
            ) : candidates.map((c, i) => {
              const sc = statusConfig[c.status] || statusConfig.applied
              return (
                <motion.tr key={c._id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center w-7">
                      <MedalIcon rank={i + 1} />
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 border border-primary-500/20 flex items-center justify-center text-primary-300 font-bold text-xs flex-shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        <p className="text-slate-500 text-xs">{c.experience || 0}y exp</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`${sc.cls} badge capitalize`}>{sc.label}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <MiniBar value={c.resumeScore}    color="text-blue-400"    icon={FileText} />
                  </td>
                  <td className="py-3 pr-3">
                    <MiniBar value={c.codeScore}      color="text-purple-400"  icon={Code2} />
                  </td>
                  <td className="py-3 pr-3">
                    <MiniBar value={c.interviewScore} color="text-emerald-400" icon={MessageSquare} />
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                        ${c.totalScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' :
                          c.totalScore >= 60 ? 'bg-amber-500/20 text-amber-300' :
                          'bg-red-500/20 text-red-300'}`}>
                        {c.totalScore || 0}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-5">
                    <div className="flex flex-wrap gap-1">
                      {c.skills?.slice(0, 2).map(s => (
                        <span key={s} className="badge bg-surface-600 text-slate-300 border-white/10 text-[10px]">{s}</span>
                      ))}
                      {(c.skills?.length || 0) > 2 && (
                        <span className="text-slate-500 text-[10px]">+{c.skills.length - 2}</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
