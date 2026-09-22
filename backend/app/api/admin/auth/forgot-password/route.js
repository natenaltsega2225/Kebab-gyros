import { db } from '../../../../../lib/db';
import { ok } from '../../../../../lib/http';
import { randomToken, hashToken } from '../../../../../lib/security';
import { sendPasswordReset } from '../../../../../lib/email';
export async function POST(request){
  const body=await request.json(); const identifier=String(body.username||body.email||'').trim();
  if(identifier){
    const [rows]=await db.query('SELECT id,username,email,is_active FROM admin_users WHERE username=? OR email=? LIMIT 1',[identifier,identifier.toLowerCase()]); const user=rows[0];
    if(user?.is_active){
      const token=randomToken(32), hash=hashToken(token), mins=Number(process.env.RESET_TOKEN_MINUTES||30);
      await db.query('UPDATE password_reset_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL',[user.id]);
      await db.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE))`,[user.id,hash,mins]);
      const base=(process.env.ADMIN_APP_URL||'http://localhost:3000').replace(/\/$/,'');
      try { await sendPasswordReset({ email:user.email, username:user.username, resetUrl:`${base}/admin/reset-password?token=${encodeURIComponent(token)}` }); } catch(e){ console.error('Password reset email failed',e.message); }
    }
  }
  return ok({ message:'If the account exists, password reset instructions have been sent.' });
}
