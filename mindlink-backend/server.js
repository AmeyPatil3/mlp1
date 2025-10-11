
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import database connection
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import therapistRoutes from './routes/therapists.js';
import roomRoutes from './routes/rooms.js';
import appointmentRoutes from './routes/appointments.js';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import socket handler
import SocketHandler from './socket/socketHandler.js';
import Therapist from './models/Therapist.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Ensure collection indexes are in sync (fix stale unique indexes)
mongoose.connection.once('open', async () => {
  try {
    await Therapist.syncIndexes();
    console.log('Therapist indexes synchronized');
  } catch (err) {
    console.error('Failed to sync Therapist indexes:', err);
  }
});

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5001;

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize socket handler
const socketHandler = new SocketHandler(io);

// Optional: enable Redis adapter for horizontal scaling of Socket.IO
// This allows multiple backend instances to handle socket rooms concurrently
if (process.env.REDIS_URL) {
  (async () => {
    try {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const { createClient } = await import('redis');

      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis adapter enabled');
    } catch (err) {
      console.warn('Redis adapter not enabled:', err?.message || err);
    }
  })();
}

// Rate limiting - more lenient for development
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000), // 5 minutes in dev, 15 in prod
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDevelopment ? 2000 : 1000), // 2000 in dev, 1000 in prod
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({
    success: true,
    message: 'MindLink API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      state: mongoState,
      stateText: ['disconnected','connected','connecting','disconnecting'][mongoState] || 'unknown'
    }
  });
});

// Development endpoint to reset rate limits (only in development)
if (isDevelopment) {
  app.get('/dev/reset-rate-limit', (req, res) => {
    // This doesn't actually reset the rate limit, but provides info
    res.json({
      success: true,
      message: 'Rate limit info',
      rateLimit: {
        windowMs: limiter.windowMs,
        max: limiter.max,
        currentTime: new Date().toISOString()
      }
    });
  });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/appointments', appointmentRoutes);

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MindLink API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      therapists: '/api/therapists',
      rooms: '/api/rooms',
      appointments: '/api/appointments'
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 MindLink Backend Server is running!
📍 Server: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Health Check: http://localhost:${PORT}/health
🔌 Socket.IO: Enabled
📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { io, socketHandler };
