import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  const stories = await prisma.story.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { author: true, reactions: true, replies: true, views: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(stories);
});

router.post('/', async (req, res) => {
  const hours = Number(req.body.expiresInHours || 24);
  const story = await prisma.story.create({
    data: {
      authorId: req.user.id,
      mediaUrl: req.body.mediaUrl,
      mediaType: req.body.mediaType,
      caption: req.body.caption,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    },
  });
  res.json(story);
});

router.post('/:storyId/view', async (req, res) => {
  const view = await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: req.params.storyId, viewerId: req.user.id } },
    update: { viewedAt: new Date() },
    create: { storyId: req.params.storyId, viewerId: req.user.id },
  });
  res.json(view);
});

router.post('/:storyId/reactions', async (req, res) => {
  const reaction = await prisma.storyReaction.create({ data: { storyId: req.params.storyId, userId: req.user.id, emoji: req.body.emoji } });
  res.json(reaction);
});

router.post('/:storyId/replies', async (req, res) => {
  const reply = await prisma.storyReply.create({ data: { storyId: req.params.storyId, userId: req.user.id, text: req.body.text } });
  res.json(reply);
});

export default router;
