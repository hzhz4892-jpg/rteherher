import { Router } from 'express';
import { auth, requirePremium } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { processEmojiBotCommand } from '../services/emojiBot.js';

const router = Router();
router.use(auth);

router.get('/packs', async (req, res) => {
  const packs = await prisma.emojiPack.findMany({ where: { ownerId: req.user.id }, include: { emojis: true } });
  res.json(packs);
});

router.post('/packs', requirePremium, async (req, res) => {
  const pack = await prisma.emojiPack.create({ data: { ownerId: req.user.id, name: req.body.name } });
  res.json(pack);
});

router.post('/packs/:packId/emojis', requirePremium, async (req, res) => {
  const count = await prisma.customEmoji.count({ where: { packId: req.params.packId } });
  if (count >= 50) return res.status(400).json({ error: 'Pack limit is 50 emojis' });
  const emoji = await prisma.customEmoji.create({
    data: {
      packId: req.params.packId,
      createdById: req.user.id,
      shortcode: req.body.shortcode,
      imageUrl: req.body.imageUrl,
    },
  });
  res.json(emoji);
});

router.post('/bot', requirePremium, async (req, res) => {
  const reply = await processEmojiBotCommand({
    user: req.user,
    text: req.body.text,
    attachmentUrl: req.body.attachmentUrl,
  });
  res.json({ reply });
});

export default router;
