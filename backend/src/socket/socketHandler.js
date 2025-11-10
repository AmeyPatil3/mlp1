import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Room from '../models/Room.js';
import ChatMessage from '../models/ChatMessage.js';
import Appointment from '../models/Appointment.js';

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.roomParticipants = new Map();
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware for socket connections
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.fullName} connected with socket ID: ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.user,
        connectedAt: new Date()
      });

      // Join room
      socket.on('join_room', async (data) => {
        try {
          const { roomId } = data;
          
          // Verify user is a participant in the room
          const room = await Room.findById(roomId);
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          const isParticipant = room.participants.some(
            p => p.user.toString() === socket.userId && p.isActive
          );

          if (!isParticipant) {
            socket.emit('error', { message: 'You are not a participant in this room' });
            return;
          }

          // If room is private, enforce appointment time window
          if (room.isPrivate) {
            const appt = await Appointment.findOne({ meetingRoomId: room._id.toString() });
            if (!appt) {
              socket.emit('error', { message: 'No appointment associated with this room' });
              return;
            }
            const now = new Date();
            const start = new Date(appt.scheduledDate);
            const end = new Date(start.getTime() + (appt.duration || 60) * 60000);
            // Allow a small early/late buffer
            const early = new Date(start.getTime() - 5 * 60000);
            const late = new Date(end.getTime() + 15 * 60000);
            if (now < early || now > late) {
              socket.emit('error', { message: 'This session is not active yet. Please join at the scheduled time.' });
              return;
            }
          }

          // Join socket room
          socket.join(roomId);
          
          // Track room participants
          if (!this.roomParticipants.has(roomId)) {
            this.roomParticipants.set(roomId, new Set());
          }
          this.roomParticipants.get(roomId).add(socket.userId);

          // Notify others in the room
          socket.to(roomId).emit('user_joined', {
            user: {
              id: socket.user._id,
              name: socket.user.fullName,
              profileImage: socket.user.profileImage
            },
            participantsCount: this.roomParticipants.get(roomId).size
          });

          // Send current participants to the new user
          const currentParticipants = Array.from(this.roomParticipants.get(roomId))
            .filter(userId => userId !== socket.userId);
          
          socket.emit('room_participants', {
            selfId: socket.user._id.toString(),
            participants: currentParticipants.map(userId => {
              const userData = this.connectedUsers.get(userId);
              return userData ? {
                id: userData.user._id.toString(),
                name: userData.user.fullName,
                profileImage: userData.user.profileImage
              } : null;
            }).filter(Boolean),
            participantsCount: this.roomParticipants.get(roomId).size
          });

          console.log(`User ${socket.user.fullName} joined room ${roomId}`);
        } catch (error) {
          console.error('Join room error:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Leave room
      socket.on('leave_room', (data) => {
        try {
          const { roomId } = data;
          
          socket.leave(roomId);
          
          if (this.roomParticipants.has(roomId)) {
            this.roomParticipants.get(roomId).delete(socket.userId);
            
            // Notify others in the room
            socket.to(roomId).emit('user_left', {
              user: {
                id: socket.user._id,
                name: socket.user.fullName
              },
              participantsCount: this.roomParticipants.get(roomId).size
            });

            // Clean up empty room
            if (this.roomParticipants.get(roomId).size === 0) {
              this.roomParticipants.delete(roomId);
            }
          }

          console.log(`User ${socket.user.fullName} left room ${roomId}`);
        } catch (error) {
          console.error('Leave room error:', error);
          socket.emit('error', { message: 'Failed to leave room' });
        }
      });

      // Send chat message
      socket.on('send_message', async (data) => {
        try {
          const { roomId, message, messageType = 'text' } = data;
          
          if (!message || message.trim().length === 0) {
            socket.emit('error', { message: 'Message cannot be empty' });
            return;
          }

          // Verify user is in the room
          if (!this.roomParticipants.has(roomId) || 
              !this.roomParticipants.get(roomId).has(socket.userId)) {
            socket.emit('error', { message: 'You are not in this room' });
            return;
          }

          // Save message to database
          const chatMessage = await ChatMessage.create({
            room: roomId,
            sender: socket.userId,
            message: message.trim(),
            messageType
          });

          // Broadcast message to all users in the room
          this.io.to(roomId).emit('new_message', {
            id: chatMessage._id,
            sender: {
              id: socket.user._id,
              name: socket.user.fullName,
              profileImage: socket.user.profileImage,
              role: socket.user.role
            },
            message: chatMessage.message,
            messageType: chatMessage.messageType,
            createdAt: chatMessage.createdAt
          });

          console.log(`Message sent in room ${roomId} by ${socket.user.fullName}`);
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Video call events
      socket.on('video_call_offer', (data) => {
        const { roomId, offer, targetUserId } = data;
        
        if (targetUserId) {
          // Send to specific user
          const targetUser = this.connectedUsers.get(targetUserId);
          if (targetUser) {
            this.io.to(targetUser.socketId).emit('video_call_offer', {
              from: {
                id: socket.user._id,
                name: socket.user.fullName
              },
              offer
            });
          }
        } else {
          // Broadcast to room
          socket.to(roomId).emit('video_call_offer', {
            from: {
              id: socket.user._id,
              name: socket.user.fullName
            },
            offer
          });
        }
      });

      socket.on('video_call_answer', (data) => {
        const { roomId, answer, targetUserId } = data;
        
        if (targetUserId) {
          const targetUser = this.connectedUsers.get(targetUserId);
          if (targetUser) {
            this.io.to(targetUser.socketId).emit('video_call_answer', {
              from: {
                id: socket.user._id,
                name: socket.user.fullName
              },
              answer
            });
          }
        } else {
          socket.to(roomId).emit('video_call_answer', {
            from: {
              id: socket.user._id,
              name: socket.user.fullName
            },
            answer
          });
        }
      });

      socket.on('ice_candidate', (data) => {
        const { roomId, candidate, targetUserId } = data;
        
        if (targetUserId) {
          const targetUser = this.connectedUsers.get(targetUserId);
          if (targetUser) {
            this.io.to(targetUser.socketId).emit('ice_candidate', {
              from: {
                id: socket.user._id,
                name: socket.user.fullName
              },
              candidate
            });
          }
        } else {
          socket.to(roomId).emit('ice_candidate', {
            from: {
              id: socket.user._id,
              name: socket.user.fullName
            },
            candidate
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.fullName} disconnected`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.userId);
        
        // Remove from all rooms
        this.roomParticipants.forEach((participants, roomId) => {
          if (participants.has(socket.userId)) {
            participants.delete(socket.userId);
            
            // Notify others in the room
            socket.to(roomId).emit('user_left', {
              user: {
                id: socket.user._id,
                name: socket.user.fullName
              },
              participantsCount: participants.size
            });

            // Clean up empty room
            if (participants.size === 0) {
              this.roomParticipants.delete(roomId);
            }
          }
        });
      });
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get room participants count
  getRoomParticipantsCount(roomId) {
    return this.roomParticipants.has(roomId) ? 
           this.roomParticipants.get(roomId).size : 0;
  }

  // Broadcast to all users
  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Broadcast to specific room
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
    }
  }
}

export default SocketHandler;
