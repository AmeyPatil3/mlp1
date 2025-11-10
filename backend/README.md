# MindLink Backend API

A comprehensive backend API for the MindLink anonymous mental health support platform, built with Node.js, Express, MongoDB, and Socket.IO.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: User and therapist registration, profiles, and management
- **Real-time Communication**: WebSocket support for chat and video calls
- **Room Management**: Support rooms with participant tracking
- **Appointment System**: Booking and management of therapy sessions
- **Security**: Rate limiting, input validation, and security headers
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator
- **Environment**: dotenv

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. **Clone the repository and navigate to the backend directory**:
   ```bash
   cd mindlink-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/mindlink

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=8h

   # CORS Configuration
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5001` (or your configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/register/user` - Register a new user
- `POST /api/auth/register/therapist` - Register a new therapist
- `POST /api/auth/login` - Login user/therapist
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Deactivate account
- `GET /api/users/stats` - Get user statistics

### Therapists
- `GET /api/therapists` - Get all therapists (with filtering)
- `GET /api/therapists/:id` - Get single therapist
- `GET /api/therapists/profile` - Get therapist profile
- `PUT /api/therapists/profile` - Update therapist profile
- `GET /api/therapists/stats` - Get therapist statistics

### Rooms
- `GET /api/rooms` - Get all active rooms
- `GET /api/rooms/:id` - Get single room
- `POST /api/rooms` - Create new room
- `POST /api/rooms/:id/join` - Join room
- `POST /api/rooms/:id/leave` - Leave room
- `GET /api/rooms/history` - Get user's room history
- `GET /api/rooms/:id/messages` - Get room chat messages
- `DELETE /api/rooms/:id` - Delete room

### Appointments
- `GET /api/appointments` - Get user's appointments
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment
- `GET /api/appointments/availability/:therapistId` - Get therapist availability

## WebSocket Events

### Client to Server
- `join_room` - Join a support room
- `leave_room` - Leave a support room
- `send_message` - Send chat message
- `video_call_offer` - Initiate video call
- `video_call_answer` - Answer video call
- `ice_candidate` - WebRTC ICE candidate

### Server to Client
- `user_joined` - User joined room
- `user_left` - User left room
- `new_message` - New chat message
- `room_participants` - Current room participants
- `video_call_offer` - Incoming video call
- `video_call_answer` - Video call answer
- `ice_candidate` - WebRTC ICE candidate
- `error` - Error message

## Database Models

### User
- Basic user information and authentication
- Role-based access (user/therapist)

### Therapist
- Extended profile for therapists
- Specialties, experience, availability
- Linked to User model

### Room
- Support room management
- Participant tracking
- Room metadata and settings

### Appointment
- Therapy session scheduling
- Status tracking and management
- Linked to User and Therapist

### ChatMessage
- Real-time chat messages
- Room-based messaging
- Message metadata and reactions

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: Comprehensive request validation
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Password Hashing**: bcrypt for secure password storage

## Error Handling

- Centralized error handling middleware
- Structured error responses
- Development vs production error details
- Validation error formatting

## Development

### Project Structure
```
mindlink-backend/
├── config/
│   └── database.js          # Database connection
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Error handling
│   └── validation.js       # Input validation
├── models/
│   ├── User.js             # User model
│   ├── Therapist.js        # Therapist model
│   ├── Room.js             # Room model
│   ├── Appointment.js      # Appointment model
│   └── ChatMessage.js      # Chat message model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User routes
│   ├── therapists.js       # Therapist routes
│   ├── rooms.js            # Room routes
│   └── appointments.js     # Appointment routes
├── socket/
│   └── socketHandler.js    # WebSocket event handling
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### Adding New Features

1. **Create/Update Models**: Define data structure in `models/`
2. **Add Routes**: Create route handlers in `routes/`
3. **Add Validation**: Define validation rules in `middleware/validation.js`
4. **Update Socket Events**: Add real-time features in `socket/socketHandler.js`
5. **Test**: Use the health endpoint and test with frontend

## Testing

### Health Check
```bash
curl http://localhost:5001/health
```

### API Testing
Use tools like Postman, Insomnia, or curl to test endpoints:

```bash
# Test authentication
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"user"}'
```

## Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://your-production-db-url
JWT_SECRET=your-production-jwt-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
