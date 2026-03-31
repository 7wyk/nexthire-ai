import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import User from '../models/User.js'
import logger from '../config/logger.js'

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MS   = 15 * 60 * 1000 // 15 minutes

// ── Token helpers ──────────────────────────────────────────────────────────

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  )

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  )

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

// ── Controllers ────────────────────────────────────────────────────────────

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' })

    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ message: 'Email already registered' })

    const user = await User.create({ name, email, password, role, company })

    const accessToken  = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // Persist hashed refresh token
    user.refreshToken = hashToken(refreshToken)
    user.lastLogin    = new Date()
    await user.save({ validateBeforeSave: false })

    logger.info('[Auth] New user registered', { userId: user._id, role: user.role })

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) {
    logger.error('[Auth] Register failed', { error: err.message })
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ email }).select('+password +refreshToken +loginAttempts +lockUntil')
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    // Account lock check
    if (user.isLocked) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000)
      return res.status(423).json({ message: `Account locked. Try again in ${remaining} minutes.` })
    }

    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated. Contact admin.' })

    const passwordMatch = await user.comparePassword(password)
    if (!passwordMatch) {
      user.loginAttempts += 1
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS)
        logger.warn('[Auth] Account locked due to too many failed attempts', { email })
      }
      await user.save({ validateBeforeSave: false })
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Reset lockout on successful login
    user.loginAttempts = 0
    user.lockUntil     = undefined
    user.lastLogin     = new Date()

    const accessToken  = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    user.refreshToken = hashToken(refreshToken)
    await user.save({ validateBeforeSave: false })

    logger.info('[Auth] User logged in', { userId: user._id, role: user.role })

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, company: user.company },
    })
  } catch (err) {
    logger.error('[Auth] Login failed', { error: err.message })
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/refresh  — exchange refresh token for new access token
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' })

    // Verify JWT signature + expiry
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }

    // Find user and compare stored hashed token
    const user = await User.findById(decoded.id).select('+refreshToken')
    if (!user || user.refreshToken !== hashToken(refreshToken))
      return res.status(401).json({ message: 'Refresh token mismatch or revoked' })

    // Issue new token pair (rotation)
    const newAccessToken  = generateAccessToken(user)
    const newRefreshToken = generateRefreshToken(user)

    user.refreshToken = hashToken(newRefreshToken)
    await user.save({ validateBeforeSave: false })

    logger.info('[Auth] Tokens refreshed', { userId: user._id })

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    logger.error('[Auth] Refresh failed', { error: err.message })
    res.status(500).json({ message: err.message })
  }
}

// POST /api/auth/logout  — invalidate refresh token
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      // Revoke the specific refresh token
      const decoded = jwt.decode(refreshToken)
      if (decoded?.id) {
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null }, { validateBeforeSave: false })
        logger.info('[Auth] User logged out', { userId: decoded.id })
      }
    }

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json({
    user: {
      id:        req.user._id,
      name:      req.user.name,
      email:     req.user.email,
      role:      req.user.role,
      company:   req.user.company,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt,
    }
  })
}
