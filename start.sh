#!/bin/bash

# Buraco Game - Start Script
# Runs both backend and frontend servers

echo "🎴 Starting Buraco Game..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "📦 Starting backend server..."
cd "$SCRIPT_DIR/backend"
npm install --silent
node server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🌐 Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install
echo "🔨 Building frontend..."
npm run build
echo "🚀 Starting frontend dev server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servers running:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
