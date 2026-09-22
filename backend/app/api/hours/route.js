import { db } from '../../../lib/db';
import { ok, fail } from '../../../lib/http';
export async function GET(){try{const[rows]=await db.query(`SELECT day_of_week AS dayOfWeek,is_closed AS isClosed,TIME_FORMAT(open_time,'%H:%i') AS openTime,TIME_FORMAT(close_time,'%H:%i') AS closeTime,note FROM business_hours ORDER BY day_of_week`);return ok(rows)}catch(e){console.error(e);return fail('Unable to load business hours',500)}}
