/*
  Verify that a direct-message conversation with a given user exists and show recent messages.
  Usage: npx ts-node scripts/verify-dm-delivery.ts "Dan Reeves"
*/
import { prisma } from '../src/lib/db';
import { Prisma } from '@prisma/client';

async function main() {
  const term = (process.argv[2] || 'Dan Reeves').trim();
  const parts = term.toLowerCase().split(/\s+/).filter(Boolean);

  // Find candidate users by name or email containing all parts
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: term, mode: Prisma.QueryMode.insensitive } },
        ...(parts.length > 1
          ? [{
              AND: parts.map((p) => ({ name: { contains: p, mode: Prisma.QueryMode.insensitive } }))
            }]
          : [])
      ],
    },
    select: { id: true, name: true, email: true },
  });

  if (users.length === 0) {
    console.log(`No active users found matching: ${term}`);
    return;
  }

  console.log(`Found ${users.length} user(s):`);
  for (const u of users) {
    console.log(`- ${u.name || u.email} (${u.id})`);
  }

  // For each candidate user, show their recent DM conversations and latest messages
  for (const user of users) {
    console.log(`\nConversations for ${user.name || user.email} (${user.id}):`);
    const conversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        members: { some: { userId: user.id } },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 5,
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { sender: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (conversations.length === 0) {
      console.log('  (no DM conversations)');
      continue;
    }

    for (const c of conversations) {
      const memberNames = c.members.map(m => m.user?.name || m.user?.email || m.userId).join(', ');
      console.log(`- Conversation ${c.id} members: ${memberNames}`);
      if (c.messages.length === 0) {
        console.log('  (no messages)');
        continue;
      }
      for (const m of c.messages) {
        const sn = m.sender?.name || m.sender?.email || m.senderId;
        console.log(`  [${m.createdAt.toISOString()}] ${sn}: ${truncate(m.content || '', 120)}`);
      }
    }
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });


