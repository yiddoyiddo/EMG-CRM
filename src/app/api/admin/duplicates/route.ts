import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { duplicateDetectionService } from '@/lib/duplicate-detection';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';

// Request schema for statistics
const statisticsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// GET endpoint for duplicate statistics and management data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!hasPermission(session.user as any, PERMISSIONS.DUPLICATES.MANAGE.resource, PERMISSIONS.DUPLICATES.MANAGE.action) &&
        !hasPermission(session.user as any, PERMISSIONS.DUPLICATES.VIEW_ALL.resource, PERMISSIONS.DUPLICATES.VIEW_ALL.action)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'statistics';
    
    switch (action) {
      case 'statistics': {
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        
        const dateRange = (dateFrom && dateTo) ? {
          from: new Date(dateFrom),
          to: new Date(dateTo),
        } : undefined;
        
        const statistics = await duplicateDetectionService.getDuplicateStatistics(dateRange);
        
        return NextResponse.json(statistics);
      }
      
      case 'recent-warnings': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const includeResolved = searchParams.get('includeResolved') === 'true';
        
        const warnings = await duplicateDetectionService.getRecentWarnings(limit, includeResolved);
        
        return NextResponse.json(warnings);
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error in admin duplicates endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}