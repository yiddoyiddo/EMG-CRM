import { NextRequest, NextResponse } from 'next/server';
import { SecurityService, withSecurity } from '@/lib/security';
import { SessionManager } from '@/lib/session-management';
import { prisma } from '@/lib/db';
import { Resource, Action } from '@prisma/client';

// GET - Get user's active sessions
export async function GET(req: NextRequest) {
  return withSecurity(Resource.USERS, Action.READ, async (context) => {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    // Users can only view their own sessions unless they're admin/director
    const targetUserId = (userId && (context.role === 'ADMIN' || context.role === 'DIRECTOR')) 
      ? userId 
      : context.userId;

    const sessions = await SessionManager.getActiveSessions(targetUserId);
    
    return NextResponse.json({
      sessions: sessions.map(session => ({
        ...session,
        isCurrent: req.headers.get('x-session-id') === session.sessionId
      }))
    });
  }, req);
}

// POST - Session management actions
export async function POST(req: NextRequest) {
  return withSecurity(Resource.USERS, Action.MANAGE, async (context) => {
    const body = await req.json();
    const { action, sessionId, userId } = body;

    try {
      switch (action) {
        case 'terminate':
          if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
          }
          
          // Get session to check ownership
          const session = await prisma.userSession.findUnique({
            where: { sessionId }
          });
          
          if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
          }
          
          // Users can only terminate their own sessions unless they're admin/director
          if (session.userId !== context.userId && 
              context.role !== 'ADMIN' && 
              context.role !== 'DIRECTOR') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
          }
          
          await SessionManager.terminateSession(sessionId);
          
          await SecurityService.logAction({
            action: 'TERMINATE_SESSION',
            resource: 'USERS',
            resourceId: session.userId,
            details: { terminatedSessionId: sessionId }
          }, req);
          
          return NextResponse.json({ message: 'Session terminated' });

        case 'terminate-all':
          const targetUserId = (userId && (context.role === 'ADMIN' || context.role === 'DIRECTOR')) 
            ? userId 
            : context.userId;
          
          await SessionManager.terminateAllUserSessions(targetUserId);
          
          await SecurityService.logAction({
            action: 'TERMINATE_ALL_SESSIONS',
            resource: 'USERS',
            resourceId: targetUserId,
            details: { terminatedBy: context.userId }
          }, req);
          
          return NextResponse.json({ message: 'All sessions terminated' });

        case 'check-suspicious':
          const checkUserId = (userId && (context.role === 'ADMIN' || context.role === 'DIRECTOR')) 
            ? userId 
            : context.userId;
          
          const suspiciousActivity = await SessionManager.detectSuspiciousActivity(checkUserId);
          
          return NextResponse.json({ suspiciousActivity });

        case 'cleanup':
          if (context.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
          }
          
          const cleanedCount = await SessionManager.cleanupExpiredSessions();
          
          await SecurityService.logAction({
            action: 'CLEANUP_SESSIONS',
            resource: 'SETTINGS',
            details: { cleanedSessions: cleanedCount }
          }, req);
          
          return NextResponse.json({ message: `Cleaned up ${cleanedCount} expired sessions` });

        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Session management failed' 
      }, { status: 500 });
    }
  }, req);
}

// DELETE - Terminate specific session (alternative endpoint)
export async function DELETE(req: NextRequest) {
  return withSecurity(Resource.USERS, Action.MANAGE, async (context) => {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    // Get session to check ownership
    const session = await prisma.userSession.findUnique({
      where: { sessionId }
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Users can only terminate their own sessions unless they're admin/director
    if (session.userId !== context.userId && 
        context.role !== 'ADMIN' && 
        context.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    await SessionManager.terminateSession(sessionId);
    
    await SecurityService.logAction({
      action: 'TERMINATE_SESSION',
      resource: 'USERS',
      resourceId: session.userId,
      details: { terminatedSessionId: sessionId }
    }, req);
    
    return NextResponse.json({ message: 'Session terminated' });
  }, req);
}