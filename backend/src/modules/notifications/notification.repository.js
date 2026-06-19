/**
 * Notifications persistence helpers.
 */
const Notification = require('./notification.model');

/**
 * Creates a new notification document.
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const create = (data) => Notification.create(data);

/**
 * Retrieves all sent notifications for a user, sorted by creation date.
 * Only returns notifications that have been sent (sentAt exists).
 * 
 * @param {string} userId - User ID
 * @param {string} sortDirection - Sort direction: 'asc' or 'desc' (default: 'desc')
 * @returns {Promise<Array>} Array of notification documents
 */
const findByUserId = (userId, sortDirection = 'desc') =>
  Notification.find({ userId, sentAt: { $exists: true } }).sort({ createdAt: sortDirection === 'asc' ? 1 : -1 });

/**
 * Counts unread notifications for a user.
 * Only counts notifications that have been sent.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
const countUnreadByUserId = (userId) =>
  Notification.countDocuments({ userId, sentAt: { $exists: true }, isRead: false });

/**
 * Marks a specific notification as read, with ownership verification.
 * @param {string} id - Notification ID
 * @param {string} userId - User ID for ownership check
 * @returns {Promise<Object|null>} Updated notification or null
 */
const markReadByIdAndUserId = (id, userId) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { returnDocument: 'after' });

/**
 * Marks all sent notifications as read for a user.
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update operation result
 */
const markAllReadByUserId = (userId) =>
  Notification.updateMany({ userId, sentAt: { $exists: true }, isRead: false }, { isRead: true });

/**
 * Finds unsent notifications that are due to be sent.
 * Sorted by scheduled date (oldest first) with a limit of 50 per batch.
 * 
 * @param {Date} now - Current time for comparison (default: new Date())
 * @returns {Promise<Array>} Array of due notifications
 */
const findDueUnsent = (now = new Date()) =>
  Notification.find({
    sentAt: { $exists: false },
    scheduledAt: { $lte: now },
  }).sort({ scheduledAt: 1 }).limit(50);

/**
 * Deletes pending notifications for a specific trip and type.
 * Only deletes notifications that haven't been sent yet.
 * 
 * @param {string} tripId - Trip ID
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @returns {Promise<Object>} Delete operation result
 */
const deletePendingByTripAndType = (tripId, userId, type) =>
  Notification.deleteMany({ tripId, userId, type, sentAt: { $exists: false } });

/**
 * Deletes pending packing list reminders for a specific packing list.
 * @param {string} packingListId - Packing list ID from metadata
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Delete operation result
 */
const deletePendingPackingListReminder = (packingListId, userId) =>
  Notification.deleteMany({
    userId,
    type: 'packing-list',
    'metadata.packingListId': packingListId,
    sentAt: { $exists: false },
  });

/**
 * Deletes a notification by ID.
 * @param {string} id - Notification ID
 * @returns {Promise<Object|null>} Deleted notification or null
 */
const deleteById = (id) => Notification.findByIdAndDelete(id);

/**
 * Saves an existing notification document.
 * @param {Object} notification - Notification document
 * @returns {Promise<Object>} Saved notification
 */
const save = (notification) => notification.save();

module.exports = {
  countUnreadByUserId,
  create,
  deleteById,
  deletePendingByTripAndType,
  deletePendingPackingListReminder,
  findByUserId,
  findDueUnsent,
  markAllReadByUserId,
  markReadByIdAndUserId,
  save,
};