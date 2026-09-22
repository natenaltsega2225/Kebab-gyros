import { db } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/auth';
import { ok, fail } from '../../../../lib/http';
export async function GET(request){ const auth=await requireAdmin(request); if(!auth.ok)return fail(auth.error,auth.status); const {searchParams}=new URL(request.url); const limit=Math.min(Math.max(Number(searchParams.get('limit')||100),1),500); const [rows]=await db.query(`SELECT a.id,a.action,a.entity_type AS entityType,a.entity_id AS entityId,a.details_json AS details,a.ip_address AS ipAddress,a.created_at AS createdAt,u.username FROM audit_logs a LEFT JOIN admin_users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT ?`,[limit]); return ok(rows); }
