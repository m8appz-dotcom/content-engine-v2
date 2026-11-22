import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { errorResponse, json, readJson } from '../../../lib/http';
import { getJob, updateJob } from '../../../../../../packages/core/src/db/repositories';
const PatchJob=z.object({title:z.string().min(1).optional(),description:z.string().nullable().optional()});
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const job=getJob((await getDb()),id); if(!job) throw Object.assign(new Error('Job not found'),{code:'not_found'}); return json({job}); }catch(e){return errorResponse(e);} }
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const input=await readJson(req,PatchJob); return json({job:updateJob((await getDb()),id,input)}); }catch(e){return errorResponse(e);} }
