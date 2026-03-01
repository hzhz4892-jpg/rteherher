import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  uploadLimitUser: Number(process.env.UPLOAD_LIMIT_USER || 104857600),
  uploadLimitPremium: Number(process.env.UPLOAD_LIMIT_PREMIUM || 2147483647),
};
