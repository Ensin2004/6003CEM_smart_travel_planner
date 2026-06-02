const Favorite = require('./favorite.model');

const create = (data) => Favorite.create(data);

const findByUserId = (userId) => Favorite.find({ userId }).sort({ createdAt: -1 });

const findExisting = ({ userId, type, externalId, title }) =>
  Favorite.findOne({
    userId,
    type,
    $or: [{ externalId }, { title }],
  });

const deleteByIdAndUserId = (id, userId) => Favorite.findOneAndDelete({ _id: id, userId });

module.exports = { create, deleteByIdAndUserId, findByUserId, findExisting };
