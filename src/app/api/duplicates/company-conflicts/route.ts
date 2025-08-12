import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

// GET /api/duplicates/company-conflicts?company=Acme%20Inc&company=Beta%20Ltd&days=14
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companies = searchParams.getAll('company').filter(Boolean);
    const daysParam = parseInt(searchParams.get('days') || '14', 10);
    const days = isNaN(daysParam) ? 14 : Math.max(1, Math.min(daysParam, 365));
    if (companies.length === 0) {
      return NextResponse.json({ conflicts: {} });
    }

    const now = new Date();
    const since = subDays(now, days);

    // Find recent duplicate warnings whose potential duplicate existingCompany matches any provided company
    const warnings = await prisma.duplicateWarning.findMany({
      where: {
        createdAt: { gte: since },
        potentialDuplicates: {
          some: {
            existingCompany: { in: companies },
          },
        },
      },
      select: {
        id: true,
        potentialDuplicates: {
          select: {
            existingCompany: true,
          },
        },
      },
      take: 500,
    });

    const conflictSet = new Set<string>();
    for (const w of warnings) {
      for (const dup of w.potentialDuplicates) {
        if (dup.existingCompany && companies.includes(dup.existingCompany)) {
          conflictSet.add(dup.existingCompany);
        }
      }
    }

    const conflicts: Record<string, boolean> = {};
    for (const c of companies) conflicts[c] = conflictSet.has(c);

    return NextResponse.json({ conflicts, since: since.toISOString() });
  } catch (error: any) {
    console.error('Error fetching company conflicts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch conflicts' }, { status: 500 });
  }
}


