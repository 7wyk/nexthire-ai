import { Router } from 'express'
import { protect } from '../middlewares/auth.middleware.js'
import {
  createSession, sendMessage, getSessions, getSession, endSession
} from '../controllers/interview.controller.js'

const router = Router()
router.use(protect)

router.get('/sessions',          getSessions)
router.post('/sessions',         createSession)
router.get('/sessions/:id',      getSession)
router.post('/sessions/:id/message', sendMessage)
router.patch('/sessions/:id/end',    endSession)

export default router
