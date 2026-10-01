import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

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

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const apiBaseUrl = process.env.API_BASE_URL;

  if (token && isAllowedApiBaseUrl(apiBaseUrl)) {
    try {
      await fetch(`${apiBaseUrl}/api/admin/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
    } catch {
      // Clear the browser session even when backend revocation is unavailable.
    }
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: '/admin' },
  });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.ADMIN_HTTP_PREVIEW !== '1',
    path: '/',
    maxAge: 0,
  });
  return response;
}
