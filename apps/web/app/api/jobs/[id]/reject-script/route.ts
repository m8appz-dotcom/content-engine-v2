import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { errorResponse, json, readJson } from '../../../../lib/http';
import { createApproval, ensureState, getJob, transitionJob, updateScriptStatus } from '../../../../../../../packages/core/src/db/repositories';
const RequestSchema=z.object({script_id:z.string().min(1),actor_id:z.string().optional().nullable(),notes:z.string().optional().nullable()});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const input=await readJson(req,RequestSchema); const db=getDb(); const job=getJob(db,id); if(!job) throw Object.assign(new Error('Job not found'),{code:'not_found'}); ensureState(job,['script_pending_approval']); const script=updateScriptStatus(db,id,input.script_id,'rejected',{notes:input.notes}); const approval=createApproval(db,{job_id:id,artifact_id:input.script_id,gate:'Gate A — Script Approval',status:'rejected',approved_by:input.actor_id,notes:input.notes,metadata:{}}); const next=transitionJob(db,id,'script_rejected'); return json({job_id:id,status:next.status,script,approval}); }catch(e){return errorResponse(e);} }
