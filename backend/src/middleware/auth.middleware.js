const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const userRepository = require('../modules/users/user.repository');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('Authentication token is required', 401));
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await userRepository.findById(decoded.userId);

    if (!user || user.status === 'disabled') {
      return next(new AppError('User no longer exists or is disabled', 401));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(new AppError('Invalid or expired authentication token', 401));
  }
};

module.exports = { protect };
