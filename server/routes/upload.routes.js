import { Router } from 'express'
import { protect }               from '../middlewares/auth.middleware.js'
import { upload }                from '../config/multer.js'
import {
  uploadResume,
  getResumeSignedUrl,
} from '../controllers/upload.controller.js'

const router = Router()

// All upload routes require a logged-in user
router.use(protect)

// ── POST /api/upload/resume ───────────────────────────────────────────────────
// multipart/form-data  |  field: "resume"  |  PDF / DOC / DOCX / TXT (max 5 MB)
// Optional body field:  candidateId  (links file to an existing Candidate doc)
// Returns: { key, url, signedUrl, candidate? }
router.post('/resume', upload.single('resume'), uploadResume)

// ── GET /api/upload/resume/:candidateId/signed-url ────────────────────────────
// Regenerate a fresh 1-hour pre-signed download URL for a candidate's resume.
// Returns: { signedUrl, expiresIn, candidate }
router.get('/resume/:candidateId/signed-url', getResumeSignedUrl)

export default router
