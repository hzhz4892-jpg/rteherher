import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import chatsRoutes from './routes/chats.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import emojiRoutes from './routes/emoji.routes.js';
import adminRoutes from './routes/admin.routes.js';
import storiesRoutes from './routes/stories.routes.js';
import { setupSocket } from './socket/index.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });

setupSocket(io);

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use((req, _res, next) => {
  req.io = io;
  next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.resolve(__dirname, '..', env.uploadDir)));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/emoji', emojiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stories', storiesRoutes);

server.listen(env.port, () => {
  console.log(`Yotix server running on :${env.port}`);
});
