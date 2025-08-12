import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';
import { createDirectUploadUrl } from '@/lib/uploads';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await withSecurity(Resource.MESSAGING, Action.CREATE, async () => {
      const { filename, mime, size } = body as { filename: string; mime: string; size: number };
      const url = await createDirectUploadUrl({ filename, mime, size });
      return url;
    }, req);
    return NextResponse.json(result);
  } catch (err: any) {
    await SecurityService.logAction({ action: 'CREATE', resource: 'MESSAGING', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 400 });
  }
}


