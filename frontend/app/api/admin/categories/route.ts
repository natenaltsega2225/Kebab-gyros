import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';
const CATEGORY_FIELDS = ['name', 'slug', 'sortOrder', 'isActive'] as const;

function allowedUrl(value: string | undefined) { try { const url = new URL(value || ''); return url.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')); } catch { return false; } }
function validCategory(value: unknown, partial = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !CATEGORY_FIELDS.includes(key as typeof CATEGORY_FIELDS[number]))) return null;
  if (!partial && CATEGORY_FIELDS.some((key) => !(key in body))) return null;
  if (!partial && typeof body.name !== 'string') return null;
  if ('name' in body && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80 || body.name.trim().toLowerCase() === 'popular')) return null;
  if ('slug' in body && (typeof body.slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(body.slug.trim()) || body.slug.trim() === 'popular')) return null;
  if ('sortOrder' in body && (!Number.isInteger(body.sortOrder) || (body.sortOrder as number) < 0)) return null;
  if ('isActive' in body && typeof body.isActive !== 'boolean') return null;
  return body;
}
async function backend(path: string, init?: RequestInit) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!token) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!allowedUrl(apiBaseUrl)) return NextResponse.json({ error: 'Admin service is temporarily unavailable.' }, { status: 503 });
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    return NextResponse.json(payload || { error: 'Admin service returned an invalid response.' }, { status: response.status });
  } catch { return NextResponse.json({ error: 'Admin service is temporarily unavailable.' }, { status: 503 }); }
}
export async function GET() { return backend('/api/admin/categories'); }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const category = validCategory(body);
  if (!category) return NextResponse.json({ error: 'Invalid category data.' }, { status: 400 });
  return backend('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(category) });
}
