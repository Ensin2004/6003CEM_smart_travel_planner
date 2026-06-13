/**
 * Users module.
 * Schema fields define stored document structure, defaults, and indexes.
 */
const mongoose = require('mongoose');
const argon2 = require('argon2');
// Preference Schema groups database fields before model registration.
const preferenceSchema = new mongoose.Schema(
  {
    travelStyle: { type: String, trim: true },
    spendingPreference: {
      type: String,
      enum: ['budget', 'standard', 'luxury'],
      default: 'standard',
    },
    preferredActivities: [{ type: String, trim: true }],
    preferredCurrency: { type: String, trim: true, uppercase: true, default: 'MYR' },
    preferredLanguage: { type: String, trim: true, lowercase: true, default: 'en' },
  },
  { _id: false }
);
// User Schema groups database fields before model registration.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required() {
        return this.role === 'user';
      },
      trim: true,
      maxlength: 80,
    },
    gender: {
      type: String,
      required() {
        return this.role === 'user';
      },
      enum: ['female', 'male', 'non-binary', 'prefer-not-to-say'],
    },
    ageGroup: {
      type: String,
      required() {
        return this.role === 'user';
      },
      enum: ['under-18', '18-24', '25-34', '35-44', '45-54', '55+'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    preferences: { type: preferenceSchema },
    notificationPreferences: {
      notificationsOff: { type: Boolean, default: false },
      tripAlerts: { type: Boolean, default: true },
      weatherAlerts: { type: Boolean, default: true },
      packingReminder: { type: Boolean, default: true },
      errorLogs: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      ratingFeedback: { type: Boolean, default: true },
    },
    refreshToken: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0, min: 0, select: false },
    loginLockUntil: { type: Date, select: false },
    loginLockLevel: { type: Number, default: 0, min: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;

  this.password = await argon2.hash(this.password, {
    type: argon2.argon2id,
  });
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return argon2.verify(this.password, candidatePassword);
};
module.exports = mongoose.model('User', userSchema);
