const mongoose = require('mongoose');
const argon2 = require('argon2');

const preferenceSchema = new mongoose.Schema(
  {
    travelStyle: { type: String, trim: true },
    budgetLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    preferredActivities: [{ type: String, trim: true }],
  },
  { _id: false }
);

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
    preferences: { type: preferenceSchema },
    notificationPreferences: {
      notificationsOff: { type: Boolean, default: false },
      tripAlerts: { type: Boolean, default: true },
      weatherAlerts: { type: Boolean, default: true },
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
