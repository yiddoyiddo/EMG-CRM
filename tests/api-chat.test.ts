import { describe, it, expect } from 'vitest';
import { GET as getConversations, POST as postConversation } from '@/app/api/chat/conversations/route';

describe('API: Chat basic', () => {
  it('rejects unauthenticated access', async () => {
    const req = new Request('http://localhost/api/chat/conversations');
    await expect(getConversations(req as any)).rejects.toBeTruthy();
  });
});



