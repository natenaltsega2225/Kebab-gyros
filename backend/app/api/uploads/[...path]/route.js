import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
export const runtime='nodejs';
const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
export async function GET(_request,ctx){const p=await ctx.params;const parts=Array.isArray(p.path)?p.path:[];if(parts.length<2||parts.some(x=>x.includes('..')||x.includes('/')||x.includes('\\')))return new NextResponse('Not found',{status:404});const base=path.resolve(process.cwd(),'storage','uploads');const file=path.resolve(base,...parts);if(!file.startsWith(base+path.sep))return new NextResponse('Not found',{status:404});try{const data=await fs.readFile(file);return new NextResponse(data,{status:200,headers:{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable'}})}catch{return new NextResponse('Not found',{status:404})}}
