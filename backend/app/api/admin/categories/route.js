import { db } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { ok, fail } from '../../../../lib/http';
import { categoryCreateSchema } from '../../../../lib/validation';
import { audit } from '../../../../lib/audit';
export async function GET(request){ const auth=await requireAuth(request); if(!auth.ok)return fail(auth.error,auth.status); const [rows]=await db.query(`SELECT id,name,slug,sort_order AS sortOrder,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM menu_categories ORDER BY sort_order,name`); return ok(rows); }
export async function POST(request){ const auth=await requireAuth(request); if(!auth.ok)return fail(auth.error,auth.status); const p=categoryCreateSchema.safeParse(await request.json()); if(!p.success)return fail('Invalid category data',422,p.error.flatten()); const d=p.data; try{ const [r]=await db.query('INSERT INTO menu_categories(name,slug,sort_order,is_active) VALUES(?,?,?,?)',[d.name,d.slug,d.sortOrder,d.isActive?1:0]); await audit(request,auth.user.id,'CATEGORY_CREATED','menu_category',r.insertId,d); return ok({id:r.insertId,...d},201);}catch(e){console.error(e);if(e?.code==='ER_DUP_ENTRY')return fail('Category name or slug already exists',409);return fail('Unable to create category',500);} }
