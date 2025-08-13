import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sanitizeEmailHtml } from '@/lib/html';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

interface Params {
  params: { id: string } | Promise<{ id: string }>;
}

// GET /api/templates/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const data = await withSecurity(Resource.TEMPLATES, Action.READ, async () => {
      const tpl = await prisma.template.findUnique({
        where: { id },
        include: { category: true, createdBy: { select: { id: true, name: true } }, updatedBy: { select: { id: true, name: true } } },
      });
      if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      return tpl;
    }, req);

    if ('status' in (data as any)) return data as any;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Template GET failed:', err);
    await SecurityService.logAction({ action: 'READ', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to fetch template', detail: err?.message }, { status: 500 });
  }
}

// PUT /api/templates/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const data = await withSecurity(Resource.TEMPLATES, Action.UPDATE, async (context) => {
      const { title, content, type, tags, categoryId, isArchived } = body as any;
      const exists = await prisma.template.findUnique({ where: { id } });
      if (!exists) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

      const updated = await prisma.template.update({
        where: { id },
        data: {
          title: title ?? exists.title,
          content: typeof content === 'string' ? sanitizeEmailHtml(content) : exists.content,
          type: type ?? exists.type,
          tags: tags ?? exists.tags,
          categoryId: typeof categoryId === 'undefined' ? exists.categoryId : categoryId,
          isArchived: typeof isArchived === 'boolean' ? isArchived : exists.isArchived,
          updatedById: context.userId,
        },
      });
      return updated;
    }, req);

    if ('status' in (data as any)) return data as any;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Template PUT failed:', err);
    await SecurityService.logAction({ action: 'UPDATE', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to update template', detail: err?.message }, { status: 500 });
  }
}

// DELETE /api/templates/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    await withSecurity(Resource.TEMPLATES, Action.DELETE, async () => {
      await prisma.template.delete({ where: { id } });
    }, req);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Template DELETE failed:', err);
    await SecurityService.logAction({ action: 'DELETE', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to delete template', detail: err?.message }, { status: 500 });
  }
}


