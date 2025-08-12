import { prisma } from '@/lib/db';

export async function canSendMessage(userId: string, conversationId: string) {
  // 10 messages per 10 seconds per conversation
  const since = new Date(Date.now() - 10 * 1000);
  const count = await prisma.message.count({
    where: { senderId: userId, conversationId, createdAt: { gt: since } },
  });
  return count < 10;
}

export async function canEditMessage(userId: string) {
  const since = new Date(Date.now() - 60 * 1000);
  const edits = await prisma.auditLog.count({
    where: { userId, action: 'UPDATE', resource: 'MESSAGING', timestamp: { gt: since } },
  });
  return edits < 5;
}

export async function canUpload(userId: string) {
  const since = new Date(Date.now() - 60 * 1000);
  const uploads = await prisma.auditLog.count({
    where: { userId, action: 'UPLOAD', resource: 'MESSAGING', timestamp: { gt: since } },
  });
  return uploads < 10;
}



