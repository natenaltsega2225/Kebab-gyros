import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function allowedUrl(value: string | undefined) { try { const url = new URL(value || ''); return url.protocol === 'https:' || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')); } catch { return false; } }

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  if (!/^\d+$/.test(id) || Number(id) < 1) return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
  const token = (await cookies()).get('admin_session')?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!token) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!allowedUrl(apiBaseUrl)) return NextResponse.json({ error: 'Admin service is temporarily unavailable.' }, { status: 503 });
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}/reset-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) return NextResponse.json(payload || { error: 'Admin service returned an invalid response.' }, { status: response.status });
    const data = (payload as { data?: Record<string, unknown> } | null)?.data;
    if (!data) return NextResponse.json({ error: 'Admin service returned an invalid response.' }, { status: 502 });
    return NextResponse.json({ success: true, data: { id: data.id, username: data.username, mustChangePassword: data.mustChangePassword, credentialDelivery: data.credentialDelivery } }, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Admin service is temporarily unavailable.' }, { status: 503 });
  }
}
