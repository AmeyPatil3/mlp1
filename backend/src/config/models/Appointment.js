import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  duration: {
    type: Number,
    default: 60, // in minutes
    min: [15, 'Minimum duration is 15 minutes'],
    max: [180, 'Maximum duration is 180 minutes']
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'chat'],
    default: 'video'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  meetingLink: {
    type: String
  },
  meetingRoomId: {
    type: String
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  reminderSent: {
    type: Boolean,
    default: false
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
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate user and therapist data when querying
appointmentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'fullName email profileImage'
  }).populate({
    path: 'therapist',
    populate: {
      path: 'user',
      select: 'fullName email profileImage'
    }
  });
  next();
});

// Index for efficient queries
appointmentSchema.index({ user: 1, scheduledDate: 1 });
appointmentSchema.index({ therapist: 1, scheduledDate: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });

export default mongoose.model('Appointment', appointmentSchema);
