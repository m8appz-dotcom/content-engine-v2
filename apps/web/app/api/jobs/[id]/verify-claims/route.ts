import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { errorResponse, json, readJson } from '../../../../lib/http';
import { getScriptCandidate, listEvidence } from '../../../../../../../packages/core/src/db/repositories';
import { verifyScriptClaims, hasProhibitedPublicLanguage } from '../../../../../../../packages/core/src/artifacts/claim-verifier';
const RequestSchema=z.object({script_id:z.string().min(1)});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const input=await readJson(req,RequestSchema); const db=(await getDb()); const script=getScriptCandidate(db,id,input.script_id); if(!script) throw Object.assign(new Error('Script not found'),{code:'not_found'}); const result=verifyScriptClaims({script:script.script_json,evidence:listEvidence(db,id)}); const prohibited_language=hasProhibitedPublicLanguage(script.script_json); return json({...result,prohibited_language,public_language_pass:prohibited_language.length===0,overall_pass:result.overall_pass && prohibited_language.length===0}); }catch(e){return errorResponse(e);} }
