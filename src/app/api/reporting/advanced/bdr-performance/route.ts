import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'week';
    const territory = searchParams.get('territory');
    const experience = searchParams.get('experience');
    const status = searchParams.get('status');
    const minCalls = parseInt(searchParams.get('minCalls') || '0');
    const maxCalls = parseInt(searchParams.get('maxCalls') || '1000');
    const minConversion = parseFloat(searchParams.get('minConversion') || '0');
    const maxConversion = parseFloat(searchParams.get('maxConversion') || '100');

    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(new Date());
        endDate = endOfDay(new Date());
        break;
      case 'week':
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'quarter':
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      default:
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    // Build where clause for users
    const userWhere: any = {
      role: 'BDR',
      isActive: true
    };

    if (status && status !== 'all') {
      userWhere.isActive = status === 'active';
    }

    // Get all BDRs with their basic info
    const bdrs = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        territoryId: true,
        territory: {
          select: {
            name: true
          }
        },
        createdAt: true
      }
    });

    // Filter by territory if specified
    let filteredBdrs = bdrs;
    if (territory && territory !== 'all') {
      filteredBdrs = bdrs.filter(bdr => bdr.territory?.name?.toLowerCase().includes(territory.toLowerCase()));
    }

    // Filter by experience level
    if (experience && experience !== 'all') {
      const now = new Date();
      filteredBdrs = filteredBdrs.filter(bdr => {
        const experienceYears = (now.getTime() - bdr.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
        switch (experience) {
          case 'junior':
            return experienceYears < 1;
          case 'mid':
            return experienceYears >= 1 && experienceYears < 3;
          case 'senior':
            return experienceYears >= 3;
          default:
            return true;
        }
      });
    }

    // Get performance data for each BDR
    const performanceData = await Promise.all(
      filteredBdrs.map(async (bdr) => {
        // Get activity logs for the date range
        const activityLogs = await prisma.activityLog.findMany({
          where: {
            bdrId: bdr.id,
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        // Calculate metrics
        const callsToday = await prisma.activityLog.count({
          where: {
            bdrId: bdr.id,
            activityType: 'call',
            timestamp: {
              gte: startOfDay(new Date()),
              lte: endOfDay(new Date())
            }
          }
        });

        const callsWeek = await prisma.activityLog.count({
          where: {
            bdrId: bdr.id,
            activityType: 'call',
            timestamp: {
              gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
              lte: endOfWeek(new Date(), { weekStartsOn: 1 })
            }
          }
        });

        const callsMonth = await prisma.activityLog.count({
          where: {
            bdrId: bdr.id,
            activityType: 'call',
            timestamp: {
              gte: startOfMonth(new Date()),
              lte: endOfMonth(new Date())
            }
          }
        });

        const agreementsToday = await prisma.pipelineItem.count({
          where: {
            bdrId: bdr.id,
            agreementDate: {
              gte: startOfDay(new Date()),
              lte: endOfDay(new Date())
            }
          }
        });

        const agreementsWeek = await prisma.pipelineItem.count({
          where: {
            bdrId: bdr.id,
            agreementDate: {
              gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
              lte: endOfWeek(new Date(), { weekStartsOn: 1 })
            }
          }
        });

        const agreementsMonth = await prisma.pipelineItem.count({
          where: {
            bdrId: bdr.id,
            agreementDate: {
              gte: startOfMonth(new Date()),
              lte: endOfMonth(new Date())
            }
          }
        });

        // Calculate conversion rate
        const conversionRate = callsWeek > 0 ? (agreementsWeek / callsWeek) * 100 : 0;

        // Get average call duration (mock data for now)
        const avgCallDuration = Math.random() * 5 + 2; // 2-7 minutes

        // Get lead metrics
        const leadsAssigned = await prisma.lead.count({
          where: {
            bdrId: bdr.id
          }
        });

        const leadsContacted = await prisma.lead.count({
          where: {
            bdrId: bdr.id,
            status: 'contacted'
          }
        });

        // Get follow-ups scheduled
        const followUpsScheduled = await prisma.pipelineItem.count({
          where: {
            bdrId: bdr.id,
            status: 'follow_up'
          }
        });

        // Calculate weekly goal progress (mock data)
        const weeklyGoalProgress = Math.min(100, Math.random() * 120);

        // Calculate monthly rank (mock data)
        const monthlyRank = Math.floor(Math.random() * 20) + 1;

        // Calculate streak (mock data)
        const streak = Math.floor(Math.random() * 10) + 1;

        // Calculate last week performance (mock data)
        const lastWeekPerformance = Math.random() * 100;

        // Determine experience level
        const now = new Date();
        const experienceYears = (now.getTime() - bdr.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
        let experienceLevel = 'senior';
        if (experienceYears < 1) experienceLevel = 'junior';
        else if (experienceYears < 3) experienceLevel = 'mid';

        return {
          id: bdr.id,
          name: bdr.name || 'Unknown BDR',
          callsToday,
          callsWeek,
          callsMonth,
          agreementsToday,
          agreementsWeek,
          agreementsMonth,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgCallDuration: Math.round(avgCallDuration * 10) / 10,
          leadsAssigned,
          leadsContacted,
          followUpsScheduled,
          weeklyGoalProgress: Math.round(weeklyGoalProgress),
          monthlyRank,
          streak,
          lastWeekPerformance: Math.round(lastWeekPerformance),
          territory: bdr.territory?.name || 'Unassigned',
          experience: experienceLevel,
          status: bdr.isActive ? 'active' : 'inactive'
        };
      })
    );

    // Apply filters
    let filteredData = performanceData;

    // Filter by call count
    filteredData = filteredData.filter(bdr => 
      bdr.callsWeek >= minCalls && bdr.callsWeek <= maxCalls
    );

    // Filter by conversion rate
    filteredData = filteredData.filter(bdr => 
      bdr.conversionRate >= minConversion && bdr.conversionRate <= maxConversion
    );

    // Sort by weekly goal progress (descending)
    filteredData.sort((a, b) => b.weeklyGoalProgress - a.weeklyGoalProgress);

    return NextResponse.json(filteredData);
  } catch (error) {
    console.error('Error fetching BDR performance data:', error);
    return NextResponse.json({ 
      error: (error as Error).message,
      data: null
    }, { status: 500 });
  }
}
