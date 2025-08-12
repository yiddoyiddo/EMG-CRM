import { NextRequest } from 'next/server';
import { lookup as lookupMime } from 'mime-types';

export type AllowedUpload = {
  mime: string;
  size: number; // bytes
};

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'application/pdf', 'application/vnd', 'text/plain'];

export function validateUpload({ mime, size }: AllowedUpload) {
  if (!mime || !ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    throw new Error('Unsupported file type');
  }
  if (size <= 0 || size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File too large');
  }
}

// Minimal Vercel Blob direct upload URL creator via REST
export async function createDirectUploadUrl({ filename, mime, size }: { filename: string; mime: string; size: number }) {
  validateUpload({ mime, size });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Blob token not configured');

  const res = await fetch('https://api.vercel.com/v2/blobs/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, contentType: mime, size }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create upload URL: ${text}`);
  }
  return (await res.json()) as { url: string; uploadUrl: string; pathname: string };
}


