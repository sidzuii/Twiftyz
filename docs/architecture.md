# Twiftyz Architecture

## Current Shape

Проект сейчас работает как локальный modular monolith на стандартной библиотеке Node.js:

- `server.js` раздает web-клиент, REST API и native WebSocket.
- `data/store.json` используется как runtime database.
- `uploads/` используется как локальное runtime-хранилище загруженных файлов.
- Пароли хранятся через `crypto.scryptSync(password, salt, 64)`.
- Клиент получает bearer token и подключается к `/ws?token=<token>`.
- WebSocket синхронизирует `message:new`, `typing:update`, `presence:update`, `notification:new`, `call:started`.

## Domains

- Auth: register, login, logout, sessions, device tracking.
- Users: profile, nickname, email, phone, privacy, status.
- Contacts: favorites, blocks, direct-chat opening.
- Chats: direct, group, channel, members, admins, owner, invite link.
- Messages: text, files, replies, reactions, pins, delete/edit/read receipts.
- Files: multipart upload, local binary storage, protected download, metadata, scan status, progress.
- Calls: voice/video call records, participants, quality, encrypted flag.
- Notifications: message/security notifications.
- Admin: summary, logs, user status/role updates.

## REST API

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/start` and `POST /api/auth/verify` remain as compatibility passwordless endpoints.

Core:

- `GET /api/bootstrap`
- `GET/PATCH /api/me`
- `GET/PATCH /api/settings`
- `GET /api/sessions`
- `DELETE /api/sessions/:id`
- `GET/POST /api/chats`
- `GET/POST /api/chats/:id/messages`
- `POST /api/chats/:id/read`
- `PATCH/DELETE /api/messages/:id`
- `POST /api/messages/:id/reactions`
- `POST /api/messages/:id/pin`
- `GET/POST /api/contacts`
- `PATCH /api/contacts/:userId`
- `GET /api/users/search`
- `GET /api/search`
- `GET/PATCH /api/notifications`
- `POST /api/files`
- `GET /api/files/:id/download`
- `POST /api/calls/start`
- `POST /api/calls/:id/end`

Admin:

- `GET /api/admin/summary`
- `GET /api/admin/logs`
- `PATCH /api/admin/users/:id`

## WebSocket API

Endpoint:

```text
/ws?token=<bearer-token>
```

Client events:

- `typing`
- `presence`

Server events:

- `connection:ready`
- `message:new`
- `message:updated`
- `message:deleted`
- `chat:created`
- `chat:updated`
- `chat:read`
- `typing:update`
- `presence:update`
- `notification:new`
- `call:started`
- `call:ended`

## Production Path

1. Split `server.js` into NestJS modules: auth, users, contacts, chats, messages, media, calls, admin.
2. Replace `data/store.json` with PostgreSQL and migrations.
3. Move sessions, rate limits, presence and pub/sub to Redis.
4. Add S3-compatible storage with presigned uploads/downloads.
5. Add BullMQ/RabbitMQ jobs for push notifications, previews, antivirus scan and media transcode.
6. Add WebRTC signaling service plus TURN/STUN for calls.
7. Put TLS and security headers behind a reverse proxy.
8. Add TOTP/WebAuthn 2FA, email/phone verification and password reset.
9. Move frontend to Next.js + TypeScript + Zustand.
10. Reuse API/realtime contracts in mobile and desktop clients.
