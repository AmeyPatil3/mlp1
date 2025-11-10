import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  topic: {
    type: String,
    required: [true, 'Room topic is required'],
    trim: true,
    maxlength: [200, 'Room topic cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  maxParticipants: {
    type: Number,
    default: 10,
    min: [2, 'Minimum 2 participants required'],
    max: [50, 'Maximum 50 participants allowed']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
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
roomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for participants count
roomSchema.virtual('participantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Ensure virtual fields are serialized
roomSchema.set('toJSON', { virtuals: true });

// Populate user data when querying
roomSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'createdBy',
    select: 'fullName profileImage'
  }).populate({
    path: 'participants.user',
    select: 'fullName profileImage'
  });
  next();
});

export default mongoose.model('Room', roomSchema);
