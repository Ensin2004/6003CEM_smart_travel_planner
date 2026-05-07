const User = require('./user.model');

const create = (data) => User.create(data);

const findByEmail = (email, includePassword = false) => {
  const query = User.findOne({ email });
  return includePassword ? query.select('+password +refreshToken') : query;
};

const findById = (id) => User.findById(id);

const findAll = () => User.find().sort({ createdAt: -1 });

const updateById = (id, data) =>
  User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

module.exports = {
  create,
  findByEmail,
  findById,
  findAll,
  updateById,
};
