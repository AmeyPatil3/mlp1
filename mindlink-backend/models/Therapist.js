import mongoose from 'mongoose';

const therapistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialties: [{
    type: String,
    required: [true, 'At least one specialty is required'],
    trim: true
  }],
  experienceYears: {
    type: Number,
    required: [true, 'Experience years is required'],
    min: [0, 'Experience years cannot be negative'],
    max: [50, 'Experience years cannot exceed 50']
  },
  education: {
    type: String,
    required: [true, 'Education is required'],
    trim: true,
    maxlength: [500, 'Education description cannot exceed 500 characters']
  },
  licenseNumber: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative']
  },
  availability: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    wednesday: [{ start: String, end: String }],
    thursday: [{ start: String, end: String }],
    friday: [{ start: String, end: String }],
    saturday: [{ start: String, end: String }],
    sunday: [{ start: String, end: String }]
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt field before saving
therapistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate user data when querying
therapistSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'fullName email profileImage role'
  });
  next();
});

export default mongoose.model('Therapist', therapistSchema);
