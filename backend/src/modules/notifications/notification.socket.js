/**
 * Socket.IO bridge for authenticated notification delivery.
 */
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const env = require('../../config/env');
const logger = require('../../utils/logger');

// Socket.IO server instance
let io;

/**
 * Gets allowed origins from environment variable for CORS configuration.
 * Splits comma-separated origins and trims whitespace.
 * 
 * @returns {Array<string>} Array of allowed origin URLs
 */
const getAllowedOrigins = () =>
  env.clientOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

/**
 * Sets up the Socket.IO server with authentication middleware.
 * Verifies JWT token from handshake auth and attaches user info to socket.
 * 
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
const setupNotificationSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  // Authentication middleware - verifies JWT token before connection
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token is required'));

      const decoded = jwt.verify(token, env.jwtSecret);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      return next();
    } catch (error) {
      return next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler - joins user-specific and role-specific rooms
  io.on('connection', (socket) => {
    // Private room for user-specific notifications
    socket.join(`user:${socket.userId}`);
    
    // Role room for admin broadcasts (if user has a role)
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }
  });

  logger.info('Notification Socket.IO server ready');
  return io;
};

/**
 * Emits a new notification to a specific user.
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification object
 * @param {number} unreadCount - Updated unread count
 */
const emitNotification = (userId, notification, unreadCount) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', { notification, unreadCount });
};

/**
 * Emits updated unread count to a specific user.
 * @param {string} userId - User ID
 * @param {number} unreadCount - Current unread count
 */
const emitUnreadCount = (userId, unreadCount) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:unread-count', { unreadCount });
};

/**
 * Broadcasts settings content updated event to all connected clients.
 * @param {Object} content - Updated settings content
 */
const emitSettingsContentUpdated = (content) => {
  if (!io) return;
  io.emit('settings:content-updated', { content });
};

/**
 * Broadcasts category update event to all connected clients.
 * @param {string} action - Action type (created, updated, deleted)
 * @param {Object} category - Updated category object
 */
const emitCategoriesUpdated = (action, category) => {
  if (!io) return;
  io.emit('categories:updated', { action, category });
};

/**
 * Broadcasts new feedback submission to all admin clients.
 * @param {Object} feedback - Submitted feedback object
 */
const emitFeedbackSubmitted = (feedback) => {
  if (!io) return;
  io.to('role:admin').emit('feedback:submitted', { feedback });
};

/**
 * Broadcasts new user creation event to all admin clients.
 * @param {string} userId - ID of the newly created user
 */
const emitAdminUserCreated = (userId) => {
  if (!io) return;
  io.to('role:admin').emit('admin:user-created', { userId });
};

module.exports = {
  emitAdminUserCreated,
  emitCategoriesUpdated,
  emitFeedbackSubmitted,
  emitNotification,
  emitSettingsContentUpdated,
  emitUnreadCount,
  setupNotificationSocket,
};