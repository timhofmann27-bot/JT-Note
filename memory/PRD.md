# 444.HEIMAT-FUNK — Product Requirements Document v2.0

## Übersicht
Militärisch-orientierter, sicherer Messenger mit **anonymer Authentifizierung** und **Echtzeit-WebSocket-Messaging**. Zero-PII by Design. DSGVO-konform.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) + Socket.IO Client
- **Backend**: FastAPI + python-socketio + Motor (async MongoDB)
- **Datenbank**: MongoDB (heimatfunk_db)
- **Auth**: Anonym (Username + Passkey/bcrypt12 + JWT 1h/7d)

## v2.0 Features (NEU)
- ✅ **WebSocket Echtzeit**: Socket.IO für message:new + typing Events
- ✅ **Username-Generator**: `GET /api/auth/generate-username` → tier-hex (wolf-a3f2e1)
- ✅ **Passkey-Ändern**: `POST /api/auth/change-passkey` im Settings-Screen
- ✅ **DSGVO Account-Löschung**: `DELETE /api/auth/account` (komplett mit cascade)
- ✅ **Refresh-Token**: `POST /api/auth/refresh` mit Cookie-Rotation
- ✅ **Security Headers**: HSTS, X-Frame-Options, CSP, Referrer-Policy
- ✅ **Anonymized Audit-Log**: SHA256(IP) statt raw IP
- ✅ **bcrypt 12 Rounds**: 4x stärker gegen Brute-Force

## Security (über 3 Pentest-Runden + Hardening)
- JWT 128-Zeichen Secret, 1h Access + 7d Refresh
- Token-Blacklist bei Logout (MongoDB TTL)
- Rate Limiting: 5/IP Login + 3/IP Register
- IDOR: Chat-Membership auf allen Endpoints
- CORS: Nur Frontend-URL
- Input Validation: Pydantic Whitelists

## Endpoints
### Auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout
- POST /api/auth/change-passkey, /api/auth/refresh
- GET /api/auth/me, /api/auth/generate-username
- DELETE /api/auth/account

### Messaging + WebSocket
- POST /api/messages, GET /api/messages/{chat_id}
- DELETE /api/messages/{id}
- Socket.IO: message:new, typing Events

## Login-Daten
- Admin: `wolf-1` / `Funk2024!`
- Test: `adler-2` / `Funk2024!`
