#!/usr/bin/env bash
# =============================================================================
# JT-Note – Start Script (Linux/macOS/WSL)
# =============================================================================
# Usage: ./start.sh [mode]
# Modes:
#   dev     – Start frontend only (Expo dev server, default)
#   docker  – Start full stack via Docker Compose
#   full    – Start both backend and frontend locally
#   test    – Run test suite
#   help    – Show this help
# =============================================================================

set -euo pipefail

MODE="${1:-dev}"

case "$MODE" in
  dev)
    echo "🚀 Starting Expo dev server..."
    cd frontend
    npm start
    ;;
  docker)
    echo "🐳 Starting Docker stack..."
    docker compose up -d
    echo "✅ Stack started. Frontend: http://localhost, Backend: http://localhost/api"
    ;;
  full)
    echo "🔧 Starting backend & frontend locally..."
    # Start backend in background
    cd backend
    python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..
    # Wait for backend
    sleep 3
    # Start frontend
    cd frontend
    npm start
    wait $BACKEND_PID
    ;;
  test)
    echo "🧪 Running tests..."
    echo "--- Backend ---"
    cd backend && python -m pytest tests/ -v
    cd ..
    echo "--- Frontend ---"
    cd frontend && npm run lint
    echo "✅ Tests completed."
    ;;
  help|*)
    echo "Usage: $0 [dev|docker|full|test|help]"
    echo "  dev     – Start Expo dev server (default)"
    echo "  docker  – Start full Docker stack"
    echo "  full    – Start backend + frontend locally"
    echo "  test    – Run lint & tests"
    echo "  help    – Show this help"
    ;;
esac
