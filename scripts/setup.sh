#!/bin/bash

# MindLink Setup Script
# This script sets up the development environment

set -e  # Exit on any error

echo "🔧 Setting up MindLink development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    print_error "Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

print_status "npm version: $(npm -v)"

# Install root dependencies
print_header "Installing root dependencies..."
npm install

# Setup frontend
print_header "Setting up frontend..."
cd frontend
npm install
print_status "Frontend dependencies installed!"

# Create frontend environment file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "env.template" ]; then
        cp env.template .env
        print_status "Created frontend .env file from template"
        print_warning "Please update frontend/.env with your actual values"
    else
        print_warning "No env.template found for frontend"
    fi
fi

cd ..

# Setup backend
print_header "Setting up backend..."
cd backend
npm install
print_status "Backend dependencies installed!"

# Create backend environment file if it doesn't exist
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        print_status "Created backend .env file from template"
        print_warning "Please update backend/.env with your actual values"
    else
        print_warning "No env.example found for backend"
    fi
fi

cd ..

# Check if MongoDB is running (optional)
print_header "Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.runCommand('ping')" --quiet &> /dev/null; then
        print_status "MongoDB is running and accessible"
    else
        print_warning "MongoDB is not running or not accessible"
        print_warning "Please start MongoDB or configure MongoDB Atlas"
    fi
else
    print_warning "MongoDB client not found. Please ensure MongoDB is installed and running"
fi

# Create necessary directories
print_header "Creating necessary directories..."
mkdir -p logs
mkdir -p temp
print_status "Directories created!"

# Set up git hooks (optional)
print_header "Setting up git hooks..."
if [ -d ".git" ]; then
    # Create pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting and tests before commit
echo "Running pre-commit checks..."

# Check if frontend has linting
if [ -f "frontend/package.json" ]; then
    cd frontend
    if npm run lint --silent 2>/dev/null; then
        echo "Frontend linting passed"
    else
        echo "Frontend linting failed"
        exit 1
    fi
    cd ..
fi

echo "Pre-commit checks passed!"
EOF
    chmod +x .git/hooks/pre-commit
    print_status "Git hooks configured!"
else
    print_warning "Not a git repository. Skipping git hooks setup."
fi

print_header "Setup completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Update environment variables in:"
echo "   - frontend/.env"
echo "   - backend/.env"
echo "2. Start MongoDB (if using local instance)"
echo "3. Run the application:"
echo "   - Backend: cd backend && npm start"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
print_status "For detailed setup instructions, see docs/SETUP.md"
