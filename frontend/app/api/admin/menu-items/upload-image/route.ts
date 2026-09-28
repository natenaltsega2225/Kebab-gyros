import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function allowedUrl(value: string | undefined) {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'An image file is required.' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image.' }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Image files must be 5 MB or smaller.' }, { status: 400 });

  const apiBaseUrl = process.env.API_BASE_URL;
  if (!allowedUrl(apiBaseUrl)) return NextResponse.json({ error: 'Image upload is temporarily unavailable.' }, { status: 503 });

  const backendFormData = new FormData();
  backendFormData.set('file', file);
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/menu-items/upload-image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: backendFormData, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload || { error: 'Image service returned an invalid response.' }, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Image upload is temporarily unavailable.' }, { status: 503 });
  }
}
