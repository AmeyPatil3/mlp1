<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MindLink: Anonymous Mental Health Support

A full-stack application for anonymous mental health support with peer-to-peer support rooms and therapist matching.

## Project Structure

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
│   ├── package.json
│   └── vite.config.ts
├── mindlink-backend/         # Node.js backend API
│   ├── routes/              # API routes
│   ├── models/              # Database models
│   ├── middleware/          # Express middleware
│   └── socket/              # Socket.io handlers
└── package.json             # Root package.json with workspaces
```

## Run Locally

**Prerequisites:** Node.js

### Frontend Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in your environment variables

3. Run the frontend:
   ```bash
   npm run frontend:dev
   # or
   cd frontend && npm run dev
   ```

### Backend Development

1. Navigate to the backend directory:
   ```bash
   cd mindlink-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (copy from env.example)

4. Run the backend:
   ```bash
   npm start
   ```

### Full Stack Development

To run both frontend and backend simultaneously, you can use the workspace commands:

```bash
# Install all dependencies
npm install

# Run frontend in development mode
npm run frontend:dev

# In another terminal, run the backend
cd mindlink-backend && npm start
```
