import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export type Role = 'admin' | 'manager' | 'bdr' | 'viewer';

export function requireRole(allowed: Role[], handler: (req: NextRequest) => Promise<NextResponse> | NextResponse) {
  return async function (req: NextRequest) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as Role | undefined;

    if (!session || !role || !allowed.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req);
  } as unknown as (req: NextRequest) => Promise<NextResponse>;
} 