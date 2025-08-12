import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as checkDuplicates } from '@/app/api/duplicates/check/route';
import { POST as recordDecision } from '@/app/api/duplicates/decision/route';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock('@/lib/auth-options', () => ({
  authOptions: {},
}));

// Mock permissions
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
  PERMISSIONS: {
    DUPLICATES: {
      READ: { resource: 'DUPLICATES', action: 'READ' }
    },
    LEADS: {
      CREATE: { resource: 'LEADS', action: 'CREATE' }
    }
  }
}));

// Mock duplicate detection service
vi.mock('@/lib/duplicate-detection', () => ({
  duplicateDetectionService: {
    checkForDuplicates: vi.fn(),
    recordDecision: vi.fn(),
  },
  DuplicateAction: {
    LEAD_CREATE: 'LEAD_CREATE',
  }
}));

describe('/api/duplicates/check', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getServerSession } = vi.mocked(await import('next-auth'));
    const { hasPermission } = vi.mocked(await import('@/lib/permissions'));
    
    getServerSession.mockResolvedValue(mockSession);
    hasPermission.mockReturnValue(true);
  });

  it('should require authentication', async () => {
    const { getServerSession } = vi.mocked(await import('next-auth'));
    getServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/duplicates/check', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })
    });

    const response = await checkDuplicates(request);
    expect(response.status).toBe(401);
  });

  it('should require proper permissions', async () => {
    const { hasPermission } = vi.mocked(await import('@/lib/permissions'));
    hasPermission.mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/duplicates/check', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })
    });

    const response = await checkDuplicates(request);
    expect(response.status).toBe(403);
  });

  it('should validate request data', async () => {
    const request = new NextRequest('http://localhost/api/duplicates/check', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email' // Invalid email format
      })
    });

    const response = await checkDuplicates(request);
    expect(response.status).toBe(400);
  });

  it('should successfully check for duplicates', async () => {
    const { duplicateDetectionService } = vi.mocked(await import('@/lib/duplicate-detection'));
    
    const mockResult = {
      hasWarning: true,
      severity: 'HIGH',
      warningId: 'warning123',
      message: 'Potential duplicate found',
      matches: [
        {
          id: 'match1',
          matchType: 'CONTACT_EMAIL',
          confidence: 0.95,
          severity: 'HIGH',
          matchDetails: { type: 'exact' },
          existingRecord: {
            type: 'lead',
            company: 'Test Corp',
            owner: { name: 'Jane Doe' }
          }
        }
      ]
    };

    duplicateDetectionService.checkForDuplicates.mockResolvedValue(mockResult);

    const request = new NextRequest('http://localhost/api/duplicates/check', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Test Corp'
      })
    });

    const response = await checkDuplicates(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.hasWarning).toBe(true);
    expect(data.matches).toHaveLength(1);
    expect(data.warningId).toBe('warning123');
  });

  it('should handle service errors gracefully', async () => {
    const { duplicateDetectionService } = vi.mocked(await import('@/lib/duplicate-detection'));
    duplicateDetectionService.checkForDuplicates.mockRejectedValue(new Error('Service error'));

    const request = new NextRequest('http://localhost/api/duplicates/check', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })
    });

    const response = await checkDuplicates(request);
    expect(response.status).toBe(500);
  });
});

describe('/api/duplicates/decision', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User'
    }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getServerSession } = vi.mocked(await import('next-auth'));
    const { hasPermission } = vi.mocked(await import('@/lib/permissions'));
    
    getServerSession.mockResolvedValue(mockSession);
    hasPermission.mockReturnValue(true);
  });

  it('should require authentication', async () => {
    const { getServerSession } = vi.mocked(await import('next-auth'));
    getServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/duplicates/decision', {
      method: 'POST',
      body: JSON.stringify({
        warningId: 'warning123',
        decision: 'PROCEEDED'
      })
    });

    const response = await recordDecision(request);
    expect(response.status).toBe(401);
  });

  it('should validate request data', async () => {
    const request = new NextRequest('http://localhost/api/duplicates/decision', {
      method: 'POST',
      body: JSON.stringify({
        warningId: 'invalid-id', // Not a valid CUID
        decision: 'INVALID_DECISION'
      })
    });

    const response = await recordDecision(request);
    expect(response.status).toBe(400);
  });

  it('should successfully record decision', async () => {
    const { duplicateDetectionService } = vi.mocked(await import('@/lib/duplicate-detection'));
    duplicateDetectionService.recordDecision.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/duplicates/decision', {
      method: 'POST',
      body: JSON.stringify({
        warningId: 'clh5k9j0a0000qh8x2v2nq7r0', // Valid CUID format
        decision: 'PROCEEDED',
        reason: 'Verified not a duplicate'
      })
    });

    const response = await recordDecision(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);

    expect(duplicateDetectionService.recordDecision).toHaveBeenCalledWith(
      'clh5k9j0a0000qh8x2v2nq7r0',
      'PROCEEDED',
      'user123',
      'Verified not a duplicate'
    );
  });

  it('should handle service errors', async () => {
    const { duplicateDetectionService } = vi.mocked(await import('@/lib/duplicate-detection'));
    duplicateDetectionService.recordDecision.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/duplicates/decision', {
      method: 'POST',
      body: JSON.stringify({
        warningId: 'clh5k9j0a0000qh8x2v2nq7r0',
        decision: 'CANCELLED'
      })
    });

    const response = await recordDecision(request);
    expect(response.status).toBe(500);
  });
});