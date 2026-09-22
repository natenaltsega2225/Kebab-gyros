import { db } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { ok, fail } from '../../../../lib/http';
import { restaurantSchema } from '../../../../lib/validation';
import { audit } from '../../../../lib/audit';
const select=`SELECT restaurant_name AS restaurantName,address_line_1 AS addressLine1,address_line_2 AS addressLine2,city,state,zip_code AS zipCode,phone,email,google_maps_url AS googleMapsUrl,order_online_url AS orderOnlineUrl,logo_url AS logoUrl,updated_at AS updatedAt FROM restaurant_settings WHERE id=1`;
export async function GET(request){const auth=await requireAuth(request);if(!auth.ok)return fail(auth.error,auth.status);const[rows]=await db.query(select);return ok(rows[0]||null)}
export async function PUT(request){const auth=await requireAuth(request);if(!auth.ok)return fail(auth.error,auth.status);const p=restaurantSchema.safeParse(await request.json());if(!p.success)return fail('Invalid restaurant settings',422,p.error.flatten());const d=p.data;await db.query(`UPDATE restaurant_settings SET restaurant_name=?,address_line_1=?,address_line_2=?,city=?,state=?,zip_code=?,phone=?,email=?,google_maps_url=?,order_online_url=?,logo_url=? WHERE id=1`,[d.restaurantName,d.addressLine1,d.addressLine2??null,d.city,d.state,d.zipCode,d.phone,d.email,d.googleMapsUrl??null,d.orderOnlineUrl??null,d.logoUrl??null]);await audit(request,auth.user.id,'RESTAURANT_UPDATED','restaurant','1');const[rows]=await db.query(select);return ok(rows[0])}
