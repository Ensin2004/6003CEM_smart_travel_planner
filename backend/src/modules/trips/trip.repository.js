/**
 * Trips module.
 * Database queries stay isolated behind focused persistence helpers.
 */

// Import the Trip model for database operations
const Trip = require('./trip.model');

// Create a new trip document in the database
const create = (data) => Trip.create(data);

// Find all trips belonging to a specific user, sorted by creation date (newest first)
const findByUserId = (userId) => Trip.find({ userId }).sort({ createdAt: -1 });

// Find a single trip by its unique identifier (no ownership check)
const findById = (id) => Trip.findById(id);

// Find a trip that belongs to a specific user - ensures ownership before access
const findByIdAndUserId = (id, userId) => Trip.findOne({ _id: id, userId });

// Update By Id And User Id applies allowed changes to an existing record after verifying ownership.
const updateByIdAndUserId = (id, userId, data) =>
  Trip.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',   // Return the updated document instead of the original
    runValidators: true,       // Ensure schema validation rules are applied
  });

// Delete By Id And User Id removes a record after ownership checks.
const deleteByIdAndUserId = (id, userId) => Trip.findOneAndDelete({ _id: id, userId });

// Delete By User Id removes all trips belonging to a user (used when deleting user account)
const deleteByUserId = (userId) => Trip.deleteMany({ userId });

// Count total number of trips across all users (admin function)
const countAll = () => Trip.countDocuments();

// Aggregate trip status counts (active vs inactive) based on end date comparison with today
const aggregateStatusCounts = async () => {
  // Get the boundary date that separates active from inactive trips
  const today = Trip.getStatusBoundaryDate();
  
  // Count active trips (end date is today or in the future)
  const active = await Trip.countDocuments({ endDate: { $gte: today } });
  
  // Count inactive trips (end date is before today)
  const inactive = await Trip.countDocuments({ endDate: { $lt: today } });

  // Return array of status objects, filtering out any status with zero count
  return [
    { _id: 'active', count: active },
    { _id: 'inactive', count: inactive },
  ].filter((item) => item.count > 0);
};

// Export all database helper functions for use in service layer
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