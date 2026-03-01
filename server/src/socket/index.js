import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/prisma.js';

const onlineUsers = new Map();

export const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    onlineUsers.set(socket.user.id, socket.id);
    await prisma.user.update({ where: { id: socket.user.id }, data: { lastSeenAt: new Date() } });
    io.emit('presence:update', { userId: socket.user.id, online: true });

    socket.on('chat:join', (chatId) => socket.join(`chat:${chatId}`));
    socket.on('typing:start', ({ chatId }) => socket.to(`chat:${chatId}`).emit('typing:start', { chatId, userId: socket.user.id }));
    socket.on('typing:stop', ({ chatId }) => socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId: socket.user.id }));

    socket.on('call:offer', ({ roomId, offer, toUserId }) => io.to(onlineUsers.get(toUserId)).emit('call:offer', { roomId, fromUserId: socket.user.id, offer }));
    socket.on('call:answer', ({ roomId, answer, toUserId }) => io.to(onlineUsers.get(toUserId)).emit('call:answer', { roomId, fromUserId: socket.user.id, answer }));
    socket.on('call:ice-candidate', ({ roomId, candidate, toUserId }) => io.to(onlineUsers.get(toUserId)).emit('call:ice-candidate', { roomId, fromUserId: socket.user.id, candidate }));
    socket.on('call:hangup', ({ roomId, toUserId }) => io.to(onlineUsers.get(toUserId)).emit('call:hangup', { roomId, fromUserId: socket.user.id }));

    socket.on('disconnect', async () => {
      onlineUsers.delete(socket.user.id);
      await prisma.user.update({ where: { id: socket.user.id }, data: { lastSeenAt: new Date() } });
      io.emit('presence:update', { userId: socket.user.id, online: false });
    });
  });
};
