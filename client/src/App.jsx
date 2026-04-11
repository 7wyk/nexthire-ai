import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages — Auth
import LandingPage        from './pages/LandingPage'
import LoginPage          from './pages/auth/LoginPage'
import RegisterPage       from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage  from './pages/auth/ResetPasswordPage'

// Pages — Recruiter
import Dashboard        from './pages/dashboard/Dashboard'
import JobsPage         from './pages/jobs/JobsPage'
import CandidatesPage   from './pages/candidates/CandidatesPage'
import ResumePage       from './pages/resume/ResumePage'
import InterviewPage    from './pages/interview/InterviewPage'
import RankingPage      from './pages/ranking/RankingPage'
import CreateCodingTest from './pages/coding/CreateCodingTest'
import JobApplicantsPage from './pages/applications/JobApplicantsPage'

// Pages — Candidate
import PublicJobsPage     from './pages/jobs/PublicJobsPage'
import MyApplicationsPage from './pages/applications/MyApplicationsPage'
import CodingTestPage     from './pages/coding/CodingTestPage'

// Pages — Shared
import CodingPage from './pages/coding/CodingPage'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Where to redirect after login based on role */
function roleHome(role) {
  return role === 'candidate' ? '/public-jobs' : '/dashboard'
}

/** Blocks unauthenticated users — redirects to /login */
function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

/**
 * Blocks users whose role is not in allowedRoles.
 * Redirects them to their role home instead of a blank error page.
 */
function RoleRoute({ children, allowedRoles }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to={roleHome(user?.role)} replace />
  }
  return children
}

/** Redirects already-authenticated users away from login/register */
function GuestRoute({ children }) {
  const { token, user } = useAuthStore()
  if (token) return <Navigate to={roleHome(user?.role)} replace />
  return children
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Auth (guest-only) ───────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      </Route>

      {/* ── Public auth utilities (no guest guard — links come from email) ── */}
      <Route path="/forgot-password"       element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* ── Protected app shell ─────────────────────────────────────── */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

        {/* ── Dashboard — both roles; renders role-specific content ──── */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* ── Recruiter-only ──────────────────────────────────────────── */}
        <Route
          path="/jobs"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><JobsPage /></RoleRoute>}
        />
        <Route
          path="/candidates"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><CandidatesPage /></RoleRoute>}
        />
        <Route
          path="/resume-ai"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><ResumePage /></RoleRoute>}
        />
        <Route
          path="/interview"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><InterviewPage /></RoleRoute>}
        />
        <Route
          path="/ranking"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><RankingPage /></RoleRoute>}
        />
        <Route
          path="/create-coding-test"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><CreateCodingTest /></RoleRoute>}
        />
        <Route
          path="/jobs/:jobId/applicants"
          element={<RoleRoute allowedRoles={['recruiter','admin']}><JobApplicantsPage /></RoleRoute>}
        />

        {/* ── Candidate-only ──────────────────────────────────────────── */}
        <Route
          path="/public-jobs"
          element={<RoleRoute allowedRoles={['candidate']}><PublicJobsPage /></RoleRoute>}
        />
        <Route
          path="/my-applications"
          element={<RoleRoute allowedRoles={['candidate']}><MyApplicationsPage /></RoleRoute>}
        />
        <Route
          path="/coding-test/:jobId"
          element={<RoleRoute allowedRoles={['candidate']}><CodingTestPage /></RoleRoute>}
        />

        {/* ── Shared (both roles) — generic coding sandbox ────────────── */}
        <Route path="/coding" element={<CodingPage />} />
      </Route>

      {/* ── 404 catch-all ──────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
