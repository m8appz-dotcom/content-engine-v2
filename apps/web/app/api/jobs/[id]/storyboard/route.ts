import { getDb } from '../../../../lib/db';
import { errorResponse, json } from '../../../../lib/http';
import { listStoryboards } from '../../../../../../../packages/core/src/db/repositories';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; return json({job_id:id,storyboards:listStoryboards(getDb(),id)}); }catch(e){return errorResponse(e);} }
