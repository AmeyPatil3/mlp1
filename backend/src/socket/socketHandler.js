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
    this.roomStickies = new Map();
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

      // Store user connection mapped by socket.id to allow multiple browser tabs/sessions per user
      this.connectedUsers.set(socket.id, {
        userId: socket.userId,
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

          if (!room.isActive) {
            socket.emit('error', { message: 'Room is no longer active' });
            return;
          }

          const participant = room.participants.find(
            p => {
              const pId = p.user && p.user._id ? p.user._id.toString() : p.user?.toString();
              return pId === socket.userId;
            }
          );

          if (!participant) {
            socket.emit('error', { message: 'You are not a participant in this room' });
            return;
          }

          // If participant is marked inactive in database, reactivate them
          if (!participant.isActive) {
            try {
              await Room.updateOne(
                { _id: roomId, "participants.user": socket.userId },
                { $set: { "participants.$.isActive": true, "participants.$.joinedAt": new Date() } }
              );
            } catch (dbErr) {
              console.error('Failed to reactivate participant in database on socket join:', dbErr);
            }
          }

          // If room is private and not a persistent chat, enforce appointment time window
          if (room.isPrivate && !room.roomId.startsWith('chat-')) {
            const appt = await Appointment.findOne({ meetingRoomId: room._id.toString() });
            if (!appt) {
              socket.emit('error', { message: 'No appointment associated with this room' });
              return;
            }
            const now = new Date();
            const start = new Date(appt.scheduledDate);
            const end = new Date(start.getTime() + (appt.duration || 60) * 60000);
            // Allow a small early/late buffer (bypass or expand to 24 hours in development for seamless testing)
            const isDev = process.env.NODE_ENV === 'development';
            const early = new Date(start.getTime() - (isDev ? 24 * 60 * 60 * 1000 : 5 * 60000));
            const late = new Date(end.getTime() + (isDev ? 24 * 60 * 60 * 1000 : 15 * 60000));
            if (!isDev && (now < early || now > late)) {
              socket.emit('error', { message: 'This session is not active yet. Please join at the scheduled time.' });
              return;
            }
          }

          // Join socket room
          socket.join(roomId);

          // Track room participants using socket.id
          if (!this.roomParticipants.has(roomId)) {
            this.roomParticipants.set(roomId, new Set());
          }
          this.roomParticipants.get(roomId).add(socket.id);

          // Initialize and sync stickies if present
          if (!this.roomStickies.has(roomId)) {
            this.roomStickies.set(roomId, new Map());
          }
          const stickiesMap = this.roomStickies.get(roomId);
          socket.emit('sticky_sync', Array.from(stickiesMap.values()));

          // Broadcast new participant count globally for the live rooms dashboard
          this.io.emit('room_count_update', {
            roomId,
            participantsCount: this.roomParticipants.get(roomId).size
          });

          const displayName = (!room.isPrivate && socket.user.isAnonymousEnabled && socket.user.anonymousAlias)
            ? socket.user.anonymousAlias
            : socket.user.fullName;

          // Notify others in the room (send connection's socket.id)
          socket.to(roomId).emit('user_joined', {
            user: {
              id: socket.id,
              name: displayName,
              profileImage: socket.user.profileImage
            },
            participantsCount: this.roomParticipants.get(roomId).size
          });

          // Send current participants to the new user
          const currentParticipants = Array.from(this.roomParticipants.get(roomId))
            .filter(socketId => socketId !== socket.id);

          socket.emit('room_participants', {
            selfId: socket.id,
            participants: currentParticipants.map(socketId => {
              const userData = this.connectedUsers.get(socketId);
              if (!userData) return null;
              const name = (!room.isPrivate && userData.user.isAnonymousEnabled && userData.user.anonymousAlias)
                ? userData.user.anonymousAlias
                : userData.user.fullName;
              return {
                id: socketId,
                name: name,
                profileImage: userData.user.profileImage
              };
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
      socket.on('leave_room', async (data) => {
        try {
          const { roomId } = data;

          socket.leave(roomId);

          if (this.roomParticipants.has(roomId)) {
            this.roomParticipants.get(roomId).delete(socket.id);

            const room = await Room.findById(roomId);
            const isPrivate = room ? room.isPrivate : false;
            const displayName = (!isPrivate && socket.user.isAnonymousEnabled && socket.user.anonymousAlias)
              ? socket.user.anonymousAlias
              : socket.user.fullName;

            // Notify others in the room
            socket.to(roomId).emit('user_left', {
              user: {
                id: socket.id,
                name: displayName
              },
              participantsCount: this.roomParticipants.get(roomId).size
            });

            // Clean up empty room
            if (this.roomParticipants.get(roomId).size === 0) {
              this.roomParticipants.delete(roomId);
              this.roomStickies.delete(roomId);
            }
          }

          // Broadcast new participant count globally for the live rooms dashboard
          this.io.emit('room_count_update', {
            roomId,
            participantsCount: this.roomParticipants.has(roomId) ? this.roomParticipants.get(roomId).size : 0
          });

          // Sync database only if the user has NO other active socket connections remaining in this room
          const participants = this.roomParticipants.get(roomId) || new Set();
          const hasOtherConnections = Array.from(participants).some(socketId => {
            const conn = this.connectedUsers.get(socketId);
            return conn && conn.userId === socket.userId;
          });

          if (!hasOtherConnections) {
            await Room.updateOne(
              { _id: roomId, "participants.user": socket.userId, "participants.isActive": true },
              {
                $set: {
                  "participants.$.isActive": false,
                  "participants.$.leftAt": new Date()
                }
              }
            );
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
            !this.roomParticipants.get(roomId).has(socket.id)) {
            socket.emit('error', { message: 'You are not in this room' });
            return;
          }

          // Save message to database associated with their userId
          const chatMessage = await ChatMessage.create({
            room: roomId,
            sender: socket.userId,
            message: message.trim(),
            messageType
          });

          const room = await Room.findById(roomId);
          const isPrivate = room ? room.isPrivate : false;
          const displayName = (!isPrivate && socket.user.isAnonymousEnabled && socket.user.anonymousAlias)
            ? socket.user.anonymousAlias
            : socket.user.fullName;

          // Broadcast message to all users in the room
          this.io.to(roomId).emit('new_message', {
            id: chatMessage._id,
            room: roomId,
            sender: {
              id: socket.id,
              _id: socket.userId,
              name: displayName,
              profileImage: socket.user.profileImage,
              role: socket.user.role
            },
            message: chatMessage.message,
            messageType: chatMessage.messageType,
            createdAt: chatMessage.createdAt
          });

          // Send real-time notification to other room participants (e.g. therapist)
          if (room && room.participants) {
            for (const participant of room.participants) {
              const pUser = participant.user;
              if (!pUser) continue;
              const pId = pUser._id ? pUser._id.toString() : pUser.toString();
              
              if (pId !== socket.userId) {
                this.sendToUser(pId, 'new_message_notification', {
                  roomId: roomId,
                  roomName: room.name,
                  sender: {
                    _id: socket.userId,
                    name: displayName,
                    profileImage: socket.user.profileImage,
                    role: socket.user.role
                  },
                  message: chatMessage.message,
                  messageType: chatMessage.messageType,
                  createdAt: chatMessage.createdAt
                });
              }
            }
          }

          console.log(`Message sent in room ${roomId} by ${socket.user.fullName}`);
        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Video call events: signaling is routed via direct socket.id (transferred as targetUserId/targetSocketId)
      socket.on('video_call_offer', (data) => {
        const { roomId, offer, targetUserId } = data;

        if (targetUserId) {
          // Send direct signal to the target socket.id
          this.io.to(targetUserId).emit('video_call_offer', {
            from: {
              id: socket.id,
              name: socket.user.fullName
            },
            offer
          });
        } else {
          // Broadcast to room
          socket.to(roomId).emit('video_call_offer', {
            from: {
              id: socket.id,
              name: socket.user.fullName
            },
            offer
          });
        }
      });

      socket.on('video_call_answer', (data) => {
        const { roomId, answer, targetUserId } = data;

        if (targetUserId) {
          this.io.to(targetUserId).emit('video_call_answer', {
            from: {
              id: socket.id,
              name: socket.user.fullName
            },
            answer
          });
        } else {
          socket.to(roomId).emit('video_call_answer', {
            from: {
              id: socket.id,
              name: socket.user.fullName
            },
            answer
          });
        }
      });

      socket.on('ice_candidate', (data) => {
        const { roomId, candidate, targetUserId } = data;

        if (targetUserId) {
          this.io.to(targetUserId).emit('ice_candidate', {
            from: {
              id: socket.id,
              name: socket.user.fullName
            },
            candidate
          });
        } else {
          socket.to(roomId).emit('ice_candidate', {
            from: {
              id: socket.id,
              name: socket.user.fullName
            },
            candidate
          });
        }
      });
      // Real-time support room reaction broadcasts
      socket.on('send_reaction', (data) => {
        try {
          const { roomId, reactionType } = data;

          // Verify user is in the room
          if (this.roomParticipants.has(roomId) &&
            this.roomParticipants.get(roomId).has(socket.id)) {
            // Broadcast the reaction to all other clients in the room
            socket.to(roomId).emit('receive_reaction', {
              senderId: socket.id,
              reactionType
            });
          }
        } catch (error) {
          console.error('Reaction broadcast error:', error);
        }
      });

      // Collaborative Sticky Note Events
      socket.on('sticky_create', (data) => {
        try {
          const { roomId, sticky } = data;
          if (!this.roomStickies.has(roomId)) {
            this.roomStickies.set(roomId, new Map());
          }
          this.roomStickies.get(roomId).set(sticky.id, sticky);
          // Broadcast to all other connections in the room
          socket.to(roomId).emit('sticky_created', sticky);
        } catch (error) {
          console.error('Sticky create error:', error);
        }
      });

      socket.on('sticky_move', (data) => {
        try {
          const { roomId, stickyId, x, y } = data;
          if (this.roomStickies.has(roomId)) {
            const stickies = this.roomStickies.get(roomId);
            if (stickies.has(stickyId)) {
              const sticky = stickies.get(stickyId);
              sticky.x = x;
              sticky.y = y;
              // Broadcast to other connections in the room
              socket.to(roomId).emit('sticky_moved', { id: stickyId, x, y });
            }
          }
        } catch (error) {
          console.error('Sticky move error:', error);
        }
      });

      socket.on('sticky_heart', (data) => {
        try {
          const { roomId, stickyId } = data;
          if (this.roomStickies.has(roomId)) {
            const stickies = this.roomStickies.get(roomId);
            if (stickies.has(stickyId)) {
              const sticky = stickies.get(stickyId);
              sticky.heartsCount = (sticky.heartsCount || 0) + 1;
              // Broadcast the heart count globally
              this.io.to(roomId).emit('sticky_hearted', { id: stickyId, heartsCount: sticky.heartsCount });
            }
          }
        } catch (error) {
          console.error('Sticky heart error:', error);
        }
      });

      socket.on('sticky_delete', (data) => {
        try {
          const { roomId, stickyId } = data;
          if (this.roomStickies.has(roomId)) {
            const stickies = this.roomStickies.get(roomId);
            if (stickies.has(stickyId)) {
              stickies.delete(stickyId);
              // Broadcast deletion to everyone
              this.io.to(roomId).emit('sticky_deleted', { id: stickyId });
            }
          }
        } catch (error) {
          console.error('Sticky delete error:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.fullName} disconnected`);

        // Remove from connected users
        this.connectedUsers.delete(socket.id);

        // Remove from all rooms
        this.roomParticipants.forEach(async (participants, roomId) => {
          if (participants.has(socket.id)) {
            participants.delete(socket.id);

            const room = await Room.findById(roomId);
            const isPrivate = room ? room.isPrivate : false;
            const displayName = (!isPrivate && socket.user.isAnonymousEnabled && socket.user.anonymousAlias)
              ? socket.user.anonymousAlias
              : socket.user.fullName;

            // Notify others in the room
            socket.to(roomId).emit('user_left', {
              user: {
                id: socket.id,
                name: displayName
              },
              participantsCount: participants.size
            });

            // Clean up empty room
            if (participants.size === 0) {
              this.roomParticipants.delete(roomId);
              this.roomStickies.delete(roomId);
            }

            // Broadcast new participant count globally for the live rooms dashboard
            this.io.emit('room_count_update', {
              roomId,
              participantsCount: participants.size
            });

            // Sync database only if the user has NO other active socket connections remaining in this room
            const hasOtherConnections = Array.from(participants).some(socketId => {
              const conn = this.connectedUsers.get(socketId);
              return conn && conn.userId === socket.userId;
            });

            if (!hasOtherConnections) {
              try {
                await Room.updateOne(
                  { _id: roomId, "participants.user": socket.userId, "participants.isActive": true },
                  {
                    $set: {
                      "participants.$.isActive": false,
                      "participants.$.leftAt": new Date()
                    }
                  }
                );
              } catch (dbErr) {
                console.error('Failed to update participant in database on disconnect:', dbErr);
              }
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
    // Legacy support: finding any connection matching the userId
    for (const [socketId, conn] of this.connectedUsers.entries()) {
      if (conn.userId === userId) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }
}


export default SocketHandler;
