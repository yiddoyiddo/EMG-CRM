import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/authorize';

export const GET = requireRole(['admin','manager'], async function (req: NextRequest) {
  const targets = await prisma.kpiTarget.findMany();
  return NextResponse.json(targets);
});

export const PUT = requireRole(['admin'], async function (req: NextRequest) {
  const body = await req.json(); // expects [{name,value}]
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  for (const t of body) {
    await prisma.kpiTarget.upsert({
      where: { name: t.name },
      update: { value: t.value },
      create: { name: t.name, value: t.value },
    });
  }
  const targets = await prisma.kpiTarget.findMany();
  return NextResponse.json(targets);
}); 