import { Router } from 'express'
import { protect, authorize } from '../middlewares/auth.middleware.js'
import {
  applyToJob,
  getMyApplications,
  withdrawApplication,
  getApplicantsByJob,
  updateApplicationStatus,
} from '../controllers/application.controller.js'

const router = Router()

// All application routes require login
router.use(protect)

// ── Candidate routes ─────────────────────────────────────────────────────────
router.post('/',           authorize('candidate'), applyToJob)
router.get('/mine',        authorize('candidate'), getMyApplications)
router.delete('/:id',      authorize('candidate'), withdrawApplication)

// ── Recruiter routes ─────────────────────────────────────────────────────────
router.get('/job/:jobId',          authorize('recruiter', 'admin'), getApplicantsByJob)
router.patch('/:id/status',        authorize('recruiter', 'admin'), updateApplicationStatus)

export default router
