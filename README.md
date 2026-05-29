

# MindLink: Anonymous Mental Health Support

A full-stack application for anonymous mental health support with peer-to-peer support rooms and therapist matching.

## 🏗️ Project Structure

```
mlp/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── pages/       # Page components
│   │   │   └── ui/          # UI components
│   │   ├── context/          # React context (Auth)
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   ├── package.json
│   └── vite.config.ts
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── models/           # Database models
│   │   ├── middleware/       # Express middleware
│   │   ├── config/          # Configuration files
│   │   └── socket/           # Socket.io handlers
│   ├── scripts/             # Backend scripts
│   └── package.json
├── shared/                  # Shared resources
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utility functions
├── docs/                    # Documentation
│   ├── SETUP.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── scripts/                 # Build and setup scripts
│   ├── setup.sh
│   └── build.sh
└── package.json             # Root package.json with workspaces
```

## 🚀 Quick Start

### Automated Setup

```bash
# Clone the repository
git clone <repository-url>
cd mlp

# Run the automated setup script
npm run setup

# Start both frontend and backend
npm run dev:all
```

### Manual Setup

**Prerequisites:** Node.js (v16+), MongoDB

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   - Copy `frontend/env.template` to `frontend/.env`
   - Copy `backend/env.example` to `backend/.env`
   - Update the values in both files

3. **Start the application:**
   ```bash
   # Start backend
   npm run backend:dev

   # In another terminal, start frontend
   npm run frontend:dev
   ```

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Detailed setup instructions
- **[API Documentation](docs/API.md)** - Backend API reference
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment

## 🛠️ Available Scripts

### Root Level
- `npm run setup` - Automated setup script
- `npm run dev:all` - Start both frontend and backend
- `npm run build:all` - Build both frontend and backend
- `npm run install:all` - Install all dependencies

### Frontend
- `npm run frontend:dev` - Start frontend development server
- `npm run frontend:build` - Build frontend for production
- `npm run frontend:preview` - Preview production build

### Backend
- `npm run backend:dev` - Start backend development server
- `npm run backend:start` - Start backend production server
- `npm run backend:build` - Build backend (if applicable)
