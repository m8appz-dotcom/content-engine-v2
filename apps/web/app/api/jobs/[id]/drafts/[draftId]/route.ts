import { getDb } from '../../../../../lib/db';
import { errorResponse, json } from '../../../../../lib/http';
import { getDraft } from '../../../../../../../../packages/core/src/db/repositories';
export async function GET(_req:Request,{params}:{params:Promise<{id:string;draftId:string}>}){ try{ const {id,draftId}=await params; const draft=getDraft((await getDb()),id,draftId); if(!draft) throw Object.assign(new Error('Draft not found'),{code:'not_found'}); return json({job_id:id,draft}); }catch(e){return errorResponse(e);} }
