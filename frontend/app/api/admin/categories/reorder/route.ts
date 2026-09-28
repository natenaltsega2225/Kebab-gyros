import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
const SESSION_COOKIE = 'admin_session';
function allowedUrl(value: string | undefined) { try { const url = new URL(value || ''); return url.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')); } catch { return false; } }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray((body as { items?: unknown }).items) || !(body as { items: unknown[] }).items.every((item) => item && typeof item === 'object' && Number.isSafeInteger((item as { id?: unknown }).id) && Number.isSafeInteger((item as { sortOrder?: unknown }).sortOrder) && Number((item as { id: number }).id) > 0 && Number((item as { sortOrder: number }).sortOrder) >= 0)) return NextResponse.json({ error: 'Invalid reorder data.' }, { status: 400 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value; const apiBaseUrl = process.env.API_BASE_URL;
  if (!token) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!allowedUrl(apiBaseUrl)) return NextResponse.json({ error: 'Admin service is temporarily unavailable.' }, { status: 503 });
  try { const response = await fetch(`${apiBaseUrl}/api/admin/categories/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), cache: 'no-store' }); const payload = await response.json().catch(() => null); return NextResponse.json(payload || { error: 'Admin service returned an invalid response.' }, { status: response.status }); } catch { return NextResponse.json({ error: 'Admin service is temporarily unavailable.' }, { status: 503 }); }
}
