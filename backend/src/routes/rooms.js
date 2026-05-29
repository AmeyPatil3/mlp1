import express from 'express';
import Room from '../models/Room.js';
import ChatMessage from '../models/ChatMessage.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRoomCreation } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Get unread message count for current user
// @route   GET /api/rooms/unread-count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userIdStr = req.user._id.toString();

    // Find all active rooms where the user is a participant (online or offline)
    const userRooms = await Room.find({
      'participants.user': req.user._id,
      isActive: true
    });

    if (userRooms.length === 0) {
      return res.json({ success: true, unreadCount: 0 });
    }

    let unreadCount = 0;
    const roomUnreadCounts = {};

    for (const room of userRooms) {
      // Find the current user's participant record
      const participant = room.participants.find(p => {
        const pId = p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
        return pId === userIdStr;
      });

      if (!participant) continue;

      // If the user is currently actively online in the room, they are reading messages real-time
      if (participant.isActive) {
        roomUnreadCounts[room._id.toString()] = 0;
        roomUnreadCounts[room.roomId] = 0;
        continue;
      }

      // Count messages sent by others in this room since the user last left
      const lastSeenDate = participant.leftAt || participant.joinedAt || new Date(0);

      const count = await ChatMessage.countDocuments({
        room: room._id,
        sender: { $ne: req.user._id },
        createdAt: { $gt: lastSeenDate }
      });

      unreadCount += count;
      roomUnreadCounts[room._id.toString()] = count;
      roomUnreadCounts[room.roomId] = count;
    }

    res.json({ success: true, unreadCount, roomUnreadCounts });
  } catch (error) {
    console.error('Get unread message count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread message count' });
  }
});

// @desc    Get all active rooms
// @route   GET /api/rooms
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Auto-expire public rooms with no active participants after 24 hours
    await Room.expireInactiveRooms(req.app.get('io'));

    const { page = 1, limit = 10, search, tags } = req.query;
    
    // Public listing should exclude private one-on-one therapy rooms
    let filter = { isActive: true, isPrivate: false };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    const rooms = await Room.find(filter)
      .sort({ participantsCount: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Room.countDocuments(filter);

    res.json({
      success: true,
      count: rooms.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      rooms
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rooms'
    });
  }
});

// Define static routes first to avoid ":id" capturing them
// @desc    Get user's room history
// @route   GET /api/rooms/history
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Return rooms the user has participated in (regardless of current room active state)
    const rooms = await Room.find({ 'participants.user': req.user._id })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Room.countDocuments({ 'participants.user': req.user._id });

    res.json({
      success: true,
      count: rooms.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      rooms
    });
  } catch (error) {
    console.error('Get room history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room history'
    });
  }
});

// @desc    Get or create private chat room between two users
// @route   POST /api/rooms/private-chat
// @access  Private
router.post('/private-chat', authenticateToken, async (req, res) => {
  try {
    const { partnerId } = req.body;
    
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    const u1 = req.user._id.toString();
    const u2 = partnerId.toString();
    
    // Create deterministic roomId to ensure only one persistent chat exists per pair
    const sortedIds = [u1, u2].sort();
    const deterministicRoomId = `chat-${sortedIds[0]}-${sortedIds[1]}`;

    let room = await Room.findOne({ roomId: deterministicRoomId });

    if (!room) {
      // Find partner details to create a nice name
      const partner = await mongoose.model('User').findById(partnerId);
      const partnerName = partner ? partner.fullName : 'Partner';

      room = await Room.create({
        roomId: deterministicRoomId,
        name: `Private Chat: ${req.user.fullName} & ${partnerName}`,
        topic: 'One-on-One Chat',
        isPrivate: true,
        createdBy: req.user._id,
        participants: [
          { user: req.user._id, isActive: true, joinedAt: new Date() },
          { user: partnerId, isActive: true, joinedAt: new Date() }
        ]
      });

      // Populate participants for the response
      room = await Room.findById(room._id);
    } else {
      // Ensure both are marked active
      let modified = false;
      room.participants.forEach(p => {
        const pId = p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
        if ((pId === u1 || pId === u2) && !p.isActive) {
          p.isActive = true;
          p.joinedAt = new Date();
          modified = true;
        }
      });
      if (modified) {
        await room.save();
      }
    }

    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Private chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access private chat'
    });
  }
});

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Auto-expire public rooms with no active participants after 24 hours
    await Room.expireInactiveRooms(req.app.get('io'));

    // Support looking up by either MongoDB ObjectId or UUID string
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const room = await Room.findOne({
      $or: [
        ...(isObjectId ? [{ _id: req.params.id }] : []),
        { roomId: req.params.id }
      ]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Room is no longer active'
      });
    }

    const roomObj = room.toJSON();
    if (!roomObj.isPrivate && roomObj.participants) {
      roomObj.participants = roomObj.participants.map(p => {
        if (p.user && p.user.isAnonymousEnabled) {
          p.user.fullName = p.user.anonymousAlias || 'Anonymous';
        }
        return p;
      });
    }

    res.json({
      success: true,
      room: roomObj
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room'
    });
  }
});

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private
router.post('/', authenticateToken, validateRoomCreation, async (req, res) => {
  try {
    const { name, topic, description, maxParticipants, tags, isPrivate } = req.body;
    
    const room = await Room.create({
      roomId: uuidv4(),
      name,
      topic,
      description,
      maxParticipants: maxParticipants || 10,
      tags: tags || [],
      isPrivate: isPrivate || false,
      createdBy: req.user._id,
      participants: [{
        user: req.user._id,
        joinedAt: new Date(),
        isActive: true
      }]
    });

    // Broadcast room creation via Socket.IO if it is a public room
    const io = req.app.get('io');
    if (io && !room.isPrivate) {
      io.emit('room_created', room);
    }

    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room'
    });
  }
});

