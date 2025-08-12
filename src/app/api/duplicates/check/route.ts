import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { duplicateDetectionService, DuplicateCheckInput } from '@/lib/duplicate-detection';
import { DuplicateAction } from '@prisma/client';
import { z } from 'zod';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';

// Request schema validation
const checkDuplicatesSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  title: z.string().optional(),
  action: z.enum(['LEAD_CREATE', 'LEAD_UPDATE', 'PIPELINE_CREATE', 'PIPELINE_UPDATE', 'CONTACT_ADD', 'COMPANY_ADD']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - user needs duplicate read permission OR lead create permission
    if (!hasPermission(session.user as any, PERMISSIONS.DUPLICATES.READ.resource, PERMISSIONS.DUPLICATES.READ.action) &&
        !hasPermission(session.user as any, PERMISSIONS.LEADS.CREATE.resource, PERMISSIONS.LEADS.CREATE.action)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = checkDuplicatesSchema.parse(body);
    
    // Convert action string to enum if provided
    const action = validatedData.action 
      ? DuplicateAction[validatedData.action as keyof typeof DuplicateAction]
      : DuplicateAction.LEAD_CREATE;
    
    // Prepare input for duplicate check
    const checkInput: DuplicateCheckInput = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      company: validatedData.company,
      linkedinUrl: validatedData.linkedinUrl,
      title: validatedData.title,
    };
    
    // Perform duplicate check
    const result = await duplicateDetectionService.checkForDuplicates(
      checkInput,
      session.user.id,
      action
    );
    
    // Filter sensitive information based on user role
    const filteredResult = {
      hasWarning: result.hasWarning,
      severity: result.severity,
      warningId: result.warningId,
      message: result.message,
      matches: result.matches.map(match => ({
        id: match.id,
        matchType: match.matchType,
        confidence: match.confidence,
        severity: match.severity,
        matchDetails: {
          // Include basic match info but filter sensitive details
          type: match.matchDetails.exactMatch ? 'exact' : 'similar',
          field: match.matchType.toLowerCase(),
        },
        existingRecord: {
          type: match.existingRecord.type,
          company: match.existingRecord.company,
          lastContactDate: match.existingRecord.lastContactDate,
          status: match.existingRecord.status,
          isActive: match.existingRecord.isActive,
          // Only include owner info if user has appropriate permissions
          owner: hasPermission(session.user as any, PERMISSIONS.USERS.VIEW_ALL.resource, PERMISSIONS.USERS.VIEW_ALL.action) ? 
            match.existingRecord.owner : 
            { name: match.existingRecord.owner?.name }, // Basic name only
        }
      }))
    };
    
    return NextResponse.json(filteredResult);
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
    
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

// GET endpoint for retrieving specific duplicate warning details
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warningId = searchParams.get('warningId');
    
    if (!warningId) {
      return NextResponse.json({ error: 'Warning ID required' }, { status: 400 });
    }
    
    // Get the warning details
    const warning = await duplicateDetectionService.getRecentWarnings(1, true);
    const warningDetails = warning.find(w => w.id === warningId);
    
    if (!warningDetails) {
      return NextResponse.json({ error: 'Warning not found' }, { status: 404 });
    }
    
    // Check if user can view this warning (own warning or admin)
    const isOwner = warningDetails.triggeredBy.id === session.user.id;
    const isAdmin = hasPermission(session.user as any, PERMISSIONS.USERS.VIEW_ALL.resource, PERMISSIONS.USERS.VIEW_ALL.action);
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    return NextResponse.json(warningDetails);
    
  } catch (error) {
    console.error('Error retrieving warning details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}