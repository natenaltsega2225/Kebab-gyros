import { db } from '../../../lib/db';
import { ok, fail } from '../../../lib/http';
export async function GET(){try{const[rows]=await db.query(`SELECT restaurant_name AS restaurantName,address_line_1 AS addressLine1,address_line_2 AS addressLine2,city,state,zip_code AS zipCode,phone,email,google_maps_url AS googleMapsUrl,order_online_url AS orderOnlineUrl,logo_url AS logoUrl FROM restaurant_settings WHERE id=1`);return ok(rows[0]||null)}catch(e){console.error(e);return fail('Unable to load restaurant settings',500)}}
