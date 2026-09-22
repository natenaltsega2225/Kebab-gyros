import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './db';

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return value;
}

export async function createSession(user, request) {
  const jti = crypto.randomUUID();
  const days = Number(process.env.SESSION_DAYS || 7);
  await db.query(
    `INSERT INTO admin_sessions (user_id, jti, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [user.id, jti, request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, request.headers.get('user-agent') || null, days]
  );
  const token = jwt.sign({ sub: String(user.id), username: user.username, email: user.email, role: user.role, jti }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  return token;
}

export async function requireAuth(request, roles = ['admin', 'manager'], options = {}) {
  const [scheme, token] = (request.headers.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return { ok: false, status: 401, error: 'Authentication required' };
  try {
    const payload = jwt.verify(token, secret());
    if (!roles.includes(payload.role)) return { ok: false, status: 403, error: 'Insufficient permission' };
    const [sessions] = await db.query(
      `SELECT s.id, s.revoked_at, s.expires_at, u.is_active, u.must_change_password
       FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id
       WHERE s.jti=? AND s.user_id=? LIMIT 1`,
      [payload.jti, Number(payload.sub)]
    );
    const s = sessions[0];
    if (!s || s.revoked_at || !s.is_active || new Date(s.expires_at) <= new Date()) return { ok: false, status: 401, error: 'Session expired or revoked' };
    const mustChangePassword = Boolean(s.must_change_password);
    if (mustChangePassword && !options.allowMustChangePassword) return { ok: false, status: 403, error: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' };
    return { ok: true, user: { ...payload, id: Number(payload.sub), mustChangePassword } };
  } catch {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }
}

export const requireAdmin = (request) => requireAuth(request, ['admin']);
