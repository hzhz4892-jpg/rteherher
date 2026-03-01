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

### Запуск, если проект лежит на диске D:
```powershell
# открыть PowerShell и перейти на диск D
D:
cd \path\to\rteherher

# backend
cd server
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev

# frontend в новом окне PowerShell
D:
cd \path\to\rteherher\client
npm install
npm run dev
```

Если у вас включена политика выполнения скриптов и npm не стартует, запустите PowerShell от администратора и выполните:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```


### Запуск, если проект лежит на диске C:
```powershell
# открыть PowerShell и перейти на диск C
C:
cd C:\Users\SystemX\Downloads\rteherher   # ПРИМЕР, подставьте ваш реальный путь

# backend
cd server
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev

# frontend в новом окне PowerShell
C:
cd C:\Users\SystemX\Downloads\rteherher\client   # ПРИМЕР
npm install
npm run dev
```

## Частые ошибки PowerShell (как у вас) и быстрый фикс

### 0) Папки проекта вообще нет на диске
Если `cd ...\rteherher\server` пишет "path not found", скорее всего репозиторий ещё не скачан или лежит в другом месте.

Проверьте, где есть папка `rteherher`:
```powershell
Get-ChildItem C:\Users\SystemX -Directory -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'rteherher' } | Select-Object -First 5 FullName
```

Если не нашли — сначала клонируйте проект:
```powershell
C:
cd C:\Users\SystemX\Downloads
git clone <URL_ВАШЕГО_РЕПО> rteherher
cd C:\Users\SystemX\Downloads\rteherher
```

### 1) `cd \path\to\...` не найден
`\path\to\...` — это шаблон, а не реальная папка.

Проверьте, где реально лежит проект:
```powershell
Get-ChildItem C:\Users\SystemX
Get-ChildItem C:\Users\SystemX\Downloads
```

И переходите в настоящий путь, например:
```powershell
cd C:\Users\SystemX\Downloads\rteherher\server
```

Проверка, что вы в нужной папке:
```powershell
Get-ChildItem
```
В списке должны быть `package.json` и `.env.example`.

### 2) `npm.ps1 / npx.ps1` blocked (ExecutionPolicy)
Есть 2 безопасных варианта:

**Вариант A (рекомендуется):**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
Закройте и заново откройте PowerShell.

**Вариант B (без изменения политики):**
используйте `.cmd`-обертки:
```powershell
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma migrate dev --name init
npm.cmd run seed
npm.cmd run dev
```

### 3) Команды `copy .env.example .env` не работают
Это значит, что вы не в папке `server`.

Сначала:
```powershell
cd C:\...\rteherher\server
Get-ChildItem
```
Потом:
```powershell
Copy-Item .env.example .env
```

### 4) `npm ENOENT ... C:\Users\SystemX\package.json`
Это значит, что `npm` запущен **не из папки проекта**.

Проверка текущей папки:
```powershell
Get-Location
Get-ChildItem
```
В `server` должен быть `package.json`, в `client` тоже должен быть `package.json`.

### 5) `npx prisma ... Could not find Prisma Schema`
Та же причина — вы не в `server`.

Правильно:
```powershell
cd C:\...\rteherher\server
npx.cmd prisma generate
npx.cmd prisma migrate dev --name init
```

### Минимальная рабочая последовательность для Windows (C:)
```powershell
# 1) Найти/открыть корень проекта
C:
cd C:\Users\SystemX\Downloads\rteherher
Get-ChildItem   # тут должны быть папки server и client

# 2) Backend
cd .\server
Copy-Item .env.example .env
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma migrate dev --name init
npm.cmd run seed
npm.cmd run dev

# 3) Frontend (в новом окне PowerShell)
C:
cd C:\Users\SystemX\Downloads\rteherher\client
npm.cmd install
npm.cmd run dev
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
