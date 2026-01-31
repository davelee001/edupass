#!/bin/bash

echo "🎓 EduPass Setup Script"
echo "======================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm --version) found"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Please install PostgreSQL 14+"
    echo "   Visit: https://www.postgresql.org/download/"
else
    echo "✅ PostgreSQL found"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install
cd ..

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "⚙️  Next steps:"
echo ""
echo "1. Set up PostgreSQL database:"
echo "   psql -U postgres"
echo "   CREATE DATABASE edupass;"
echo ""
echo "2. Configure backend environment:"
echo "   cd backend"
echo "   cp .env.example .env"
echo "   nano .env  # Edit with your configuration"
echo ""
echo "3. Create Stellar issuer account:"
echo "   Visit: https://laboratory.stellar.org/#account-creator?network=test"
echo "   Or use: node scripts/create-issuer.js"
echo ""
echo "4. Start development servers:"
echo "   npm run dev  # From root directory"
echo ""
echo "📚 Documentation:"
echo "   - API Reference: docs/API_REFERENCE.md"
echo "   - Architecture: docs/ARCHITECTURE.md"
echo "   - Stellar Guide: docs/STELLAR_GUIDE.md"
echo "   - Deployment: docs/DEPLOYMENT.md"
echo ""
echo "🚀 Happy coding!"
