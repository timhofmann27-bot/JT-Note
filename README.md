# SS-Note

**Sichere, verschlüsselte Kommunikation** — Ein moderner Messenger inspiriert von Signal und Threema.

## Features

- **Anonyme Registrierung** — Keine E-Mail, keine Telefonnummer, keine Identität
- **End-to-End-Verschlüsselung** — Sichere Kommunikation mit bcrypt-gehashten Passkeys
- **Gruppenchats** — Erstelle Gruppen mit mehreren Teilnehmern, Sicherheitsstufen und Rollen
- **1:1-Chats** — Verschlüsselte Einzelchats mit Echtzeit-Nachrichten
- **Add-Me-Code-System** — Kontakte hinzufügen über eindeutige Codes (wie QR bei Signal)
- **Magic QR Login** — Einmal-QR-Codes für schnellen, passwortlosen Login
- **Selbstzerstörende Nachrichten** — Konfigurierbare Timer für automatische Löschung
- **Sicherheitsstufen** — UNCLASSIFIED, RESTRICTED, CONFIDENTIAL, SECRET
- **Notfall-Nachrichten** — Hervorgehobene Emergency-Messages
- **Typing-Indikatoren** — Echtzeit-Anzeige wer gerade tippt
- **DSGVO-konform** — Zero-PII Design, Account-Löschung inkl. aller Daten
- **Refresh-Token-Rotation** — Sichere Session-Verwaltung
- **WebSocket-basiert** — Echtzeit-Kommunikation über Socket.IO

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| **Frontend** | React Native, Expo Router, TypeScript |
| **Backend** | Python, FastAPI, Socket.IO |
| **Datenbank** | MongoDB 7 |
| **Auth** | JWT (HS256), bcrypt (Rounds 12) |
| **Proxy** | Traefik v3 (Auto-TLS) |
| **Deployment** | Docker Compose |

## Schnellstart

