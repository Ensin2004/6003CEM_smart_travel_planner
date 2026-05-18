const Trip = require('./trip.model');

const create = (data) => Trip.create(data);

const findByUserId = (userId) => Trip.find({ userId }).sort({ createdAt: -1 });

const findById = (id) => Trip.findById(id);

const findByIdAndUserId = (id, userId) => Trip.findOne({ _id: id, userId });

const updateByIdAndUserId = (id, userId, data) =>
  Trip.findOneAndUpdate({ _id: id, userId }, data, {
    returnDocument: 'after',
    runValidators: true,
  });

const deleteByIdAndUserId = (id, userId) => Trip.findOneAndDelete({ _id: id, userId });

const countAll = () => Trip.countDocuments();

module.exports = {
  create,
  findByUserId,
  findById,
  findByIdAndUserId,
  updateByIdAndUserId,
  deleteByIdAndUserId,
  countAll,
};
