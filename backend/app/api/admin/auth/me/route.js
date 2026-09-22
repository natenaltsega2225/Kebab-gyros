import { db } from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth';
import { ok, fail } from '../../../../../lib/http';
export async function GET(request){ const auth=await requireAuth(request, ['admin', 'manager'], { allowMustChangePassword: true }); if(!auth.ok)return fail(auth.error,auth.status); const [rows]=await db.query(`SELECT id,username,email,full_name AS fullName,role,must_change_password AS mustChangePassword,is_active AS isActive,last_login_at AS lastLoginAt,password_changed_at AS passwordChangedAt FROM admin_users WHERE id=?`,[auth.user.id]); return rows[0]?ok(rows[0]):fail('User not found',404); }
