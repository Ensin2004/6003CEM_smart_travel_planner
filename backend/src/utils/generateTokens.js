/**
 * Generate Tokens module.
 * Exports and local helpers keep related behavior in a single module.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const generateAccessToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
const generateRefreshToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, env.refreshJwtSecret, {
    expiresIn: env.refreshJwtExpiresIn,
  });
module.exports = { generateAccessToken, generateRefreshToken };
