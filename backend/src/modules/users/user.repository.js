const User = require('./user.model');

const create = (data) => User.create(data);

const findByEmail = (email, includePassword = false) => {
  const query = User.findOne({ email });
  return includePassword
    ? query.select(
        '+password +refreshToken +refreshTokenExpiresAt +failedLoginAttempts +loginLockUntil +loginLockLevel +emailVerificationToken +emailVerificationExpiresAt'
      )
    : query;
};

const findById = (id) => User.findById(id);

const findByIdWithPassword = (id) => User.findById(id).select('+password');

const findByIdWithRefreshToken = (id) => User.findById(id).select('+refreshToken +refreshTokenExpiresAt');

const findByEmailVerificationToken = (token) =>
  User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken +emailVerificationExpiresAt');

const findAll = () => User.find().sort({ createdAt: -1 });

const deleteById = (id) => User.findByIdAndDelete(id);

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
  findByEmailVerificationToken,
  findAll,
  deleteById,
  updateById,
};
