const PackingList = require('./packingList.model');

const create = (data) => PackingList.create(data);

const findByUserId = (userId) =>
  PackingList.find({ userId }).sort({ updatedAt: -1, createdAt: -1 });

const findByIdAndUserId = (id, userId) => PackingList.findOne({ _id: id, userId });

const updateByIdAndUserId = (id, userId, data) =>
  PackingList.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',
    runValidators: true,
  });

const deleteByIdAndUserId = (id, userId) => PackingList.findOneAndDelete({ _id: id, userId });

const save = (packingList) => packingList.save();

module.exports = {
  create,
  findByUserId,
  findByIdAndUserId,
  updateByIdAndUserId,
  deleteByIdAndUserId,
  save,
};
