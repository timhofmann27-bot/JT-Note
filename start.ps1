# =============================================================================
# JT-Note – Start Script (Windows PowerShell)
# =============================================================================
# Usage: .\start.ps1 [-Mode dev|docker|full|test|help]
# =============================================================================

param(
    [string]$Mode = "dev"
)

switch ($Mode) {
    "dev" {
        Write-Host "🚀 Starting Expo dev server..." -ForegroundColor Green
        Set-Location frontend
        npm start
    }
    "docker" {
        Write-Host "🐳 Starting Docker stack..." -ForegroundColor Green
        docker compose up -d
        Write-Host "✅ Stack started. Frontend: http://localhost, Backend: http://localhost/api" -ForegroundColor Green
    }
    "full" {
        Write-Host "🔧 Starting backend & frontend locally..." -ForegroundColor Green
        # Start backend in background
        Set-Location backend
        Start-Process python -ArgumentList "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WindowStyle Normal
        Set-Location ..
        # Wait for backend
        Start-Sleep -Seconds 3
        # Start frontend
        Set-Location frontend
        npm start
    }
    "test" {
        Write-Host "🧪 Running tests..." -ForegroundColor Green
        Write-Host "--- Backend ---" -ForegroundColor Yellow
        Set-Location backend
        python -m pytest tests/ -v
        Set-Location ..
        Write-Host "--- Frontend ---" -ForegroundColor Yellow
        Set-Location frontend
        npm run lint
        Write-Host "✅ Tests completed." -ForegroundColor Green
    }
    "help" {
        Write-Host "Usage: .\start.ps1 [-Mode dev|docker|full|test|help]"
        Write-Host "  dev     – Start Expo dev server (default)"
        Write-Host "  docker  – Start full Docker stack"
        Write-Host "  full    – Start backend + frontend locally"
        Write-Host "  test    – Run lint & tests"
        Write-Host "  help    – Show this help"
    }
    default {
        Write-Host "Unknown mode: $Mode" -ForegroundColor Red
        Write-Host "Use 'help' for available modes."
    }
}
