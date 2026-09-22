import { db } from '../../../../../../lib/db';
import { requireAdmin } from '../../../../../../lib/auth';
import { ok, fail, parseId } from '../../../../../../lib/http';
import { generateTemporaryPassword, hashPassword } from '../../../../../../lib/security';
import { sendTemporaryCredentials } from '../../../../../../lib/email';
import { audit } from '../../../../../../lib/audit';
export async function POST(request,ctx){
  const auth=await requireAdmin(request); if(!auth.ok)return fail(auth.error,auth.status); const p=await ctx.params; const id=parseId(p.id); if(!id)return fail('Invalid user id',400);
  const [rows]=await db.query('SELECT id,username,email,is_active FROM admin_users WHERE id=?',[id]); const user=rows[0]; if(!user)return fail('User not found',404); if(!user.is_active)return fail('User is inactive',409);
  const temp=generateTemporaryPassword(); const hash=await hashPassword(temp); await db.query(`UPDATE admin_users SET password_hash=?,must_change_password=1,password_changed_at=NULL,failed_login_count=0,locked_until=NULL WHERE id=?`,[hash,id]); await db.query('UPDATE admin_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=? AND revoked_at IS NULL',[id]);
  let delivery='sent'; try{ await sendTemporaryCredentials({ email:user.email,username:user.username,temporaryPassword:temp }); }catch(e){ console.error(e); delivery='failed'; }
  await audit(request,auth.user.id,'ADMIN_PASSWORD_RESET','admin_user',id,{ credentialDelivery:delivery });
  return ok({ id, username:user.username, mustChangePassword:true, credentialDelivery:delivery, ...(delivery==='failed'&&process.env.NODE_ENV!=='production'?{temporaryPassword:temp}:{}) });
}
