/**
 * Notifications persistence helpers.
 */
const Notification = require('./notification.model');

const create = (data) => Notification.create(data);
const findByUserId = (userId, sortDirection = 'desc') =>
  Notification.find({ userId, sentAt: { $exists: true } }).sort({ createdAt: sortDirection === 'asc' ? 1 : -1 });
const countUnreadByUserId = (userId) =>
  Notification.countDocuments({ userId, sentAt: { $exists: true }, isRead: false });
const markReadByIdAndUserId = (id, userId) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { returnDocument: 'after' });
const markAllReadByUserId = (userId) =>
  Notification.updateMany({ userId, sentAt: { $exists: true }, isRead: false }, { isRead: true });
const findDueUnsent = (now = new Date()) =>
  Notification.find({
    sentAt: { $exists: false },
    scheduledAt: { $lte: now },
  }).sort({ scheduledAt: 1 }).limit(50);
const deletePendingByTripAndType = (tripId, userId, type) =>
  Notification.deleteMany({ tripId, userId, type, sentAt: { $exists: false } });
const deletePendingPackingListReminder = (packingListId, userId) =>
  Notification.deleteMany({
    userId,
    type: 'packing-list',
    'metadata.packingListId': packingListId,
    sentAt: { $exists: false },
  });
const deleteById = (id) => Notification.findByIdAndDelete(id);
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
