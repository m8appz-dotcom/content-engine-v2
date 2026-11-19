import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { errorResponse, json, readJson } from '../../../../lib/http';
import { withIdempotency } from '../../../../lib/idempotency';
import { addEvidence, getJob, listEvidence } from '../../../../../../../packages/core/src/db/repositories';
import { EvidenceType, RightsStatus, PrivacyLevel } from '../../../../../../../packages/core/src/schemas/enums';
import { EvidenceItemSchema } from '../../../../../../../packages/core/src/schemas/artifacts';
const EvidenceInput=z.object({ type:EvidenceType, title:z.string().optional(), description:z.string().optional(), path:z.string().optional(), url:z.string().optional(), source_project_id:z.string().optional(), rights_status:RightsStatus.default('unknown'), privacy_level:PrivacyLevel.default('internal'), public_safe:z.boolean().default(false), metadata:z.record(z.string(),z.unknown()).default({}) });
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; return json({job_id:id,evidence:listEvidence(getDb(),id)});}catch(e){return errorResponse(e);} }
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const db=getDb(); if(!getJob(db,id)) throw Object.assign(new Error('Job not found'),{code:'not_found'}); const input=await readJson(req,EvidenceInput); return withIdempotency(req,db,`POST /api/jobs/${id}/evidence`,input,()=>{ const candidate=EvidenceItemSchema.parse({id:'pending',job_id:id,created_at:new Date().toISOString(),...input}); const evidence=addEvidence(db,{...candidate,id:undefined,job_id:id}); return json({evidence},201); });}catch(e){return errorResponse(e);} }
