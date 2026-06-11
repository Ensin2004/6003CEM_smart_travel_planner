/**
 * Favorites module.
 * Database queries stay isolated behind focused persistence helpers.
 */
const Favorite = require('./favorite.model');
const create = (data) => Favorite.create(data);
const findByUserId = (userId) => Favorite.find({ userId }).sort({ createdAt: -1 });
const findExisting = ({ userId, type, externalId, title }) =>
  Favorite.findOne({
    userId,
    type,
    $or: [{ externalId }, { title }],
  });
// Trip favourites use a stable external id so ordinary saved locations with the same title remain separate.
const findByUserIdTypeAndExternalId = ({ userId, type, externalId }) =>
  Favorite.findOne({ userId, type, externalId });
// Delete By Id And User Id removes a record after ownership checks.
const deleteByIdAndUserId = (id, userId) => Favorite.findOneAndDelete({ _id: id, userId });
module.exports = { create, deleteByIdAndUserId, findByUserId, findByUserIdTypeAndExternalId, findExisting };