### Voraussetzungen

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) 18+ (für Frontend-Entwicklung)
- [Python](https://www.python.org/) 3.11+ (für Backend-Entwicklung)

### Backend starten

```bash
docker compose up -d
```

Das Backend läuft auf `http://localhost:8001`.

### Frontend starten

```bash
cd frontend
npm install
npx expo start --web
```

Die Web-App öffnet sich auf `http://localhost:19006`.

## Demo-Zugänge

| Account | Username | Passkey | Rolle |
|---------|----------|---------|-------|
| Admin | `wolf-1` | `Funk2024!` | Commander |
| Test | `adler-2` | `Funk2024!` | Officer |

## Projektstruktur

```
SS-Note/
├── backend/              # FastAPI Backend
│   ├── server.py         # Hauptanwendung (Auth, Chats, Messages, WebSocket)
│   ├── requirements.txt  # Python-Abhängigkeiten
│   └── tests/            # Integrationstests (pytest)
├── frontend/             # React Native / Expo App
│   ├── app/              # Routen (Expo Router)
│   │   ├── (tabs)/       # Tab-Navigation (Chats, Kontakte, Profil)
│   │   ├── chat/[id].tsx # Chat-Detailansicht
│   │   ├── login.tsx     # Login-Screen
│   │   ├── register.tsx  # Registrierungs-Screen
│   │   └── new-chat.tsx  # Neuer Chat / Gruppe erstellen
│   ├── src/
│   │   ├── context/      # AuthContext
│   │   └── utils/        # API-Client, Theme, Crypto
│   └── package.json
├── Dockerfile            # Multi-stage Build
├── docker-compose.yml    # App + MongoDB + Traefik
└── README.md
```

## API-Endpunkte

### Authentifizierung

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `POST` | `/api/auth/register` | Neuer Benutzer registrieren |
| `POST` | `/api/auth/login` | Anmelden mit Username + Passkey |
| `POST` | `/api/auth/logout` | Abmelden |
| `GET`  | `/api/auth/me` | Eigenes Profil abrufen |
| `POST` | `/api/auth/change-passkey` | Passkey ändern |
| `POST` | `/api/auth/refresh` | Access Token erneuern |
| `GET`  | `/api/auth/generate-username` | Zufälligen Username generieren |
| `POST` | `/api/auth/magic-qr` | Magic QR Code erstellen |
| `POST` | `/api/auth/magic-verify` | Magic QR Token verifizieren |
| `DELETE` | `/api/auth/account` | Account löschen (DSGVO Art. 17) |

### Benutzer & Kontakte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET`  | `/api/users` | Bestätigte Kontakte auflisten |
| `GET`  | `/api/users/{id}` | Benutzerdetails (nur bestätigte Kontakte) |
| `GET`  | `/api/users/my-add-code` | Eigenen Add-Me-Code abrufen |
| `POST` | `/api/users/reset-add-code` | Add-Me-Code zurücksetzen |
| `GET`  | `/api/contacts` | Kontakte auflisten |
| `POST` | `/api/contacts/add-by-code` | Kontaktanfrage per Code senden |
| `GET`  | `/api/contacts/requests` | Eingehende Kontaktanfragen |
| `POST` | `/api/contacts/request/{id}/accept` | Anfrage akzeptieren |
| `POST` | `/api/contacts/request/{id}/reject` | Anfrage ablehnen |
| `DELETE` | `/api/contacts/{id}` | Kontakt entfernen |

### Chats & Nachrichten

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `GET`  | `/api/chats` | Alle Chats auflisten |
| `POST` | `/api/chats` | Neuen Chat/Gruppe erstellen |
| `GET`  | `/api/chats/{id}` | Chat-Details |
| `GET`  | `/api/messages/{chatId}` | Nachrichten laden |
| `POST` | `/api/messages` | Nachricht senden (Plaintext) |
| `POST` | `/api/messages/encrypted` | Nachricht senden (E2EE verschlüsselt) |
| `POST` | `/api/messages/read` | Nachrichten als gelesen markieren |
| `POST` | `/api/typing/{chatId}` | Tipp-Status senden |
| `GET`  | `/api/typing/{chatId}` | Tipp-Status abrufen |

### E2EE Key Management

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| `POST` | `/api/keys/upload` | Public Key hochladen |
| `GET`  | `/api/keys/{userId}` | Public Key eines Benutzers abrufen |
| `GET`  | `/api/keys/batch` | Mehrere Public Keys auf einmal abrufen |

### WebSocket

Socket.IO auf `/api/socket.io` für Echtzeit-Nachrichten und Kontaktanfragen.

## Tests

```bash
cd backend
pytest tests/ -v
```

Für Tests mit lokalem Server:
```bash
export EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
pytest tests/ -v
```

## Sicherheit

### Ende-zu-Ende-Verschlüsselung (E2EE)

SS-Note implementiert ein **Double Ratchet-ähnliches Protokoll** für maximale Sicherheit:

| Komponente | Algorithmus | Zweck |
|---|---|---|
| **Key Exchange** | X25519 (Curve25519) | Sichere Schlüsselvereinbarung |
| **Verschlüsselung** | XSalsa20-Poly1305 | Authentifizierte Verschlüsselung |
| **Key Derivation** | HKDF (HMAC-SHA256) | Sichere Schlüsselableitung |
| **Forward Secrecy** | Double Ratchet | Jede Nachricht hat einen eigenen Schlüssel |
| **Key Storage** | Expo SecureStore | iOS Keychain / Android Keystore |
| **Key Verification** | Safety Numbers | Fingerprint-Vergleich wie bei Signal |

**Ablauf:**
1. Bei Login/Registrierung wird ein X25519-KeyPair generiert und im SecureStore gespeichert
2. Der Public Key wird an das Backend übermittelt
3. Beim Öffnen eines 1:1-Chats wird eine E2EE-Session per X25519 DH initialisiert
4. Jede Nachricht wird client-seitig verschlüsselt — das Backend sieht nur Ciphertext
5. Pro Nachricht wird ein neuer DH-Key generiert (Forward Secrecy)
6. Safety Numbers ermöglichen Man-in-the-Middle-Erkennung

### Zusätzliche Sicherheitsmaßnahmen

- **bcrypt mit 12 Rounds** für Passkey-Hashing
- **JWT mit Token-Rotation** — Refresh-Token werden bei jeder Nutzung erneuert
- **Rate Limiting** — Schutz gegen Brute-Force bei Login und Registrierung
- **IP-Anonymisierung** — Client-IPs werden gehasht gespeichert
- **Audit-Logging** — Alle sicherheitsrelevanten Aktionen werden protokolliert
- **CORS-geschützt** — Nur konfigurierte Origins erlaubt
- **Non-root Container** — Backend läuft als unpriviligierter User

## Lizenz

Private — Alle Rechte vorbehalten.
