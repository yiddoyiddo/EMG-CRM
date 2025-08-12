import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  normalizeCompanyName, 
  normalizePersonName, 
  normalizeEmail, 
  normalizePhone,
  calculateStringSimilarity,
  extractDomainFromEmail,
  DuplicateDetectionService
} from '@/lib/duplicate-detection';
import { DuplicateAction, WarningSeverity, DuplicateType } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    lead: {
      findMany: vi.fn(),
    },
    pipelineItem: {
      findMany: vi.fn(),
    },
    duplicateWarning: {
      create: vi.fn(),
    },
    duplicateAuditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Duplicate Detection Utilities', () => {
  describe('normalizeCompanyName', () => {
    it('should remove common company suffixes', () => {
      expect(normalizeCompanyName('Microsoft Corp')).toBe('microsoft');
      expect(normalizeCompanyName('Apple Inc.')).toBe('apple');
      expect(normalizeCompanyName('Google LLC')).toBe('google');
      expect(normalizeCompanyName('Tesla Limited')).toBe('tesla');
    });

    it('should remove "The" prefix', () => {
      expect(normalizeCompanyName('The Walt Disney Company')).toBe('walt disney company');
    });

    it('should handle empty or null input', () => {
      expect(normalizeCompanyName('')).toBe('');
      expect(normalizeCompanyName(null as any)).toBe('');
    });

    it('should normalize spaces and special characters', () => {
      expect(normalizeCompanyName('  Test & Co.  ')).toBe('test  co');
      expect(normalizeCompanyName('ABC-123 Corp!')).toBe('abc-123');
    });
  });

  describe('normalizePersonName', () => {
    it('should remove common titles and suffixes', () => {
      expect(normalizePersonName('Mr. John Smith')).toBe('john smith');
      expect(normalizePersonName('Dr. Jane Doe Jr.')).toBe('jane doe');
      expect(normalizePersonName('Sir David Williams III')).toBe('david williams');
    });

    it('should handle empty input', () => {
      expect(normalizePersonName('')).toBe('');
    });

    it('should remove special characters', () => {
      expect(normalizePersonName('John O\'Brien')).toBe('john obrien');
      expect(normalizePersonName('Mary-Jane Watson')).toBe('maryjane watson');
    });
  });

  describe('normalizeEmail', () => {
    it('should convert to lowercase and trim', () => {
      expect(normalizeEmail('  John.Smith@EXAMPLE.COM  ')).toBe('john.smith@example.com');
    });

    it('should handle empty input', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('normalizePhone', () => {
    it('should extract only digits', () => {
      expect(normalizePhone('+44 (0) 7700 900123')).toBe('447700900123');
      expect(normalizePhone('07700-900-123')).toBe('07700900123');
      expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
    });

    it('should handle empty input', () => {
      expect(normalizePhone('')).toBe('');
    });
  });

  describe('extractDomainFromEmail', () => {
    it('should extract domain from email', () => {
      expect(extractDomainFromEmail('john@example.com')).toBe('example.com');
      expect(extractDomainFromEmail('user@SUB.DOMAIN.CO.UK')).toBe('sub.domain.co.uk');
    });

    it('should handle invalid email', () => {
      expect(extractDomainFromEmail('invalid-email')).toBe('');
      expect(extractDomainFromEmail('')).toBe('');
    });
  });

  describe('calculateStringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateStringSimilarity('hello', 'hello')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateStringSimilarity('hello', 'world')).toBeLessThan(0.5);
    });

    it('should handle empty strings', () => {
      expect(calculateStringSimilarity('', '')).toBe(1);
      expect(calculateStringSimilarity('hello', '')).toBe(0);
    });

    it('should calculate similarity for similar strings', () => {
      const similarity = calculateStringSimilarity('microsoft', 'microsft');
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should be case sensitive', () => {
      const similarity = calculateStringSimilarity('Hello', 'hello');
      expect(similarity).toBeLessThan(1);
    });
  });
});

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  
  beforeEach(() => {
    service = DuplicateDetectionService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkForDuplicates', () => {
    it('should return no warning for insufficient data', async () => {
      const result = await service.checkForDuplicates(
        { name: 'A' }, // Too short
        'user123',
        DuplicateAction.LEAD_CREATE
      );

      expect(result.hasWarning).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.lead.findMany as any).mockRejectedValue(new Error('Database error'));

      const result = await service.checkForDuplicates(
        { 
          name: 'John Smith',
          email: 'john@example.com',
          company: 'Test Corp'
        },
        'user123',
        DuplicateAction.LEAD_CREATE
      );

      // Should return safe fallback
      expect(result.hasWarning).toBe(false);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('recordDecision', () => {
    it('should record user decision successfully', async () => {
      const { prisma } = await import('@/lib/db');
      (prisma.duplicateWarning.update as any).mockResolvedValue({});
      (prisma.duplicateAuditLog.create as any).mockResolvedValue({});

      await service.recordDecision(
        'warning123',
        'PROCEEDED' as any,
        'user123',
        'I verified this is not a duplicate'
      );

      expect(prisma.duplicateWarning.update).toHaveBeenCalledWith({
        where: { id: 'warning123' },
        data: {
          userDecision: 'PROCEEDED',
          decisionMade: true,
          decisionAt: expect.any(Date),
          proceedReason: 'I verified this is not a duplicate',
        }
      });

      expect(prisma.duplicateAuditLog.create).toHaveBeenCalled();
    });
  });

  describe('getDuplicateStatistics', () => {
    it('should return statistics for given date range', async () => {
      const { prisma } = await import('@/lib/db');
      
      (prisma.duplicateWarning.count as any)
        .mockResolvedValueOnce(100) // Total warnings
        .mockResolvedValueOnce(75)  // Proceed count
        .mockResolvedValueOnce(20); // Cancelled count

      (prisma.duplicateWarning.groupBy as any).mockResolvedValue([
        { severity: 'HIGH', _count: 30 },
        { severity: 'MEDIUM', _count: 50 },
        { severity: 'LOW', _count: 20 }
      ]);

      const stats = await service.getDuplicateStatistics();

      expect(stats.totalWarnings).toBe(100);
      expect(stats.proceedCount).toBe(75);
      expect(stats.cancelledCount).toBe(20);
      expect(stats.proceedRate).toBe(75);
      expect(stats.severityBreakdown).toEqual({
        HIGH: 30,
        MEDIUM: 50,
        LOW: 20
      });
    });
  });

  describe('private methods', () => {
    it('should calculate match severity correctly', () => {
      // Access private method for testing
      const calculateMatchSeverity = (service as any).calculateMatchSeverity.bind(service);
      
      const now = new Date();
      const recentDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const oldDate = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000); // 200 days ago

      // High confidence, recent contact = CRITICAL
      expect(calculateMatchSeverity(0.95, recentDate)).toBe(WarningSeverity.CRITICAL);
      
      // High confidence, old contact = MEDIUM
      expect(calculateMatchSeverity(0.95, oldDate)).toBe(WarningSeverity.MEDIUM);
      
      // Lower confidence = MEDIUM or LOW
      expect(calculateMatchSeverity(0.7, recentDate)).toBe(WarningSeverity.HIGH);
      expect(calculateMatchSeverity(0.5, recentDate)).toBe(WarningSeverity.LOW);
    });

    it('should generate appropriate warning messages', () => {
      const generateWarningMessage = (service as any).generateWarningMessage.bind(service);
      
      const criticalMatch = {
        matchType: DuplicateType.CONTACT_EMAIL,
        severity: WarningSeverity.CRITICAL,
        existingRecord: {
          owner: { name: 'John Doe' },
          lastContactDate: new Date()
        }
      };

      const message = generateWarningMessage([criticalMatch]);
      expect(message).toContain('Potential duplicate detected');
      expect(message).toContain('John Doe');
    });
  });
});