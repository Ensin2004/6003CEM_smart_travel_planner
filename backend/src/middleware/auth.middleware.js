/**
 * Verifies bearer tokens before protected route handlers run.
 * Successful authentication stores a small trusted user object on the request
 * so controllers can perform ownership and role checks without decoding tokens again.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const userRepository = require('../modules/users/user.repository');

/**
 * Express middleware that authenticates requests using JWT bearer tokens.
 * Extracts, verifies, and validates the token before allowing access to protected routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Function} - Proceeds to next middleware or passes error to error handler
 */
const protect = async (req, res, next) => {
  try {
    // Extract Authorization header from the request
    const header = req.headers.authorization;

    // Missing or malformed authorization headers stop before token verification.
    // Valid header must be present and start with 'Bearer ' prefix
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('Authentication token is required', 401));
    }

    // Extract the token from the header (remove 'Bearer ' prefix)
    const token = header.split(' ')[1];
    
    // Verify the JWT token using the secret key - throws error if invalid or expired
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // Retrieve the user from the database using the ID from the decoded token
    const user = await userRepository.findById(decoded.userId);

    // Disabled accounts are treated like invalid sessions even when the token itself is valid.
    // Prevents access for users who have been deactivated or deleted
    if (!user || user.status === 'disabled') {
      return next(new AppError('User no longer exists or is disabled', 401));
    }

    // Only stable identity fields are exposed to downstream handlers.
    // Constructs a minimal, trusted user object for controllers to use
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Authentication successful - proceed to the next middleware or route handler
    return next();
  } catch (error) {
    // Catch all JWT verification errors and database errors
    return next(new AppError('Invalid or expired authentication token', 401));
  }
};

module.exports = { protect };