/**
 * Notifications persistence helpers.
 */
const Notification = require('./notification.model');

const create = (data) => Notification.create(data);
const findByUserId = (userId, sortDirection = 'desc') =>
  Notification.find({ userId }).sort({ createdAt: sortDirection === 'asc' ? 1 : -1 });
const countUnreadByUserId = (userId) => Notification.countDocuments({ userId, isRead: false });
const markReadByIdAndUserId = (id, userId) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { returnDocument: 'after' });
const markAllReadByUserId = (userId) =>
  Notification.updateMany({ userId, isRead: false }, { isRead: true });
const findDueUnsent = (now = new Date()) =>
  Notification.find({
    sentAt: { $exists: false },
    scheduledAt: { $lte: now },
  }).sort({ scheduledAt: 1 }).limit(50);
const deletePendingByTripAndType = (tripId, userId, type) =>
  Notification.deleteMany({ tripId, userId, type, sentAt: { $exists: false } });
const save = (notification) => notification.save();

module.exports = {
  countUnreadByUserId,
  create,
  deletePendingByTripAndType,
  findByUserId,
  findDueUnsent,
  markAllReadByUserId,
  markReadByIdAndUserId,
  save,
};
