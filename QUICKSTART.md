# JT-Note – Quick Start

## One-Liners

### Docker (Production)
```bash
docker compose up -d && curl -s http://localhost/health | jq .
```

### Linux/macOS/WSL
```bash
chmod +x start.sh && ./start.sh docker
```

### Windows PowerShell
```powershell
.\start.ps1 -Mode docker
```

### Windows CMD
```cmd
start.bat docker
```

### Expo Dev (Local Development)
```bash
# Linux/macOS/WSL
./start.sh dev

# Windows PowerShell
.\start.ps1 -Mode dev

# Windows CMD
start.bat dev
```

### Full Stack (Backend + Frontend locally)
```bash
# Linux/macOS/WSL
./start.sh full

# Windows PowerShell
.\start.ps1 -Mode full

# Windows CMD
start.bat full
```

### Run Tests
```bash
# Linux/macOS/WSL
./start.sh test

# Windows PowerShell
.\start.ps1 -Mode test

# Windows CMD
start.bat test
```

## Manual Commands

### Docker
```bash
docker compose build --no-cache   # First time
docker compose up -d              # Start
docker compose logs -f            # View logs
docker compose down               # Stop
```

### Frontend (Expo)
```bash
cd frontend
npm install
npm start                         # Start dev server
npm run lint                      # Lint check
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

## Health Check
```bash
curl http://localhost/health
# or
Invoke-WebRequest -Uri http://localhost/health
```
