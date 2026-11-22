import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { errorResponse, json, readJson } from '../../../../lib/http';
import { selectStoryAngle } from '../../../../../../../packages/core/src/db/repositories';
const RequestSchema=z.object({angle_id:z.string().min(1)});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const input=await readJson(req,RequestSchema); return json({job_id:id,angle:selectStoryAngle((await getDb()),id,input.angle_id)}); }catch(e){return errorResponse(e);} }
