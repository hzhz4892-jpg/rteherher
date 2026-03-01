import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';
import { storageProvider } from '../services/storage.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.dirname(storageProvider.savePath('tmp'))),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});

export const createUpload = (limitBytes) => multer({
  storage,
  limits: { fileSize: limitBytes },
});

export const uploadForTier = (req, _res, next) => {
  const limit = req.user?.tier === 'PREMIUM' ? env.uploadLimitPremium : env.uploadLimitUser;
  return createUpload(limit).single('file')(req, _res, next);
};
