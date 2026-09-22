import { db } from '../../../../../lib/db';
import { requireAuth } from '../../../../../lib/auth';
import { ok, fail } from '../../../../../lib/http';
export async function POST(request){const auth=await requireAuth(request);if(!auth.ok)return fail(auth.error,auth.status);const body=await request.json();if(!Array.isArray(body.items))return fail('items is required',422);const conn=await db.getConnection();try{await conn.beginTransaction();for(const x of body.items)await conn.query('UPDATE menu_items SET sort_order=? WHERE id=?',[Number(x.sortOrder),Number(x.id)]);await conn.commit();return ok({updated:body.items.length})}catch(e){await conn.rollback();console.error(e);return fail('Unable to reorder menu items',500)}finally{conn.release()}}
