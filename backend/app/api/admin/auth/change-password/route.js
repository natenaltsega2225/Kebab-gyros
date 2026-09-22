import { db } from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth';
import { ok, fail } from '../../../../../lib/http';
import { verifyPassword, hashPassword, passwordMeetsPolicy } from '../../../../../lib/security';
import { audit } from '../../../../../lib/audit';
export async function POST(request){
  const auth=await requireAuth(request, ['admin', 'manager'], { allowMustChangePassword: true }); if(!auth.ok)return fail(auth.error,auth.status);
  const body=await request.json(); const current=String(body.currentPassword||''); const next=String(body.newPassword||'');
  if(!passwordMeetsPolicy(next)) return fail('New password must be at least 12 characters and include upper, lower, number, and symbol',422);
  const [rows]=await db.query('SELECT password_hash FROM admin_users WHERE id=?',[auth.user.id]); if(!rows[0])return fail('User not found',404);
  if(!(await verifyPassword(current,rows[0].password_hash))) return fail('Current password is incorrect',401);
  const hash=await hashPassword(next); await db.query(`UPDATE admin_users SET password_hash=?,must_change_password=0,password_changed_at=UTC_TIMESTAMP(),failed_login_count=0,locked_until=NULL WHERE id=?`,[hash,auth.user.id]);
  await db.query('UPDATE admin_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=? AND jti<>? AND revoked_at IS NULL',[auth.user.id,auth.user.jti]);
  await audit(request,auth.user.id,'PASSWORD_CHANGED','admin_user',auth.user.id);
  return ok({ changed:true });
}
