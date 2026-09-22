import { db } from '../../../../../lib/db';
import { ok, fail } from '../../../../../lib/http';
import { hashToken, hashPassword, passwordMeetsPolicy } from '../../../../../lib/security';
export async function POST(request){
  const body=await request.json(); const token=String(body.token||''); const password=String(body.newPassword||'');
  if(!token || !passwordMeetsPolicy(password)) return fail('Invalid token or password policy failure',422);
  const hash=hashToken(token); const [rows]=await db.query(`SELECT id,user_id FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() LIMIT 1`,[hash]);
  const reset=rows[0]; if(!reset)return fail('Reset token is invalid or expired',400);
  const passHash=await hashPassword(password); const conn=await db.getConnection();
  try { await conn.beginTransaction(); await conn.query(`UPDATE admin_users SET password_hash=?,must_change_password=0,password_changed_at=UTC_TIMESTAMP(),failed_login_count=0,locked_until=NULL WHERE id=?`,[passHash,reset.user_id]); await conn.query('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE id=?',[reset.id]); await conn.query('UPDATE admin_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=? AND revoked_at IS NULL',[reset.user_id]); await conn.commit(); return ok({ reset:true }); } catch(e){ await conn.rollback(); console.error(e); return fail('Unable to reset password',500); } finally { conn.release(); }
}
