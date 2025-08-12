import { prisma } from './db';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export interface SessionConfig {
  maxSessionDuration: number; // in minutes
  maxInactiveDuration: number; // in minutes
  maxConcurrentSessions: number;
  requireSessionValidation: boolean;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxSessionDuration: 480, // 8 hours
  maxInactiveDuration: 60, // 1 hour
  maxConcurrentSessions: 3,
  requireSessionValidation: true
};

export class SessionManager {
  private static config: SessionConfig = DEFAULT_SESSION_CONFIG;

  static setConfig(config: Partial<SessionConfig>) {
    this.config = { ...this.config, ...config };
  }

  static async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<string> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.maxSessionDuration * 60 * 1000);

    // Check for existing active sessions and enforce limit
    const activeSessions = await prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now }
      }
    });

    if (activeSessions >= this.config.maxConcurrentSessions) {
      // Deactivate oldest session
      const oldestSession = await prisma.userSession.findFirst({
        where: {
          userId,
          isActive: true
        },
        orderBy: {
          loginTime: 'asc'
        }
      });

      if (oldestSession) {
        await prisma.userSession.update({
          where: { id: oldestSession.id },
          data: {
            isActive: false,
            logoutTime: now
          }
        });
      }
    }

    // Create new session
    await prisma.userSession.create({
      data: {
        userId,
        sessionId,
        ipAddress,
        userAgent,
        expiresAt
      }
    });

    return sessionId;
  }

  static async validateSession(sessionId: string, userId: string): Promise<boolean> {
    if (!this.config.requireSessionValidation) {
      return true;
    }

    const session = await prisma.userSession.findUnique({
      where: { sessionId }
    });

    if (!session) {
      return false;
    }

    const now = new Date();

    // Check if session is valid
    if (!session.isActive || 
        session.userId !== userId || 
        session.expiresAt < now) {
      return false;
    }

    // Check inactivity timeout
    const inactiveTime = now.getTime() - session.lastActivity.getTime();
    const maxInactiveMs = this.config.maxInactiveDuration * 60 * 1000;

    if (inactiveTime > maxInactiveMs) {
      // Deactivate session
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          logoutTime: now
        }
      });
      return false;
    }

    // Update last activity
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        lastActivity: now
      }
    });

    return true;
  }

  static async updateActivity(sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        sessionId,
        isActive: true
      },
      data: {
        lastActivity: new Date()
      }
    });
  }

  static async terminateSession(sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { sessionId },
      data: {
        isActive: false,
        logoutTime: new Date()
      }
    });
  }

  static async terminateAllUserSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: {
        isActive: false,
        logoutTime: new Date()
      }
    });
  }

  static async getActiveSessions(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: {
        lastActivity: 'desc'
      },
      select: {
        id: true,
        sessionId: true,
        ipAddress: true,
        userAgent: true,
        loginTime: true,
        lastActivity: true
      }
    });
  }

  static async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.userSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            lastActivity: {
              lt: new Date(Date.now() - this.config.maxInactiveDuration * 60 * 1000)
            }
          }
        ],
        isActive: true
      },
      data: {
        isActive: false,
        logoutTime: new Date()
      }
    });

    return result.count;
  }

  static getClientInfo(request: NextRequest): { ipAddress: string; userAgent?: string } {
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    const remote = request.headers.get('x-remote-addr');

    let ipAddress = 'unknown';
    if (forwarded) {
      ipAddress = forwarded.split(',')[0].trim();
    } else if (real) {
      ipAddress = real;
    } else if (remote) {
      ipAddress = remote;
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    return { ipAddress, userAgent };
  }

  // Security monitoring methods
  static async detectSuspiciousActivity(userId: string): Promise<{
    multipleLocations: boolean;
    rapidLogins: boolean;
    unusualTimes: boolean;
  }> {
    const recentSessions = await prisma.userSession.findMany({
      where: {
        userId,
        loginTime: {
          gt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        loginTime: 'desc'
      }
    });

    // Check for multiple IP addresses
    const uniqueIPs = new Set(recentSessions.map(s => s.ipAddress));
    const multipleLocations = uniqueIPs.size > 3;

    // Check for rapid logins (more than 5 in an hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLogins = recentSessions.filter(s => s.loginTime > hourAgo);
    const rapidLogins = recentLogins.length > 5;

    // Check for unusual login times (between 11 PM and 6 AM)
    const nightLogins = recentSessions.filter(s => {
      const hour = s.loginTime.getHours();
      return hour >= 23 || hour <= 6;
    });
    const unusualTimes = nightLogins.length > 2;

    return {
      multipleLocations,
      rapidLogins,
      unusualTimes
    };
  }
}

// Middleware to check session validity
export async function validateSessionMiddleware(
  userId: string,
  sessionId: string
): Promise<boolean> {
  return SessionManager.validateSession(sessionId, userId);
}