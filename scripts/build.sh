#!/bin/bash

# MindLink Build Script
# This script builds both frontend and backend for production

set -e  # Exit on any error

echo "🚀 Starting MindLink build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v)"

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Build frontend
print_status "Building frontend..."
cd frontend
npm install
npm run build
print_status "Frontend build completed successfully!"

# Build backend (if needed)
print_status "Preparing backend..."
cd ../backend
npm install
print_status "Backend dependencies installed!"

# Create build directory
cd ..
mkdir -p build
cp -r frontend/dist build/frontend
cp -r backend build/backend

# Copy environment templates
cp env.template build/
cp frontend/env.template build/frontend/
cp backend/env.example build/backend/

# Copy documentation
cp -r docs build/

print_status "Build completed successfully!"
print_status "Build artifacts are in the 'build' directory"
print_status "Frontend: build/frontend/"
print_status "Backend: build/backend/"

echo ""
print_status "Next steps:"
echo "1. Set up environment variables in build/backend/.env"
echo "2. Deploy backend to your hosting platform"
echo "3. Deploy frontend to your static hosting platform"
echo "4. Update CORS settings in backend for production domain"
