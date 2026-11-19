import { getDb } from '../../../../lib/db';
import { errorResponse, json } from '../../../../lib/http';
import { listArtifactVersions } from '../../../../../../../packages/core/src/db/repositories';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{ const {id}=await params; return json({job_id:id,creative_directions:listArtifactVersions(getDb(),id,'creative_direction')}); }
  catch(e){ return errorResponse(e); }
}
