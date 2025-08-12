import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateEditorialItemSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  bdrId: z.string().optional(),
  status: z.enum(['LIST_OUT_QA_INTERVIEW_PROPOSED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'QA_SUBMITTED', 'QA_APPROVED', 'PUBLISHED', 'DECLINED']).optional(),
  notes: z.string().optional(),
  link: z.string().optional(),
  interviewDate: z.string().optional(),
  qaSubmissionDate: z.string().optional(),
  qaApprovedDate: z.string().optional(),
  publicationDate: z.string().optional(),
  publicationLink: z.string().optional(),
  leadId: z.number().optional(),
  pipelineItemId: z.number().optional(),
});

// GET /api/editorial/[id] - Get single editorial item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const item = await prisma.editorialBoardItem.findUnique({
      where: { id },
      include: {
        bdr: {
          select: { name: true, email: true }
        },
        lead: {
          select: { name: true, company: true }
        },
        pipelineItem: {
          select: { name: true, company: true }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Editorial item not found' }, { status: 404 });
    }

    return NextResponse.json(item);

  } catch (error) {
    console.error('Error fetching editorial item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch editorial item' },
      { status: 500 }
    );
  }
}

// PUT /api/editorial/[id] - Update editorial item
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateEditorialItemSchema.parse(body);

    // Convert date strings to Date objects if provided
    const dateFields = ['interviewDate', 'qaSubmissionDate', 'qaApprovedDate', 'publicationDate'];
    const processedData = { ...validatedData };
    
    dateFields.forEach(field => {
      if (processedData[field as keyof typeof processedData]) {
        const dateValue = processedData[field as keyof typeof processedData] as string;
        processedData[field as keyof typeof processedData] = dateValue ? new Date(dateValue) : null;
      }
    });

    const updatedItem = await prisma.editorialBoardItem.update({
      where: { id },
      data: {
        ...processedData,
        lastUpdated: new Date(),
      },
      include: {
        bdr: {
          select: { name: true, email: true }
        },
        lead: {
          select: { name: true, company: true }
        },
        pipelineItem: {
          select: { name: true, company: true }
        }
      }
    });

    return NextResponse.json(updatedItem);

  } catch (error) {
    console.error('Error updating editorial item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update editorial item' },
      { status: 500 }
    );
  }
}

// DELETE /api/editorial/[id] - Delete editorial item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.editorialBoardItem.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting editorial item:', error);
    return NextResponse.json(
      { error: 'Failed to delete editorial item' },
      { status: 500 }
    );
  }
}