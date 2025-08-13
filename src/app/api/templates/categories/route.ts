import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

// GET /api/templates/categories - list categories
export async function GET(req: NextRequest) {
  try {
    const data = await withSecurity(Resource.TEMPLATES, Action.READ, async () => {
      const categories = await prisma.templateCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
      const counts = await prisma.template.groupBy({ by: ['categoryId'], _count: { _all: true } });
      const countsMap = new Map(counts.map(c => [c.categoryId, c._count._all]));
      return categories.map(c => ({ ...c, templateCount: countsMap.get(c.id) || 0 }));
    }, req);
    return NextResponse.json({ categories: data });
  } catch (err: any) {
    console.error('Template categories GET failed:', err);
    await SecurityService.logAction({ action: 'LIST', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to load categories', detail: err?.message }, { status: 500 });
  }
}

// POST /api/templates/categories - create category
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await withSecurity(Resource.TEMPLATES, Action.CREATE, async () => {
      const { name, description, sortOrder } = body as { name: string; description?: string; sortOrder?: number };
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      const category = await prisma.templateCategory.create({ data: { name, description: description || null, sortOrder: sortOrder ?? 0 } });
      return category;
    }, req);
    if ('status' in (data as any)) return data as any;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('Template categories POST failed:', err);
    await SecurityService.logAction({ action: 'CREATE', resource: 'TEMPLATES', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to create category', detail: err?.message }, { status: 500 });
  }
}


