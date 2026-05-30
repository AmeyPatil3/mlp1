<div align="center">
  <img width="120px" height="120px" alt="MindLink Logo" src="frontend/public/logo.png" />
  <h1>🧠 MindLink</h1>
  <h3>Anonymous Mental Health & Counseling Platform</h3>
  <p><i>A premium, secure, and real-time wellbeing platform designed for client anonymity, clinical documentation excellence, and collaborative peer healing.</i></p>

  [![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](#)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-24.0-339933?logo=nodedotjs&logoColor=white)](#)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](#)
  [![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socketdotio&logoColor=white)](#)
  [![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI_Buddy-8E75C8?logo=googlegemini&logoColor=white)](#)
</div>

---

> [!IMPORTANT]
> **MindLink is built with a strict anonymity-first design.** Clients can toggle secure pseudonyms and enter chat loops or AI counseling spaces without exposing their real-world identities, ensuring a psychologically safe environment.

---

## ✨ Primary Core Features

### 💬 1. Real-Time Chat & Glassmorphic Notifications
* **WS Signaling:** Bi-directional Socket.IO integration syncing messaging screens instantly.
* **Pulsing Indicators:** Real-time unread indicators next to **Messages** sidebar navigations in both client and therapist portals, auto-clearing upon route entry.
* **Glassmorphic Toasts:** Beautiful sliding, out-of-room glassmorphic toast notification cards on the Therapist Dashboard, enabling direct navigation and instant response loops.

### 🧠 2. CBT AI Companion (CBT Buddy)
* **Empathetic AI:** An interactive conversational companion running on the optimized `gemini-2.5-flash` model.
* **Thought Reframing:** Guides users through Cognitive Behavioral Therapy (CBT) reflection principles, helping them document thoughts, classify cognitive distortions (like catastrophizing), and construct positive cognitive schemas.

### 📸 3. Camera-Based Facial Mood Checker
* **Express Analyzer:** Streams local camera frames, captures facial expressions, and forwards base64 snapshots to Gemini.
* **Actionable Tips:** Dynamically evaluates current emotional states (Happy, Anxious, Sad, Neutral, etc.) and provides 3-5 positive, custom well-being suggestions.

### 📝 4. Single-Click SOAP Notes Generator
* **Therapist Co-Pilot:** Instantly drafts structured, professional clinical SOAP notes (Subjective, Objective, Assessment, Plan) based on a therapist's raw session bullet points using Gemini's structured JSON schemas.

### 📹 5. WebRTC Peer Counseling Rooms & Canvas
* **Decoupled Handshakes:** High-fidelity video/audio rooms managed by `simple-peer` and powered by Twilio/Google STUN and Metered.live TURN server fallback relays.
* **Shared Workspace:** Includes a WebSocket-synchronized real-time drawing canvas, letting practitioners and peer groups sketch collaboratively.

### 🔑 6. Seamless Multi-Factor OTP & Google Sign-In
* **Two-Factor Safety:** Therapist and client registration loops secured by Twilio SMS and MSG91 Web Widget OTP verification pathways.
* **Google OAuth:** Secure authentication linking external profiles using Google ID token verification handshakes.

---

## 🏗️ Project Architecture & Workspaces

MindLink is structured as a decoupled monorepo leveraging **npm Workspaces**:

```text
mindlink/
├── package.json              # Root monorepo scripts & dependency orchestrations
├── DEPLOYMENT_GUIDE.md       # Production hosting & configuration handbook
├── PROJECT_EXPLANATION.md    # Full codebase & database model architecture catalog
├── backend/                  # Node.js + Express + Socket.IO API Server
│   ├── server.js             # Main server entry & middleware setups
│   └── src/
│       ├── models/           # Mongoose Database Models (User, Therapist, Room, ChatMessage)
│       ├── routes/           # REST endpoints (auth, Google Auth, OTP, rooms, AI)
│       └── socket/           # Real-time WebSocket notifications & message events
├── frontend/                 # Vite + React + TS Client
│   ├── vite.config.ts        # Bundle definition overrides and manual manualChunks splitting
│   └── src/
│       ├── mood/             # Client facial webcam tracking component
│       ├── context/          # Auth state provider
│       └── components/       # Pages views & Layouts (CBT Buddy, SOAP Notes, Rooms, Directory)
└── shared/                   # Shared type definitions and standard utils
```

---

## 🚀 Quick Start Guide

### ⚡ Automated Workspace Bootstrapping

Clone the repository and run the automated setups to install monorepo dependencies and launch the dev environments concurrently:

```bash
# Clone the repository
git clone <repository-url>
cd mindlink

# Run the unified workspace installer & database index sync
npm run setup

# Launch both Frontend (Vite) and Backend (Express) servers in development mode
npm run dev:all
```

* **Frontend Dashboard URL:** `http://localhost:5173`
* **Backend API Base:** `http://localhost:5001`
* **API Health Check:** `http://localhost:5001/health`

---

## 🛠️ Available Script Catalogue

MindLink exposes high-level root commands to easily control both workspaces simultaneously:

### 🌟 Root Monorepo Commands
* `npm run setup` — Installs root and workspace packages, copies environment templates, and builds workspace links.
* `npm run dev:all` — Boots backend and frontend servers in concurrent live-reload watchers.
* `npm run install:all` — Direct force installer for root and all workspace node modules.
* `npm run build:all` — Compiles both packages for production audits.

### 🎨 Frontend Specific Commands
* `npm run frontend:dev` — Launches Vite Client development server on port `5173`.
* `npm run frontend:build` — Compiles optimized static index assets into `/frontend/dist`.
* `npm run frontend:preview` — Local preview boot for the built production directory.

### 🔌 Backend Specific Commands
* `npm run backend:dev` — Starts Express Server using Nodemon hot-reload.
* `npm run backend:start` — Direct production boot (`node server.js`).

---

## ☁️ Production Deployment Roadmap

MindLink is fully production-ready. Follow the steps below for immediate hosting:

### 1. Database Provisioning
* Deploy a free shared cluster on **MongoDB Atlas**.
* Set **Network Access** to allow inbound connections (`0.0.0.0/0`).
* Extract your cluster driver connection string: `mongodb+srv://...`

### 2. Backend Cloud Service (e.g. Render / Railway)
* **Root Directory:** `backend`
* **Build Command:** `npm install`
* **Start Command:** `npm start`
* **Environment Variables:**
  * `NODE_ENV`: `production`
  * `MONGODB_URI`: *[Your Atlas connection string]*
  * `JWT_SECRET`: *[A secure, random signing key]*
  * `FRONTEND_URL`: *[Your Vercel deployment domain]*
  * `GEMINI_API_KEY`: *[Your Google AI Studio Key]*
  * `OTP_DRIVER`: `twilio` (or `msg91` / `development`)

### 3. Frontend Static Hosting (e.g. Vercel / Netlify)
* **Root Directory:** `frontend`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Build Environment Variables:**
  * `VITE_API_URL`: *[Your deployed Render API URL]*
  * `VITE_SOCKET_URL`: *[Your deployed Render Socket URL]*
  * `VITE_GOOGLE_CLIENT_ID`: *[Your GCP Google credentials client ID]*

*For complete details, checklists, and manual verification steps, refer to our detailed **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**.*
