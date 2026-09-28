import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

type ChangePasswordResponse = {
  success: boolean;
  data?: { changed?: boolean };
  error?: string;
};

function isAllowedApiBaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return process.env.NODE_ENV === 'development'
      && url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const passwordBody = body as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = typeof passwordBody.currentPassword === 'string' ? passwordBody.currentPassword : '';
  const newPassword = typeof passwordBody.newPassword === 'string' ? passwordBody.newPassword : '';
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 });
  }

  const apiBaseUrl = process.env.API_BASE_URL;
  if (!isAllowedApiBaseUrl(apiBaseUrl)) {
    return NextResponse.json({ error: 'Password change is temporarily unavailable.' }, { status: 503 });
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}/api/admin/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Password change is temporarily unavailable.' }, { status: 503 });
  }

  const payload = await backendResponse.json().catch(() => null) as ChangePasswordResponse | null;
  if (!backendResponse.ok || !payload?.success) {
    return NextResponse.json(
      { error: payload?.error || 'Unable to change password.' },
      { status: backendResponse.ok ? 502 : backendResponse.status },
    );
  }

  return NextResponse.json({ changed: Boolean(payload.data?.changed) });
}
