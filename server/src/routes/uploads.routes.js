import { Router } from 'express';
import path from 'path';
import { auth } from '../middleware/auth.js';
import { uploadForTier } from '../middleware/upload.js';
import { prisma } from '../config/prisma.js';
import { storageProvider } from '../services/storage.js';

const router = Router();
router.use(auth);

const mapType = (mime) => {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
};

router.post('/', (req, res, next) => uploadForTier(req, res, next), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const messageId = req.body.messageId;
  const attachment = await prisma.attachment.create({
    data: {
      messageId,
      type: req.body.type || mapType(req.file.mimetype),
      url: storageProvider.publicUrl(path.basename(req.file.path)),
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: BigInt(req.file.size),
    },
  });

  res.json(attachment);
});

export default router;
