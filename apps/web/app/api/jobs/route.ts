import { z } from 'zod';
import { getDb } from '../../lib/db';
import { errorResponse, json, readJson } from '../../lib/http';
import { withIdempotency } from '../../lib/idempotency';
import { createJob, listJobs } from '../../../../../packages/core/src/db/repositories';
const CreateJobSchema=z.object({ title:z.string().min(1), description:z.string().optional().nullable(), target_platform:z.literal('vertical_short').default('vertical_short') });
export async function GET(){ try{return json({jobs:listJobs((await getDb()))});}catch(e){return errorResponse(e);} }
export async function POST(req:Request){ try{ const input=await readJson(req,CreateJobSchema); const db=(await getDb()); return withIdempotency(req,db,'POST /api/jobs',input,()=>{ const job=createJob(db,input); return json({job},201); });}catch(e){return errorResponse(e);} }
