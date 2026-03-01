import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { login: 'admin' },
    update: { role: 'ADMIN', tier: 'PREMIUM' },
    create: {
      login: 'admin',
      username: 'admin',
      displayName: 'Yotix Admin',
      passwordHash,
      role: 'ADMIN',
      tier: 'PREMIUM',
    },
  });
  await prisma.adminUser.upsert({
    where: { login: 'root_admin' },
    update: {},
    create: { login: 'root_admin', passwordHash },
  });
  console.log('Seed done: admin/admin123');
}

main().finally(() => prisma.$disconnect());
