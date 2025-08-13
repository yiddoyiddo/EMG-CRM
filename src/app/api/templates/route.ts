import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sanitizeEmailHtml } from '@/lib/html';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

// GET /api/templates - list templates with optional filters
export async function GET(req: NextRequest) {
  try {
    const data = await withSecurity(Resource.TEMPLATES, Action.READ, async () => {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || '';
      const type = searchParams.get('type') || undefined;
      const categoryId = searchParams.get('categoryId') || undefined;
      const includeArchived = searchParams.get('includeArchived') === '1';
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '50');
      const skip = (page - 1) * pageSize;

      const where: any = {};
      if (!includeArchived) where.isArchived = false;
      if (categoryId) where.categoryId = categoryId;
      if (type) where.type = type;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.template.findMany({
          where,
          orderBy: [{ isArchived: 'asc' }, { updatedAt: 'desc' }],
          include: { category: true, createdBy: { select: { id: true, name: true } }, updatedBy: { select: { id: true, name: true } } },
          skip,
          take: pageSize,
        }),
        prisma.template.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }, req);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Templates GET failed:', err);
    await SecurityService.logAction({ action: 'LIST', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to load templates', detail: err?.message }, { status: 500 });
  }
}

// POST /api/templates - create new template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await withSecurity(Resource.TEMPLATES, Action.CREATE, async (context) => {
      const { title, content, type, tags, categoryId } = body as {
        title: string; content: string; type?: string; tags?: string[]; categoryId?: string | null;
      };

      if (!title || !content) {
        return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
      }

      const template = await prisma.template.create({
        data: {
          title,
          content: sanitizeEmailHtml(content),
          type: (type as any) || 'GENERAL',
          tags: tags || [],
          categoryId: categoryId || null,
          createdById: context.userId,
          updatedById: context.userId,
        },
      });

      return template;
    }, req);

    if ('status' in (data as any)) return data as any; // early return if validation response
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Templates POST failed:', err);
    await SecurityService.logAction({ action: 'CREATE', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to create template', detail: err?.message }, { status: 500 });
  }
}


