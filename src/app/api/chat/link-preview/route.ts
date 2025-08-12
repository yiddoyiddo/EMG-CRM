import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, SecurityService } from '@/lib/security';
import { Action, Resource } from '@prisma/client';

const ALLOWLIST = ['github.com','vercel.com','docs.google.com','www.npmjs.com'];

async function fetchMetadata(url: string) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    return { title };
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const hostname = new URL(url).hostname.toLowerCase();
    if (!ALLOWLIST.some((d) => hostname.endsWith(d))) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 400 });
    }
    const data = await withSecurity(Resource.MESSAGING, Action.READ, async () => {
      return await fetchMetadata(url);
    }, req);
    return NextResponse.json(data);
  } catch (err: any) {
    await SecurityService.logAction({ action: 'LINK_PREVIEW', resource: 'MESSAGING', success: false, errorMsg: err?.message }, req);
    return NextResponse.json({ error: 'Failed' }, { status: 400 });
  }
}



