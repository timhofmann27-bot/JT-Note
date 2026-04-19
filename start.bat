@echo off
REM =============================================================================
REM JT-Note – Start Script (Windows CMD)
REM =============================================================================
REM Usage: start.bat [dev|docker|full|test|help]
REM =============================================================================

set MODE=%1
if "%MODE%"=="" set MODE=dev

if "%MODE%"=="dev" (
    echo 🚀 Starting Expo dev server...
    cd frontend
    call npm start
    cd ..
) else if "%MODE%"=="docker" (
    echo 🐳 Starting Docker stack...
    docker compose up -d
    echo ✅ Stack started. Frontend: http://localhost, Backend: http://localhost/api
) else if "%MODE%"=="full" (
    echo 🔧 Starting backend and frontend locally...
    start /B cmd /c "cd backend && python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
    cd frontend
    call npm start
    cd ..
) else if "%MODE%"=="test" (
    echo 🧪 Running tests...
    echo --- Backend ---
    cd backend
    python -m pytest tests/ -v
    cd ..
    echo --- Frontend ---
    cd frontend
    call npm run lint
    cd ..
    echo ✅ Tests completed.
) else if "%MODE%"=="help" (
    echo Usage: start.bat [dev^|docker^|full^|test^|help]
    echo   dev     – Start Expo dev server (default)
    echo   docker  – Start full Docker stack
    echo   full    – Start backend + frontend locally
    echo   test    – Run lint and tests
    echo   help    – Show this help
) else (
    echo Unknown mode: %MODE%
    echo Use "help" for available modes.
)
