import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const editorialItemSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  bdrId: z.string(),
  status: z.enum(['LIST_OUT_QA_INTERVIEW_PROPOSED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'QA_SUBMITTED', 'QA_APPROVED', 'PUBLISHED', 'DECLINED']),
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

// GET /api/editorial - Get all editorial board items
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bdr = searchParams.get('bdr') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (bdr) where.bdrId = bdr;
    if (status) where.status = status;

    const [items, totalCount] = await Promise.all([
      prisma.editorialBoardItem.findMany({
        where,
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
        },
        orderBy: [
          { status: 'asc' },
          { lastUpdated: 'desc' }
        ],
        skip,
        take: pageSize,
      }),
      prisma.editorialBoardItem.count({ where })
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      }
    });

  } catch (error) {
    console.error('Error fetching editorial items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch editorial items' },
      { status: 500 }
    );
  }
}

// POST /api/editorial - Create new editorial board item
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = editorialItemSchema.parse(body);

    // Convert date strings to Date objects if provided
    const dateFields = ['interviewDate', 'qaSubmissionDate', 'qaApprovedDate', 'publicationDate'];
    const processedData = { ...validatedData };
    
    dateFields.forEach(field => {
      if (processedData[field as keyof typeof processedData]) {
        processedData[field as keyof typeof processedData] = new Date(processedData[field as keyof typeof processedData] as string);
      }
    });

    const editorialItem = await prisma.editorialBoardItem.create({
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

    return NextResponse.json(editorialItem, { status: 201 });

  } catch (error) {
    console.error('Error creating editorial item:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create editorial item' },
      { status: 500 }
    );
  }
}