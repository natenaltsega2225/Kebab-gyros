import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireAuth } from '../../../../../lib/auth';
import { ok, fail } from '../../../../../lib/http';
import { audit } from '../../../../../lib/audit';
export const runtime='nodejs';
const allowed=new Map([['image/jpeg','.jpg'],['image/png','.png'],['image/webp','.webp']]);
export async function POST(request){const auth=await requireAuth(request);if(!auth.ok)return fail(auth.error,auth.status);const form=await request.formData();const file=form.get('file');if(!file||typeof file==='string')return fail('Image file is required',400);const ext=allowed.get(file.type);if(!ext)return fail('Only JPG, PNG, and WebP images are allowed',415);const max=Number(process.env.UPLOAD_MAX_MB||5)*1024*1024;if(file.size>max)return fail(`Image exceeds ${process.env.UPLOAD_MAX_MB||5} MB limit`,413);const bytes=Buffer.from(await file.arrayBuffer());const name=`${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;const dir=path.join(process.cwd(),'storage','uploads','menu');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,name),bytes,{flag:'wx'});const url=`/api/uploads/menu/${name}`;await audit(request,auth.user.id,'MENU_IMAGE_UPLOADED','menu_image',name,{size:file.size,type:file.type});return ok({url,fileName:name,size:file.size,type:file.type},201)}
