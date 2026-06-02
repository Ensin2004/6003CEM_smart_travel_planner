/**
 * Verifies bearer tokens before protected route handlers run.
 * Successful authentication stores a small trusted user object on the request
 * so controllers can perform ownership and role checks without decoding tokens again.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const userRepository = require('../modules/users/user.repository');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    // Missing or malformed authorization headers stop before token verification.
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('Authentication token is required', 401));
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await userRepository.findById(decoded.userId);

    // Disabled accounts are treated like invalid sessions even when the token itself is valid.
    if (!user || user.status === 'disabled') {
      return next(new AppError('User no longer exists or is disabled', 401));
    }

    // Only stable identity fields are exposed to downstream handlers.
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
