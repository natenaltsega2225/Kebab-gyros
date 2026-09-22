import { db } from '../../../../../lib/db';
import { ok, fail } from '../../../../../lib/http';
import { verifyPassword } from '../../../../../lib/security';
import { createSession } from '../../../../../lib/auth';
import { audit } from '../../../../../lib/audit';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = String(body.username || body.email || '').trim();
    const password = String(body.password || '');
    if (!identifier || !password) return fail('Username/email and password are required',400);
    const [rows] = await db.query(`SELECT id,username,email,full_name,role,password_hash,must_change_password,is_active,failed_login_count,locked_until FROM admin_users WHERE username=? OR email=? LIMIT 1`, [identifier, identifier.toLowerCase()]);
    const user = rows[0];
    if (!user || !user.is_active) return fail('Invalid credentials',401);
    if (user.locked_until && new Date(user.locked_until) > new Date()) return fail('Account temporarily locked. Try again later.',423);
    const valid = await verifyPassword(password,user.password_hash);
    if (!valid) {
      const max = Number(process.env.LOGIN_MAX_FAILURES || 5);
      const mins = Number(process.env.LOGIN_LOCK_MINUTES || 15);
      const next = Number(user.failed_login_count || 0) + 1;
      await db.query(`UPDATE admin_users SET failed_login_count=?, locked_until=CASE WHEN ? >= ? THEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE) ELSE NULL END WHERE id=?`, [next,next,max,mins,user.id]);
      await audit(request,user.id,'LOGIN_FAILED','admin_user',user.id);
      return fail('Invalid credentials',401);
    }
    await db.query(`UPDATE admin_users SET failed_login_count=0, locked_until=NULL, last_login_at=UTC_TIMESTAMP() WHERE id=?`, [user.id]);
    const token = await createSession(user,request);
    await audit(request,user.id,'LOGIN_SUCCESS','admin_user',user.id);
    return ok({ token, user:{ id:user.id, username:user.username, email:user.email, fullName:user.full_name, role:user.role, mustChangePassword:Boolean(user.must_change_password) } });
  } catch (e) { console.error(e); return fail('Unable to sign in',500); }
}
