import { Router } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../config/prisma.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

const memberCheck = async (chatId, userId) => prisma.chatMember.findUnique({ where: { chatId_userId: { chatId, userId } } });

router.get('/', async (req, res) => {
  const chats = await prisma.chat.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, username: true, displayName: true, badgeUnicode: true, tier: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: true, attachments: true, reactions: true } },
    },
  });
  res.json(chats);
});

router.post('/', async (req, res) => {
  const { type, memberIds = [], title, channelPostPolicy } = req.body;
  const chat = await prisma.chat.create({
    data: {
      type,
      title,
      channelPostPolicy: channelPostPolicy || 'EVERYONE',
      createdById: req.user.id,
      members: {
        create: [{ userId: req.user.id, role: 'OWNER' }, ...memberIds.filter((id) => id !== req.user.id).map((userId) => ({ userId }))],
      },
    },
  });
  res.json(chat);
});

router.post('/:chatId/invite-link', async (req, res) => {
  const member = await memberCheck(req.params.chatId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not in chat' });

  const invite = await prisma.inviteLink.create({
    data: {
      chatId: req.params.chatId,
      createdById: req.user.id,
      token: nanoid(16),
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    },
  });
  res.json(invite);
});

router.post('/join/:token', async (req, res) => {
  const invite = await prisma.inviteLink.findUnique({ where: { token: req.params.token } });
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invite expired' });

  const member = await prisma.chatMember.upsert({
    where: { chatId_userId: { chatId: invite.chatId, userId: req.user.id } },
    update: {},
    create: { chatId: invite.chatId, userId: req.user.id },
  });
  res.json(member);
});

router.get('/:chatId/messages', async (req, res) => {
  const member = await memberCheck(req.params.chatId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not in chat' });

  const messages = await prisma.message.findMany({
    where: {
      chatId: req.params.chatId,
      deletedForUsers: { none: { userId: req.user.id } },
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, badgeUnicode: true, tier: true } },
      attachments: true,
      reactions: { include: { customEmoji: true } },
      replyTo: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(messages);
});

router.post('/:chatId/messages', async (req, res) => {
  const member = await memberCheck(req.params.chatId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not in chat' });

  const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
  if (chat.type === 'CHANNEL' && chat.channelPostPolicy === 'ADMINS_ONLY' && !['OWNER', 'ADMIN'].includes(member.role)) {
    return res.status(403).json({ error: 'Only admins can post to this channel' });
  }

  const message = await prisma.message.create({
    data: {
      chatId: req.params.chatId,
      senderId: req.user.id,
      text: req.body.text,
      replyToId: req.body.replyToId,
      forwardFromId: req.body.forwardFromId,
    },
    include: { sender: true, attachments: true, reactions: true },
  });

  req.io.to(`chat:${req.params.chatId}`).emit('message:new', message);
  res.json(message);
});

router.patch('/messages/:messageId', async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message || message.senderId !== req.user.id) return res.status(404).json({ error: 'Message not found' });
  const updated = await prisma.message.update({ where: { id: message.id }, data: { text: req.body.text, editedAt: new Date() } });
  req.io.to(`chat:${message.chatId}`).emit('message:edited', updated);
  res.json(updated);
});

router.delete('/messages/:messageId', async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ error: 'Message not found' });
  const { mode } = req.query;
  if (mode === 'all' && message.senderId === req.user.id) {
    const deleted = await prisma.message.update({ where: { id: message.id }, data: { deletedForAllAt: new Date(), text: '[deleted]' } });
    req.io.to(`chat:${message.chatId}`).emit('message:deletedForAll', deleted);
    return res.json(deleted);
  }

  const hidden = await prisma.messageDeleteForUser.upsert({
    where: { messageId_userId: { messageId: message.id, userId: req.user.id } },
    update: {},
    create: { messageId: message.id, userId: req.user.id },
  });
  return res.json(hidden);
});

router.post('/messages/:messageId/reactions', async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ error: 'Message not found' });

  const reaction = await prisma.reaction.upsert({
    where: { messageId_userId_emoji: { messageId: message.id, userId: req.user.id, emoji: req.body.emoji } },
    update: { customEmojiId: req.body.customEmojiId || null },
    create: { messageId: message.id, userId: req.user.id, emoji: req.body.emoji, customEmojiId: req.body.customEmojiId || null },
    include: { user: true, customEmoji: true },
  });

  req.io.to(`chat:${message.chatId}`).emit('reaction:new', reaction);
  res.json(reaction);
});

router.post('/messages/:messageId/pin', async (req, res) => {
  const message = await prisma.message.update({ where: { id: req.params.messageId }, data: { isPinned: true } });
  req.io.to(`chat:${message.chatId}`).emit('message:pinned', message);
  res.json(message);
});

router.post('/:chatId/read', async (req, res) => {
  const member = await prisma.chatMember.update({
    where: { chatId_userId: { chatId: req.params.chatId, userId: req.user.id } },
    data: { lastReadAt: new Date() },
  });
  req.io.to(`chat:${req.params.chatId}`).emit('chat:read', { chatId: req.params.chatId, userId: req.user.id, at: member.lastReadAt });
  res.json(member);
});

export default router;
