import { getDb } from '../../../../lib/db';
import { errorResponse, json } from '../../../../lib/http';
import { listDrafts } from '../../../../../../../packages/core/src/db/repositories';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; return json({job_id:id,drafts:listDrafts((await getDb()),id)}); }catch(e){return errorResponse(e);} }
