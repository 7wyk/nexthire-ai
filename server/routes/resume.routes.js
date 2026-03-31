import { Router } from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import { upload } from '../config/multer.js'
import { screenResume, matchResumes, getScreeningHistory } from '../controllers/resume.controller.js'

const router = Router()
router.use(protect)

router.post('/screen',  upload.single('resume'), screenResume)
router.post('/match',   matchResumes)
router.get('/history',  getScreeningHistory)

export default router
