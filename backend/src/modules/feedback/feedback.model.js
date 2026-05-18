const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, trim: true, maxlength: 1500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
