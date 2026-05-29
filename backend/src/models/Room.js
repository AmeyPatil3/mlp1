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
    select: 'fullName profileImage anonymousAlias isAnonymousEnabled'
  });
  next();
});

roomSchema.statics.expireInactiveRooms = async function(io) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Find all candidate public rooms
  const candidateRooms = await this.find({ isPrivate: false });
  
  const roomsToDelete = candidateRooms.filter(room => {
    // 1. Must have zero active participants (no one is currently in the room/chat)
    const activeCount = room.participants.filter(p => p.isActive).length;
    if (activeCount > 0) {
      return false;
    }
    
    // 2. If no one ever joined the room, expire it 1 hour after creation
    if (room.participants.length === 0) {
      return new Date(room.createdAt || room.updatedAt) < oneHourAgo;
    }
    
    // 3. Find the latest timestamp when a participant left the room
    const leftAtTimes = room.participants
      .map(p => p.leftAt ? new Date(p.leftAt).getTime() : 0)
      .filter(t => t > 0);
      
    if (leftAtTimes.length === 0) {
      // Fallback if they left but no leftAt is populated
      return new Date(room.updatedAt) < oneHourAgo;
    }
    
    const latestLeftAt = new Date(Math.max(...leftAtTimes));
    return latestLeftAt < oneHourAgo;
  });

  const roomIds = roomsToDelete.map(r => r._id);
  if (roomIds.length > 0) {
    try {
      // Delete associated chat messages
      await mongoose.model('ChatMessage').deleteMany({ room: { $in: roomIds } });
    } catch (err) {
      console.error('Failed to delete associated chat messages:', err);
    }
    // Delete the rooms
    const result = await this.deleteMany({ _id: { $in: roomIds } });

    // Broadcast room deletions globally in real-time
    if (io) {
      roomsToDelete.forEach(r => {
        io.emit('room_deleted', {
          id: r._id.toString(),
          roomId: r.roomId
        });
      });
    }

    return result;
  }

  return { acknowledged: true, deletedCount: 0 };
};

export default mongoose.model('Room', roomSchema);