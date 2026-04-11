import { Router } from 'express'
import {
  register, login, refresh, logout, getMe,
  forgotPassword, resetPassword, verifyEmail,
} from '../controllers/auth.controller.js'
import { protect } from '../middlewares/auth.middleware.js'

const router = Router()

router.post('/register',                    register)
router.post('/login',                       login)
router.post('/refresh',                     refresh)
router.post('/logout',                      logout)
router.get ('/me',           protect,       getMe)
router.post('/forgot-password',             forgotPassword)
router.post('/reset-password',              resetPassword)
router.get ('/verify-email/:token',         verifyEmail)

export default router
