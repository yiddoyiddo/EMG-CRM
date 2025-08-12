import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { WarningSeverity, DuplicateAction } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const channel = searchParams.get('channel'); // optional logical channel e.g., 'finance'

    // Get current date ranges
    const today = new Date();
    const yesterday = subDays(today, 1);
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });

    // Generate notifications based on system events, duplicate warnings, and performance
    const notifications: Array<{ id: string; type: 'success'|'warning'|'error'|'info'; title: string; message: string; timestamp: string; read: boolean; priority: 'low'|'medium'|'high'; userId?: string; }> = [];

    // Recent company conflict alerts (duplicate warnings)
    const recentDuplicateWarnings = await prisma.duplicateWarning.findMany({
      where: {
        createdAt: { gte: subDays(new Date(), 14) },
        warningType: { in: ['COMPANY_NAME', 'COMPANY_DOMAIN'] as any },
      },
      include: {
        triggeredBy: { select: { id: true, name: true } },
        potentialDuplicates: {
          include: { ownedBy: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    for (const warn of recentDuplicateWarnings) {
      const owners = Array.from(new Set(warn.potentialDuplicates.map(m => m.ownedBy?.name).filter(Boolean))) as string[];
      const ownerIds = Array.from(new Set(warn.potentialDuplicates.map(m => m.ownedBy?.id).filter(Boolean))) as string[];
      const priority: 'high'|'medium'|'low' = warn.severity === WarningSeverity.CRITICAL ? 'high' : warn.severity === WarningSeverity.HIGH ? 'high' : warn.severity === WarningSeverity.MEDIUM ? 'medium' : 'low';
      const title = 'Company conflict detected';
      const message = owners.length > 0
        ? `Similar company recently contacted by ${owners.join(', ')}`
        : `Similar company recently contacted by another BDR`;
      const notif = {
        id: `dup-${warn.id}`,
        type: 'warning' as const,
        title,
        message,
        timestamp: warn.createdAt.toISOString(),
        read: false,
        priority,
      };
      // If we have specific owners, create targeted notifications for them too
      notifications.push(notif);
      for (const oid of ownerIds) {
        notifications.push({ ...notif, id: `dup-${warn.id}-${oid}`, userId: oid });
      }
      // Also notify the user who triggered (so they see context)
      if (warn.triggeredBy?.id) notifications.push({ ...notif, id: `dup-${warn.id}-trigger`, userId: warn.triggeredBy.id });
    }

    // Finance channel: surface recent finance entries as notifications if requested
    if (!type || type === 'info' || channel === 'finance') {
      const recentFinance = await prisma.financeEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      for (const e of recentFinance) {
        notifications.push({
          id: `finance-${e.id}`,
          type: 'info' as const,
          title: 'New/Updated Finance Deal',
          message: `${e.company} • ${e.status}${e.gbpAmount ? ` • £${e.gbpAmount}` : ''}`,
          timestamp: (e.createdAt || new Date()).toISOString(),
          read: false,
          priority: 'medium' as const,
        });
      }
    }

    // Performance alerts
    const lowPerformingBdrs = await prisma.user.findMany({
      where: {
        role: 'BDR',
        isActive: true
      },
      include: {
        activityLogs: {
          where: {
            timestamp: {
              gte: startOfThisWeek,
              lte: endOfThisWeek
            },
            activityType: 'call'
          }
        }
      }
    });

    // Check for BDRs with low call volume
    lowPerformingBdrs.forEach(bdr => {
      const weeklyCalls = bdr.activityLogs.length;
      if (weeklyCalls < 20) {
        notifications.push({
          id: `low-calls-${bdr.id}`,
          type: 'warning' as const,
          title: 'Low Call Volume Alert',
          message: `${bdr.name} has only made ${weeklyCalls} calls this week (target: 50+)`,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'medium' as const,
          userId: bdr.id
        });
      }
    });

    // Check for missed daily targets
    const todayCalls = await prisma.activityLog.count({
      where: {
        activityType: 'call',
        timestamp: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      }
    });

    if (todayCalls < 100) {
      notifications.push({
        id: 'low-daily-calls',
        type: 'warning' as const,
        title: 'Daily Call Target Alert',
        message: `Only ${todayCalls} calls made today (target: 100+)`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high' as const
      });
    }

    // Check for high conversion rates (positive notification)
    const highConversionBdrs = await prisma.user.findMany({
      where: {
        role: 'BDR',
        isActive: true
      },
      include: {
        activityLogs: {
          where: {
            timestamp: {
              gte: startOfThisWeek,
              lte: endOfThisWeek
            },
            activityType: 'call'
          }
        },
        pipelineItems: {
          where: {
            agreementDate: {
              gte: startOfThisWeek,
              lte: endOfThisWeek
            }
          }
        }
      }
    });

    highConversionBdrs.forEach(bdr => {
      const calls = bdr.activityLogs.length;
      const agreements = bdr.pipelineItems.length;
      if (calls > 0 && agreements > 0) {
        const conversionRate = (agreements / calls) * 100;
        if (conversionRate > 20) {
          notifications.push({
            id: `high-conversion-${bdr.id}`,
            type: 'success' as const,
            title: 'High Conversion Rate',
            message: `${bdr.name} achieved ${conversionRate.toFixed(1)}% conversion rate this week!`,
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'medium' as const,
            userId: bdr.id
          });
        }
      }
    });

    // System notifications
    notifications.push({
      id: 'system-maintenance',
      type: 'info' as const,
      title: 'System Maintenance',
      message: 'Scheduled maintenance on Sunday 2-4 AM EST',
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'low' as const
    });

    // New feature notification
    notifications.push({
      id: 'new-feature',
      type: 'info' as const,
      title: 'New Advanced Reporting Features',
      message: 'Enhanced BDR performance comparison tools are now available',
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'medium' as const
    });

    // Check for leads that need follow-up
    const leadsNeedingFollowUp = await prisma.lead.count({
      where: {
        status: 'contacted',
        addedDate: {
          lt: subDays(today, 3)
        }
      }
    });

    if (leadsNeedingFollowUp > 10) {
      notifications.push({
        id: 'follow-up-needed',
        type: 'warning' as const,
        title: 'Follow-up Required',
        message: `${leadsNeedingFollowUp} leads need follow-up contact`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high' as const
      });
    }

    // Check for pipeline items expiring soon
    const expiringPipelineItems = await prisma.pipelineItem.count({
      where: {
        expectedCloseDate: {
          gte: today,
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        },
        status: {
          not: 'closed'
        }
      }
    });

    if (expiringPipelineItems > 5) {
      notifications.push({
        id: 'expiring-pipeline',
        type: 'warning' as const,
        title: 'Pipeline Items Expiring',
        message: `${expiringPipelineItems} pipeline items are expected to close this week`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'medium' as const
      });
    }

    // Filter notifications based on query parameters
    let filteredNotifications = notifications;

    if (userId) {
      filteredNotifications = filteredNotifications.filter(n => !n.userId || n.userId === userId);
    }

    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }

    if (priority) {
      filteredNotifications = filteredNotifications.filter(n => n.priority === priority);
    }

    // Sort by priority and timestamp
    filteredNotifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json(filteredNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      notifications: []
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, title, message, priority = 'medium' } = body;

    const notification = {
      id: `notification-${Date.now()}`,
      type: type || 'info',
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      priority,
      userId
    };

    // In a real implementation, you would save this to the database
    // For now, we'll just return the notification
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ 
      error: (error as Error).message
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, read } = body;

    // In a real implementation, you would update the notification in the database
    // For now, we'll just return success
    return NextResponse.json({ 
      success: true,
      message: 'Notification updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ 
      error: (error as Error).message
    }, { status: 500 });
  }
}
