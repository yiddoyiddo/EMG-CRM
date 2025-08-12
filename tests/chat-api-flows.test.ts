import { describe, it, expect } from 'vitest';
import { GET as getSearch } from '@/app/api/chat/search/route';

describe('Chat API - search unauthenticated', () => {
  it('rejects unauthenticated search', async () => {
    const req = new Request('http://localhost/api/chat/search?q=test');
    await expect(getSearch(req as any)).rejects.toBeTruthy();
  });
});


