import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/prisma.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const data = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || user.isBanned) return res.status(401).json({ error: 'Invalid user' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requirePremium = (req, res, next) => {
  if (req.user.tier !== 'PREMIUM' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Premium required' });
  }
  return next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin required' });
  return next();
};
