import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'admin_session';

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

  const response = NextResponse.redirect(new URL('/admin', request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
