/**
 * notification.socket.js
 * Real-time push notifications for recruiters & candidates.
 * Namespace: /notifications
 */
import logger from '../config/logger.js'

// In-memory map: userId → socketId (for direct pushes)
const userSockets = new Map()

export const registerNotificationSockets = (io) => {
  const ns = io.of('/notifications')

  ns.on('connection', (socket) => {
    logger.info('[Socket/Notify] Client connected', { socketId: socket.id })

    // ── Register user for direct notifications ────────────────────────────
    socket.on('register', ({ userId }) => {
      if (userId) {
        userSockets.set(userId, socket.id)
        socket.data.userId = userId
        socket.join(`user:${userId}`)
        logger.info('[Socket/Notify] User registered', { userId })
      }
    })

    // ── Alias: notify-user → pushToUser logic ────────────────────────────
    // Compatibility alias for simple clients. Delegates to the same
    // room-emit pattern used by the exported pushToUser() helper.
    // Payload: { targetUserId, event, message, [meta] }
    socket.on('notify-user', ({ targetUserId, event = 'notification', message, meta }) => {
      if (!targetUserId) return
      ns.to(`user:${targetUserId}`).emit(event, {
        message,
        meta,
        timestamp: new Date().toISOString(),
      })
      logger.info('[Socket/Notify] notify-user alias fired', { targetUserId, event })
    })

    // ── Utility: push to specific user ────────────────────────────────────
    socket.on('disconnect', () => {
      const { userId } = socket.data || {}
      if (userId) userSockets.delete(userId)
      logger.info('[Socket/Notify] Client disconnected', { socketId: socket.id })
    })
  })

  // ── Exported helpers (called from controllers) ────────────────────────────

  /**
   * Push a notification to a specific user regardless of socket.
   */
  const pushToUser = (userId, event, payload) => {
    ns.to(`user:${userId}`).emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Broadcast to all connected recruiters.
   */
  const broadcastToRecruiters = (event, payload) => {
    ns.emit(event, { ...payload, timestamp: new Date().toISOString() })
  }

  return { pushToUser, broadcastToRecruiters, userSockets }
}
