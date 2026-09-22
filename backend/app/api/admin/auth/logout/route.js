import { db } from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth';
import { ok, fail } from '../../../../../lib/http';
export async function POST(request){const auth=await requireAuth(request,['admin','manager'],{allowMustChangePassword:true});if(!auth.ok)return fail(auth.error,auth.status);await db.query('UPDATE admin_sessions SET revoked_at=UTC_TIMESTAMP() WHERE jti=? AND user_id=?',[auth.user.jti,auth.user.id]);return ok({loggedOut:true})}
