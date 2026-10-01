import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 8;

type AdminUser = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
};

type LoginResponse = {
  success: boolean;
  data?: { token?: string; user?: AdminUser };
  error?: string;
};

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

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const loginBody = body as { username?: unknown; password?: unknown };
  const username = typeof loginBody.username === 'string' ? loginBody.username.trim() : '';
  const password = typeof loginBody.password === 'string' ? loginBody.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const apiBaseUrl = process.env.API_BASE_URL;
  if (!isAllowedApiBaseUrl(apiBaseUrl)) {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
  }

  const payload = await backendResponse.json().catch(() => null) as LoginResponse | null;
  const token = payload?.data?.token;
  const user = payload?.data?.user;
  if (!backendResponse.ok || !payload?.success || !token || !user) {
    return NextResponse.json(
      { error: payload?.error || 'Unable to sign in.' },
      { status: backendResponse.ok ? 502 : backendResponse.status },
    );
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.ADMIN_HTTP_PREVIEW !== '1',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
