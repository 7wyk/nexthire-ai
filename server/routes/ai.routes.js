import { Router } from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import { upload }  from '../config/multer.js'
import {
  parseResume,
  scoreResume,
  generateQuestions,
} from '../controllers/ai.controller.js'

const router = Router()

// All AI routes require a logged-in user
router.use(protect)

// ── POST /api/ai/parse-resume ─────────────────────────────────────────────────
// multipart/form-data  |  field: "resume"  |  PDF / DOC / DOCX / TXT (max 5 MB)
// Returns extracted plain text — no AI, no DB write.
router.post('/parse-resume', upload.single('resume'), parseResume)

// ── POST /api/ai/score-resume ─────────────────────────────────────────────────
// application/json  |  { resumeText, jobTitle?, jobDescription? }
// Sends to Groq LLM → returns score 0-100, skills, strengths, weaknesses, recommendation.
router.post('/score-resume', scoreResume)

// ── POST /api/ai/generate-questions ──────────────────────────────────────────
// application/json  |  { resumeText, jobTitle, jobDescription?, round? }
// Generates 5 targeted interview questions with category + difficulty.
router.post('/generate-questions', generateQuestions)

export default router
