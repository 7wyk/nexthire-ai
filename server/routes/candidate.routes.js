import { Router } from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import {
  getCandidates, createCandidate, getCandidate,
  updateCandidate, deleteCandidate, updateStatus
} from '../controllers/candidate.controller.js'

const router = Router()
router.use(protect)

router.route('/').get(getCandidates).post(createCandidate)
router.route('/:id').get(getCandidate).put(updateCandidate).delete(deleteCandidate)
router.patch('/:id/status', updateStatus)

export default router
