# Yotix (Messenger MVP)

## 1) Repo tree
```text
/server
  /prisma
    schema.prisma
    seed.js
  /src
    /config
    /middleware
    /routes
    /services
    /socket
    /utils
  package.json
  .env.example
/client
  /src
    /api
    /components
    /context
    /pages
    /styles
  package.json
```

## Run on Windows (PowerShell)
```powershell
cd server
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev

# new terminal
cd client
npm install
npm run dev
```

### DB modes
- Dev fast start: `DATABASE_PROVIDER=sqlite`, `DATABASE_URL=file:./dev.db`
- Prod: `DATABASE_PROVIDER=postgresql`, `DATABASE_URL=postgresql://...`

### Upload limits defaults
- USER: 100MB (`104857600`)
- PREMIUM: 2GB for dev SQLite safe cap (`2147483647`, fits 32-bit signed)
- Real file sizes are stored in `Attachment.sizeBytes` as `BigInt`, so PostgreSQL can hold >2GB; in SQLite dev use cap to avoid overflow edge cases.

### emojisPerPack
- `50` enforced in API and EmojiBot.

## 2) Prisma schema
- Full schema in `server/prisma/schema.prisma` (User/AdminUser/AdminAudit/Chat/Message/Attachment/Reaction/InviteLink/EmojiPack/CustomEmoji/Story...).

## 3) REST endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Users
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/search?q=`
- `PATCH /api/users/badge` (Premium only)

### Chats & Messages
- `GET /api/chats`
- `POST /api/chats` (DM/GROUP/CHANNEL)
- `POST /api/chats/:chatId/invite-link`
- `POST /api/chats/join/:token`
- `GET /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/messages`
- `PATCH /api/chats/messages/:messageId`
- `DELETE /api/chats/messages/:messageId?mode=self|all`
- `POST /api/chats/messages/:messageId/reactions`
- `POST /api/chats/messages/:messageId/pin`
- `POST /api/chats/:chatId/read`

### Uploads
- `POST /api/uploads` multipart (`file`, `messageId`, `type`)

### Emoji / EmojiBot
- `GET /api/emoji/packs`
- `POST /api/emoji/packs` (Premium)
- `POST /api/emoji/packs/:packId/emojis` (Premium)
- `POST /api/emoji/bot` (Premium commands)

EmojiBot commands:
- `/help`
- `/newpack <name>`
- `/addemoji :shortcode:` + uploaded file url
- `/list`
- `/submit`
- `/setbadge ⭐` or `/setbadge :shortcode:`

### Admin API
- `GET /api/admin/users`
- `POST /api/admin/users/:userId/premium`
- `POST /api/admin/users/:userId/ban`
- `POST /api/admin/users/:userId/mute`
- `GET /api/admin/emoji/packs`
- `POST /api/admin/emoji/packs/:packId/moderate`
- `GET /api/admin/audit`

### Stories
- `GET /api/stories`
- `POST /api/stories`
- `POST /api/stories/:storyId/view`
- `POST /api/stories/:storyId/reactions`
- `POST /api/stories/:storyId/replies`

## 4) Socket.IO events
Client -> Server:
- `chat:join` `{chatId}`
- `typing:start` `{chatId}`
- `typing:stop` `{chatId}`
- `call:offer` `{roomId, offer, toUserId}`
- `call:answer` `{roomId, answer, toUserId}`
- `call:ice-candidate` `{roomId, candidate, toUserId}`
- `call:hangup` `{roomId, toUserId}`

Server -> Client:
- `message:new`
- `message:edited`
- `message:deletedForAll`
- `message:pinned`
- `reaction:new`
- `chat:read`
- `typing:start`
- `typing:stop`
- `presence:update`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:hangup`

## 5) Minimal WebRTC signaling
Implemented in `server/src/socket/index.js` via relay events above (mesh for small groups is extensible by sending offers to each participant).

## 6) Quick Postman test
1. Register user A and B.
2. Login A -> Bearer token.
3. `POST /api/chats` type=`DM`, memberIds=[B].
4. `POST /api/chats/:id/messages` text="hello".
5. Open 2 web clients, both join same chat: test typing/realtime.
6. As admin (`admin/admin123` from seed), call admin endpoints to grant/revoke premium and moderate emoji packs.
