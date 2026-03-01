import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { auth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(auth, requireAdmin);

const audit = (actorUserId, action, targetType, targetId, payload) =>
  prisma.adminAudit.create({ data: { actorUserId, action, targetType, targetId, payload } });

router.get('/users', async (req, res) => {
  const q = req.query.q?.toString() || '';
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 50,
  });
  res.json(users);
});

router.post('/users/:userId/premium', async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.userId }, data: { tier: req.body.enabled ? 'PREMIUM' : 'USER' } });
  await audit(req.user.id, req.body.enabled ? 'GRANT_PREMIUM' : 'REVOKE_PREMIUM', 'User', user.id, req.body);
  res.json(user);
});

router.post('/users/:userId/ban', async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.userId }, data: { isBanned: req.body.enabled } });
  await audit(req.user.id, req.body.enabled ? 'BAN_USER' : 'UNBAN_USER', 'User', user.id, req.body);
  res.json(user);
});

router.post('/users/:userId/mute', async (req, res) => {
  const mutedUntil = req.body.enabled ? new Date(req.body.mutedUntil || Date.now() + 3600000) : null;
  const user = await prisma.user.update({ where: { id: req.params.userId }, data: { mutedUntil } });
  await audit(req.user.id, req.body.enabled ? 'MUTE_USER' : 'UNMUTE_USER', 'User', user.id, req.body);
  res.json(user);
});

router.get('/emoji/packs', async (_req, res) => {
  const packs = await prisma.emojiPack.findMany({
    where: { status: 'PENDING' },
    include: { owner: true, emojis: true },
  });
  res.json(packs);
});

router.post('/emoji/packs/:packId/moderate', async (req, res) => {
  const approved = !!req.body.approved;
  const pack = await prisma.emojiPack.update({
    where: { id: req.params.packId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      rejectionReason: approved ? null : req.body.reason || 'Rejected by moderator',
      emojis: { updateMany: { where: {}, data: { approved } } },
    },
  });
  await audit(req.user.id, approved ? 'APPROVE_EMOJI_PACK' : 'REJECT_EMOJI_PACK', 'EmojiPack', pack.id, req.body);
  res.json(pack);
});

router.get('/audit', async (_req, res) => {
  const logs = await prisma.adminAudit.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(logs);
});

export default router;