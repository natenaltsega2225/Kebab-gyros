import { db } from '../../../../lib/db';
import { ok, fail } from '../../../../lib/http';
export async function GET(){try{const[rows]=await db.query(`SELECT id,name,slug,sort_order AS sortOrder FROM menu_categories WHERE is_active=1 ORDER BY sort_order,name`);return ok([{id:'popular',name:'Popular',slug:'popular',sortOrder:0},...rows])}catch(e){console.error(e);return fail('Unable to load menu categories',500)}}
