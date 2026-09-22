import { db } from './db';
export async function audit(request, userId, action, entityType, entityId = null, details = null) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, action, entityType, entityId ? String(entityId) : null, details ? JSON.stringify(details) : null,
       request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, request.headers.get('user-agent') || null]
    );
  } catch (error) {
    console.error('Audit write failed', error);
  }
}
