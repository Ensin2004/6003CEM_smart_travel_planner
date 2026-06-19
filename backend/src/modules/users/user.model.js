/**
 * Users module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
const argon2 = require('argon2');

// Preference Schema groups database fields before model registration.
const preferenceSchema = new mongoose.Schema(
  {
    travelStyle: { type: String, trim: true },  // Preferred travel style (e.g., adventure, luxury)
    spendingPreference: {
      type: String,
      enum: ['budget', 'standard', 'luxury'],
      default: 'standard',
    },  // Budget preference for trips
    preferredActivities: [{ type: String, trim: true }],  // List of preferred activity types
    preferredCurrency: { type: String, trim: true, uppercase: true, default: 'MYR' },  // Default currency
    preferredLanguage: { type: String, trim: true, lowercase: true, default: 'en' },  // Language preference
  },
  { _id: false }  // Prevent creation of separate _id for sub-documents
);

// User Schema groups database fields before model registration.
const userSchema = new mongoose.Schema(
  {
    // Basic user information
    name: { type: String, required: true, trim: true, maxlength: 80 },  // Full name
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },  // Unique email for login
    
    avatarUrl: {
      type: String,
      trim: true,
    },  // Profile picture URL
    country: {
      type: String,
      required() {
        return this.role === 'user';
      },
      trim: true,
      maxlength: 80,
    },  // User's country
    gender: {
      type: String,
      required() {
        return this.role === 'user';
      },
      enum: ['female', 'male', 'non-binary', 'prefer-not-to-say'],
    },  // Gender identity
    ageGroup: {
      type: String,
      required() {
        return this.role === 'user';
      },
      enum: ['under-18', '18-24', '25-34', '35-44', '45-54', '55+'],
    },  // Age range for demographic purposes
    
    // Authentication fields
    password: { type: String, required: true, minlength: 8, select: false },  // Hashed password (not returned by default)
    role: { type: String, enum: ['user', 'admin'], default: 'user' },  // User role for authorization
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },  // Account status
    
    // Email verification
    isEmailVerified: { type: Boolean, default: false },  // Whether email has been verified
    emailVerifiedAt: { type: Date },  // Timestamp of email verification
    emailVerificationToken: { type: String, select: false },  // Token for email verification
    emailVerificationExpiresAt: { type: Date, select: false },  // Token expiry
    
    // User preferences
    preferences: { type: preferenceSchema },  // Travel preferences
    
    // Notification settings
    notificationPreferences: {
      notificationsOff: { type: Boolean, default: false },  // Master toggle for all notifications
      tripAlerts: { type: Boolean, default: true },  // Trip-related notifications
      weatherAlerts: { type: Boolean, default: true },  // Weather updates
      packingReminder: { type: Boolean, default: true },  // Packing list reminders
      errorLogs: { type: Boolean, default: true },  // Error notifications
      systemAlerts: { type: Boolean, default: true },  // System notifications
      ratingFeedback: { type: Boolean, default: true },  // Rating requests
    },
    
    // Session management
    refreshToken: { type: String, select: false },  // JWT refresh token
    refreshTokenExpiresAt: { type: Date, select: false },  // Refresh token expiry
    
    // Security monitoring
    failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },  // Consecutive failed logins
    loginLockUntil: { type: Date, select: false },  // Account lock until timestamp
    loginLockLevel: { type: Number, default: 0, min: 0, select: false },  // Lock severity level
  },
  {
    timestamps: true,  // Auto-manage createdAt and updatedAt fields
    toJSON: { virtuals: true },  // Include virtual fields in JSON output
    toObject: { virtuals: true },  // Include virtual fields in object conversion
  }
);

// Indexes for efficient querying
userSchema.index({ role: 1 });  // Filter by user role
userSchema.index({ status: 1 });  // Filter by account status
userSchema.index({ emailVerificationToken: 1 });  // Lookup by verification token
userSchema.index({ createdAt: -1 });  // Sort by creation date (newest first)

// Pre-save hook to hash password before storing
userSchema.pre('save', async function hashPassword() {
  // Only hash if password is modified
  if (!this.isModified('password')) return;

  // Hash password using Argon2id (secure and memory-hard)
  this.password = await argon2.hash(this.password, {
    type: argon2.argon2id,
  });
});

// Instance method to compare a candidate password with stored hash
userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  // Verify password using Argon2
  return argon2.verify(this.password, candidatePassword);
};

// Create and export the User model
module.exports = mongoose.model('User', userSchema);