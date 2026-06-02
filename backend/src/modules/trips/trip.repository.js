/**
 * Trips module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const Trip = require('./trip.model');
const create = (data) => Trip.create(data);
const findByUserId = (userId) => Trip.find({ userId }).sort({ createdAt: -1 });
const findById = (id) => Trip.findById(id);
const findByIdAndUserId = (id, userId) => Trip.findOne({ _id: id, userId });
// Update By Id And User Id applies allowed changes to an existing record.
const updateByIdAndUserId = (id, userId, data) =>
  Trip.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',
    runValidators: true,
  });
// Delete By Id And User Id removes a record after ownership checks.
const deleteByIdAndUserId = (id, userId) => Trip.findOneAndDelete({ _id: id, userId });
// Delete By User Id removes a record after ownership checks.
const deleteByUserId = (userId) => Trip.deleteMany({ userId });
const countAll = () => Trip.countDocuments();
const aggregateStatusCounts = async () => {
  const today = Trip.getStatusBoundaryDate();
  const [active, inactive] = await Promise.all([
    Trip.countDocuments({ endDate: { $gte: today } }),
    Trip.countDocuments({ endDate: { $lt: today } }),
  ]);

  return [
    { _id: 'active', count: active },
    { _id: 'inactive', count: inactive },
  ].filter((item) => item.count > 0);
};
module.exports = {
  create,
  findByUserId,
  findById,
  findByIdAndUserId,
  updateByIdAndUserId,
  deleteByIdAndUserId,
  deleteByUserId,
  countAll,
  aggregateStatusCounts,
};
