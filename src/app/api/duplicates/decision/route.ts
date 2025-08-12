import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { duplicateDetectionService } from '@/lib/duplicate-detection';
import { UserDecision } from '@prisma/client';
import { z } from 'zod';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';

// Request schema validation
const recordDecisionSchema = z.object({
  warningId: z.string().cuid(),
  decision: z.enum(['PROCEEDED', 'CANCELLED', 'IGNORED']),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(session.user as any, PERMISSIONS.LEADS.CREATE.resource, PERMISSIONS.LEADS.CREATE.action)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = recordDecisionSchema.parse(body);
    
    // Convert decision string to enum
    const decision = UserDecision[validatedData.decision as keyof typeof UserDecision];
    
    // Record the decision
    await duplicateDetectionService.recordDecision(
      validatedData.warningId,
      decision,
      session.user.id,
      validatedData.reason
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Decision recorded successfully'
    });
    
  } catch (error) {
    console.error('Error recording duplicate decision:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}