import express from 'express';
import Room from '../models/Room.js';
import ChatMessage from '../models/ChatMessage.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRoomCreation } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// @desc    Get unread message count for current user since a timestamp
// @route   GET /api/rooms/unread-count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find rooms where the user is an active participant
    const userRooms = await Room.find({
      participants: {
        $elemMatch: { user: req.user._id, isActive: true }
      },
      isActive: true
    }).select('_id');

    const roomIds = userRooms.map(r => r._id);

    if (roomIds.length === 0) {
      return res.json({ success: true, unreadCount: 0 });
    }

    const unreadCount = await ChatMessage.countDocuments({
      room: { $in: roomIds },
      sender: { $ne: req.user._id },
      createdAt: { $gte: sinceDate }
    });

    res.json({ success: true, unreadCount });
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
    const { page = 1, limit = 10, search, tags } = req.query;
    
    let filter = { isActive: true };
    
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

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

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

    res.json({
      success: true,
      room
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

    // Check if user is already in the room
    const existingParticipant = room.participants.find(
      p => p.user.toString() === req.user._id.toString() && p.isActive
    );

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'You are already in this room'
      });
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
      p => p.user.toString() === req.user._id.toString() && p.isActive
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
      p => p.user.toString() === req.user._id.toString() && p.isActive
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

    res.json({
      success: true,
      count: messages.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      messages: messages.reverse() // Return in chronological order
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
