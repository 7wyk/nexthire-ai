import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import Dashboard from './pages/dashboard/Dashboard'
import CandidatesPage from './pages/candidates/CandidatesPage'
import JobsPage from './pages/jobs/JobsPage'
import ResumePage from './pages/resume/ResumePage'
import CodingPage from './pages/coding/CodingPage'
import InterviewPage from './pages/interview/InterviewPage'
import RankingPage from './pages/ranking/RankingPage'

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected App */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/resume-ai" element={<ResumePage />} />
        <Route path="/coding" element={<CodingPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/ranking" element={<RankingPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
