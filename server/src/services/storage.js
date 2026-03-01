import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

export const localStorage = {
  savePath: (fileName) => path.join(uploadRoot, fileName),
  publicUrl: (fileName) => `/uploads/${fileName}`,
};

// Placeholder for future S3/MinIO provider with same interface.
export const storageProvider = localStorage;
