import { Router } from 'express'
import { register, login, refresh, logout, getMe } from '../controllers/auth.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/register', register)
router.post('/login',    login)
router.post('/refresh',  refresh)
router.post('/logout',   logout)
router.get('/me',        protect, getMe)

export default router
