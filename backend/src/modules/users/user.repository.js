const User = require('./user.model');

const create = (data) => User.create(data);

const findByEmail = (email, includePassword = false) => {
  const query = User.findOne({ email });
  return includePassword
    ? query.select('+password +refreshToken +refreshTokenExpiresAt +failedLoginAttempts +loginLockUntil +loginLockLevel')
    : query;
};

const findById = (id) => User.findById(id);

const findByIdWithPassword = (id) => User.findById(id).select('+password');

const findByIdWithRefreshToken = (id) => User.findById(id).select('+refreshToken +refreshTokenExpiresAt');

const findAll = () => User.find().sort({ createdAt: -1 });

const updateById = (id, data) =>
  User.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });

module.exports = {
  create,
  findByEmail,
  findById,
  findByIdWithPassword,
  findByIdWithRefreshToken,
  findAll,
  updateById,
};