// @desc    Join room
// @route   POST /api/rooms/:id/join
// @access  Private
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    // Auto-expire public rooms with no active participants after 24 hours
    await Room.expireInactiveRooms(req.app.get('io'));

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Room is no longer active'
      });
    }

    // Check if user is already in the room's participants list (active or inactive)
    const existingParticipantIndex = room.participants.findIndex(
      p => {
        const pId = p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
        return pId === req.user._id.toString();
      }
    );

    // If room is private, restrict joining to pre-added participants only
    if (room.isPrivate) {
      if (existingParticipantIndex === -1) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not a participant in this private room'
        });
      }

      const existing = room.participants[existingParticipantIndex];
      if (!existing.isActive) {
        existing.isActive = true;
        existing.joinedAt = new Date();
        await room.save();
      }

      return res.json({
        success: true,
        message: 'Successfully joined private room',
        room
      });
    }

    if (existingParticipantIndex !== -1) {
      const existing = room.participants[existingParticipantIndex];
      if (existing.isActive) {
        return res.status(400).json({
          success: false,
          message: 'You are already in this room'
        });
      } else {
        // Reactivate existing participation
        existing.isActive = true;
        existing.joinedAt = new Date();
        await room.save();
        return res.json({
          success: true,
          message: 'Successfully rejoined room',
          room
        });
      }
    }

    // Check room capacity
    const activeParticipants = room.participants.filter(p => p.isActive).length;
    if (activeParticipants >= room.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Room is at maximum capacity'
      });
    }

    // Add user to room
    room.participants.push({
      user: req.user._id,
      joinedAt: new Date(),
      isActive: true
    });

    await room.save();

    res.json({
      success: true,
      message: 'Successfully joined room',
      room
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
});

// @desc    Leave room
// @route   POST /api/rooms/:id/leave
// @access  Private
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Find and deactivate user's participation
    const participantIndex = room.participants.findIndex(
      p => {
        const pId = p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
        return pId === req.user._id.toString() && p.isActive;
      }
    );

    if (participantIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not in this room'
      });
    }

    room.participants[participantIndex].isActive = false;
    room.participants[participantIndex].leftAt = new Date();
    await room.save();

    res.json({
      success: true,
      message: 'Successfully left room'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room'
    });
  }
});

// @desc    Get user's room history
// @route   GET /api/rooms/history
// @access  Private (User only)
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Return rooms the user has participated in (regardless of current room active state)
    const rooms = await Room.find({ 'participants.user': req.user._id })
    .sort({ updatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Room.countDocuments({ 'participants.user': req.user._id });

    res.json({
      success: true,
      count: rooms.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      rooms
    });
  } catch (error) {
    console.error('Get room history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room history'
    });
  }
});

// @desc    Get room chat messages
// @route   GET /api/rooms/:id/messages
// @access  Private
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Check if user is in the room
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    const isParticipant = room.participants.some(
      p => {
        const pId = p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
        return pId === req.user._id.toString();
      }
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this room'
      });
    }

    const messages = await ChatMessage.find({ room: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ChatMessage.countDocuments({ room: req.params.id });

    // Map sender names dynamically based on anonymity shield in public rooms
    const mappedMessages = messages.map(msg => {
      const msgObj = msg.toJSON();
      if (!room.isPrivate && msgObj.sender && msgObj.sender.isAnonymousEnabled) {
        msgObj.sender.fullName = msgObj.sender.anonymousAlias || 'Anonymous';
      }
      return msgObj;
    });

    res.json({
      success: true,
      count: mappedMessages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      messages: mappedMessages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room messages'
    });
  }
});

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Room creator only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is the creator
    if (room.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the room creator can delete the room'
      });
    }

    // Deactivate room instead of deleting
    room.isActive = false;
    await room.save();

    // Broadcast room deletion globally via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('room_deleted', {
        id: room._id.toString(),
        roomId: room.roomId
      });
    }

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room'
    });
  }
});

export default router;
