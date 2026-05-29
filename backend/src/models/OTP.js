import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'OTP code is required']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required']
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Auto-delete expired OTP records (TTL index)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OTP', otpSchema);
