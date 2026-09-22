import { db } from '../../../lib/db';
import { ok, fail } from '../../../lib/http';
export async function GET() { try { await db.query('SELECT 1'); return ok({ status:'ok', database:'connected' }); } catch (e) { console.error(e); return fail('Database unavailable',503); } }
