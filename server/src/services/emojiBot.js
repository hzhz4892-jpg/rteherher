import { prisma } from '../config/prisma.js';

const HELP = `EmojiBot commands:\n/help\n/newpack <name>\n/addemoji :shortcode: (attach png/webp)\n/list\n/submit\n/setbadge ⭐ or /setbadge :shortcode:`;

export const processEmojiBotCommand = async ({ user, text, attachmentUrl }) => {
  if (user.tier !== 'PREMIUM') return 'EmojiBot: Premium required.';
  const [command, ...args] = text.trim().split(' ');

  if (command === '/help') return HELP;

  if (command === '/newpack') {
    const name = args.join(' ').trim();
    if (!name) return 'Usage: /newpack <name>';
    await prisma.emojiPack.create({ data: { ownerId: user.id, name } });
    return `Pack ${name} created.`;
  }

  const latestPack = await prisma.emojiPack.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: 'desc' }, include: { emojis: true } });
  if (!latestPack) return 'Create a pack first: /newpack <name>';

  if (command === '/addemoji') {
    const shortcode = args[0];
    if (!shortcode || !attachmentUrl) return 'Usage: /addemoji :shortcode: + png/webp file';
    if (latestPack.emojis.length >= 50) return 'Pack limit reached (50).';
    await prisma.customEmoji.create({
      data: { packId: latestPack.id, createdById: user.id, shortcode: shortcode.replace(/:/g, ''), imageUrl: attachmentUrl },
    });
    return `Emoji ${shortcode} added.`;
  }

  if (command === '/list') {
    const items = latestPack.emojis.map((e) => `:${e.shortcode}:`).join(', ');
    return `Pack ${latestPack.name}: ${items || 'empty'}`;
  }

  if (command === '/submit') {
    await prisma.emojiPack.update({ where: { id: latestPack.id }, data: { status: 'PENDING' } });
    return `Pack ${latestPack.name} submitted for moderation.`;
  }

  if (command === '/setbadge') {
    const value = args[0];
    if (!value) return 'Usage: /setbadge ⭐ or /setbadge :shortcode:';
    if (value.startsWith(':') && value.endsWith(':')) {
      const shortcode = value.replace(/:/g, '');
      const emoji = await prisma.customEmoji.findFirst({ where: { shortcode, approved: true } });
      if (!emoji) return 'Approved custom emoji not found.';
      await prisma.user.update({ where: { id: user.id }, data: { badgeEmojiId: emoji.id, badgeUnicode: null } });
      return `Badge set to ${value}`;
    }
    await prisma.user.update({ where: { id: user.id }, data: { badgeUnicode: value, badgeEmojiId: null } });
    return `Badge set to ${value}`;
  }

  return 'Unknown command. /help';
};
