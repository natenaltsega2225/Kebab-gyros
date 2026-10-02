import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

type AdminUser = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
};

type MeResponse = {
  success: boolean;
  data?: Omit<AdminUser, 'mustChangePassword'> & { mustChangePassword: boolean | number | string };
};

function mustChangePassword(value: boolean | number | string) {
  return value === true || value === 1 || value === '1';
}

function isAllowedApiBaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!isAllowedApiBaseUrl(apiBaseUrl)) {
    return NextResponse.json({ error: 'Unable to verify session.' }, { status: 503 });
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}/api/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Unable to verify session.' }, { status: 503 });
  }

  const payload = await backendResponse.json().catch(() => null) as MeResponse | null;
  if (!backendResponse.ok || !payload?.success || !payload.data) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return NextResponse.json({
    user: { ...payload.data, mustChangePassword: mustChangePassword(payload.data.mustChangePassword) },
  });
}
