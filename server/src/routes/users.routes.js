import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { auth, requirePremium } from '../middleware/auth.js';

const router = Router();
router.use(auth);

router.get('/me', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { badgeEmoji: true },
  });
  res.json(user);
});

router.patch('/me', async (req, res) => {
  const { displayName, bio, avatarUrl, lastSeenVisibility, callVisibility, storiesVisibility } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { displayName, bio, avatarUrl, lastSeenVisibility, callVisibility, storiesVisibility },
  });
  res.json(user);
});

router.get('/search', async (req, res) => {
  const q = req.query.q?.toString() || '';
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, username: true, displayName: true, tier: true, badgeUnicode: true, avatarUrl: true },
    take: 20,
  });
  res.json(users);
});

router.patch('/badge', requirePremium, async (req, res) => {
  const { badgeUnicode, badgeEmojiId } = req.body;
  if (!badgeUnicode && !badgeEmojiId) return res.status(400).json({ error: 'Badge is required' });

  if (badgeEmojiId) {
    const emoji = await prisma.customEmoji.findFirst({ where: { id: badgeEmojiId, approved: true } });
    if (!emoji) return res.status(404).json({ error: 'Approved emoji not found' });
  }

  const user = await prisma.user.update({ where: { id: req.user.id }, data: { badgeUnicode, badgeEmojiId } });
  res.json(user);
});

export default router;
