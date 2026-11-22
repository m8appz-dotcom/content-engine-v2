import {readFileSync} from 'node:fs';
import {getDb} from '../../../../../../lib/db';
import {errorResponse} from '../../../../../../lib/http';
import {requirePublicSource} from '../../../../../../lib/public-sources';
import {listEvidence} from '../../../../../../../../../packages/core/src/db/repositories';
export async function GET(_req:Request,{params}:{params:Promise<{id:string;evidenceId:string}>}){
  try{
    const {id,evidenceId}=await params,db=await getDb();
    const evidence=listEvidence(db,id).find((e:any)=>e.id===evidenceId);
    if(!evidence||!evidence.public_safe)throw Object.assign(new Error('Source not found.'),{code:'not_found'});
    const source=requirePublicSource(evidence.path);
    return new Response(new Uint8Array(readFileSync(source)),{headers:{'Content-Type':source.endsWith('.jpg')?'image/jpeg':'text/plain; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"}});
  }catch(e){return errorResponse(e);}
}
