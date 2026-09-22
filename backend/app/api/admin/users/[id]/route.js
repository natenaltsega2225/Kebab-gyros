import { db } from '../../../../../lib/db';
import { requireAdmin } from '../../../../../lib/auth';
import { ok, fail, parseId } from '../../../../../lib/http';
import { userUpdateSchema } from '../../../../../lib/validation';
import { audit } from '../../../../../lib/audit';
async function idOf(ctx){ const p=await ctx.params; return parseId(p.id); }
export async function GET(request,ctx){ const auth=await requireAdmin(request); if(!auth.ok)return fail(auth.error,auth.status); const id=await idOf(ctx); if(!id)return fail('Invalid user id',400); const [rows]=await db.query(`SELECT id,username,email,full_name AS fullName,role,must_change_password AS mustChangePassword,is_active AS isActive,last_login_at AS lastLoginAt,created_at AS createdAt FROM admin_users WHERE id=?`,[id]); return rows[0]?ok(rows[0]):fail('User not found',404); }
export async function PATCH(request,ctx){
  const auth=await requireAdmin(request); if(!auth.ok)return fail(auth.error,auth.status); const id=await idOf(ctx); if(!id)return fail('Invalid user id',400);
  const parsed=userUpdateSchema.safeParse(await request.json()); if(!parsed.success)return fail('Invalid user data',422,parsed.error.flatten()); const map={email:'email',fullName:'full_name',role:'role',isActive:'is_active'}; const sets=[],vals=[];
  for(const [k,c] of Object.entries(map)){ if(parsed.data[k]!==undefined){ sets.push(`${c}=?`); vals.push(k==='isActive'?(parsed.data[k]?1:0):parsed.data[k]); } }
  if(!sets.length)return fail('No fields supplied',400);
  try{ const [r]=await db.query(`UPDATE admin_users SET ${sets.join(',')} WHERE id=?`,[...vals,id]); if(!r.affectedRows)return fail('User not found',404); if(parsed.data.isActive===false)await db.query('UPDATE admin_sessions SET revoked_at=UTC_TIMESTAMP() WHERE user_id=? AND revoked_at IS NULL',[id]); await audit(request,auth.user.id,'USER_UPDATED','admin_user',id,parsed.data); return ok({ id, updated:true }); }catch(e){ console.error(e); if(e?.code==='ER_DUP_ENTRY')return fail('Email already exists',409); return fail('Unable to update user',500); }
}
export async function DELETE(request,ctx){ const auth=await requireAdmin(request); if(!auth.ok)return fail(auth.error,auth.status); const id=await idOf(ctx); if(!id)return fail('Invalid user id',400); if(id===auth.user.id)return fail('You cannot delete your own account',409); const [r]=await db.query('DELETE FROM admin_users WHERE id=?',[id]); if(!r.affectedRows)return fail('User not found',404); await audit(request,auth.user.id,'USER_DELETED','admin_user',id); return ok({ id, deleted:true }); }
