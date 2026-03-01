import { Router } from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import { prisma } from '../config/prisma.js';
import { signToken } from '../utils/jwt.js';

const router = Router();

router.post('/register', [body('login').isLength({ min: 3 }), body('password').isLength({ min: 6 }), body('username').isLength({ min: 3 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { login, password, username, displayName } = req.body;
  const exists = await prisma.user.findFirst({ where: { OR: [{ login }, { username }] } });
  if (exists) return res.status(409).json({ error: 'Login or username already taken' });

  const user = await prisma.user.create({
    data: {
      login,
      passwordHash: await bcrypt.hash(password, 10),
      username,
      displayName: displayName || username,
    },
  });

  return res.json({ token: signToken({ userId: user.id }), user });
});

router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  return res.json({ token: signToken({ userId: user.id }), user });
});

export default router;
