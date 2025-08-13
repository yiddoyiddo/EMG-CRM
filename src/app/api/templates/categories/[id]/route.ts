import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

interface Params { params: { id: string } | Promise<{ id: string }>; }

// PUT /api/templates/categories/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const data = await withSecurity(Resource.TEMPLATES, Action.UPDATE, async () => {
      const { name, description, sortOrder } = body as { name?: string; description?: string; sortOrder?: number };
      const exists = await prisma.templateCategory.findUnique({ where: { id } });
      if (!exists) return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      const updated = await prisma.templateCategory.update({
        where: { id },
        data: {
          name: name ?? exists.name,
          description: typeof description === 'undefined' ? exists.description : description,
          sortOrder: typeof sortOrder === 'number' ? sortOrder : exists.sortOrder,
        }
      });
      return updated;
    }, req);
    if ('status' in (data as any)) return data as any;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Template category PUT failed:', err);
    await SecurityService.logAction({ action: 'UPDATE', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to update category', detail: err?.message }, { status: 500 });
  }
}

// DELETE /api/templates/categories/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    await withSecurity(Resource.TEMPLATES, Action.DELETE, async () => {
      // Disallow delete if category has templates unless move is specified
      const count = await prisma.template.count({ where: { categoryId: id } });
      if (count > 0) {
        return NextResponse.json({ error: 'Category not empty. Move templates first.' }, { status: 400 });
      }
      await prisma.templateCategory.delete({ where: { id } });
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Template category DELETE failed:', err);
    await SecurityService.logAction({ action: 'DELETE', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to delete category', detail: err?.message }, { status: 500 });
  }
}


