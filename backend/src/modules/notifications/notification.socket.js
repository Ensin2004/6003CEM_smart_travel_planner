/**
 * Socket.IO bridge for authenticated notification delivery.
 */
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const env = require('../../config/env');
const logger = require('../../utils/logger');

let io;

const getAllowedOrigins = () =>
  env.clientOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const setupNotificationSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

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

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }
  });

  logger.info('Notification Socket.IO server ready');
  return io;
};

const emitNotification = (userId, notification, unreadCount) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', { notification, unreadCount });
};

const emitUnreadCount = (userId, unreadCount) => {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:unread-count', { unreadCount });
};

const emitSettingsContentUpdated = (content) => {
  if (!io) return;
  io.emit('settings:content-updated', { content });
};

const emitFeedbackSubmitted = (feedback) => {
  if (!io) return;
  io.to('role:admin').emit('feedback:submitted', { feedback });
};

const emitAdminUserCreated = (userId) => {
  if (!io) return;
  io.to('role:admin').emit('admin:user-created', { userId });
};

module.exports = {
  emitAdminUserCreated,
  emitFeedbackSubmitted,
  emitNotification,
  emitSettingsContentUpdated,
  emitUnreadCount,
  setupNotificationSocket,
};
