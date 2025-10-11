# MindLink Project Setup Instructions

This guide will help you set up and run the complete MindLink application with both frontend and backend components.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (local installation or MongoDB Atlas account) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** (for version control)

## Project Structure

```
mlp/
├── components/           # React frontend components
├── context/             # React context providers
├── services/            # API service layer
├── mindlink-backend/    # Node.js backend API
├── types.ts            # TypeScript type definitions
├── package.json        # Frontend dependencies
└── README.md           # Project documentation
```

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd mindlink-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
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

### 4. Start MongoDB
**Option A: Local MongoDB**
```bash
# Start MongoDB service
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
- Create a cluster and get your connection string
- Update `MONGODB_URI` in your `.env` file

### 5. Seed the Database (Optional)
```bash
npm run seed
```
This will create sample users, therapists, and rooms for testing.

### 6. Start the Backend Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:5001`

## Frontend Setup

### 1. Navigate to Project Root
```bash
cd ..  # Go back to the main project directory
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Frontend Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Testing the Setup

### 1. Backend Health Check
Visit `http://localhost:5001/health` in your browser or run:
```bash
curl http://localhost:5001/health
```

### 2. API Endpoints
Visit `http://localhost:5001/api` to see available endpoints.

### 3. Frontend Application
Open `http://localhost:5173` in your browser to access the MindLink application.

## Sample Accounts (After Seeding)

### Users
- **Alex Johnson**: alex@example.com / password123
- **Sarah Wilson**: sarah@example.com / password123
- **Mike Chen**: mike@example.com / password123

### Therapists
- **Dr. Evelyn Reed**: evelyn.reed@example.com / password123
- **Dr. Ben Carter**: ben.carter@example.com / password123
- **Dr. Olivia Chen**: olivia.chen@example.com / password123

## Development Workflow

### 1. Start Both Servers
```bash
# Terminal 1: Backend
cd mindlink-backend
npm run dev

# Terminal 2: Frontend
cd ..
npm run dev
```

### 2. Making Changes
- **Frontend changes**: Hot reload is enabled, changes will appear automatically
- **Backend changes**: Nodemon will restart the server automatically
- **Database changes**: Restart the backend server after model changes

### 3. Testing API Endpoints
Use tools like Postman, Insomnia, or curl:

```bash
# Test user login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alex@example.com","password":"password123","role":"user"}'

# Test getting therapists
curl -X GET http://localhost:5001/api/therapists \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running locally or check your MongoDB Atlas connection string.

**2. Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Change the PORT in your `.env` file or kill the process using the port.

**3. CORS Errors**
```
Access to fetch at 'http://localhost:5001/api/auth/login' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution**: Ensure `FRONTEND_URL` in your `.env` file matches your frontend URL.

**4. JWT Token Errors**
```
Error: jwt malformed
```
**Solution**: Check that your JWT_SECRET is set correctly in the `.env` file.

### Logs and Debugging

**Backend Logs**: Check the terminal where you ran `npm run dev`
**Frontend Logs**: Check the browser console (F12)
**Database Logs**: Check MongoDB logs or Atlas dashboard

## Production Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in your `.env` file
2. Use a production MongoDB instance
3. Set a strong `JWT_SECRET`
4. Configure proper CORS origins
5. Use a process manager like PM2

### Frontend Deployment
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder to a static hosting service
3. Update the backend `FRONTEND_URL` to match your production domain

## Additional Resources

- [Backend API Documentation](./mindlink-backend/README.md)
- [Frontend Component Documentation](./README.md)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://reactjs.org/)

## Support

If you encounter any issues during setup:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Ensure all prerequisites are installed
4. Verify environment variables are set correctly
5. Check that both servers are running on the correct ports

For additional help, refer to the individual README files in each directory or create an issue in the project repository.
