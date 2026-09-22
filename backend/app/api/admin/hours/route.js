import { db } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { ok, fail } from '../../../../lib/http';
export async function GET(request){const auth=await requireAuth(request);if(!auth.ok)return fail(auth.error,auth.status);const[rows]=await db.query(`SELECT id,day_of_week AS dayOfWeek,is_closed AS isClosed,TIME_FORMAT(open_time,'%H:%i') AS openTime,TIME_FORMAT(close_time,'%H:%i') AS closeTime,note,updated_at AS updatedAt FROM business_hours ORDER BY day_of_week`);return ok(rows)}
