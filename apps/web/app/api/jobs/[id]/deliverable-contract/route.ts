import { z } from 'zod';
import { getDb } from '../../../../lib/db';
import { errorResponse, json, readJson } from '../../../../lib/http';
import { createDeliverableContract, getJob, listArtifactVersions, listDeliverableContracts, listEvidence } from '../../../../../../../packages/core/src/db/repositories';
import { defaultDeliverableContract, evaluateDeliverableContract, summarizeContract } from '../../../../../../../packages/core/src/artifacts/deliverable-contract';

const RequestSchema=z.object({
  style_reference_id:z.string().min(1).default('impressed_v5_visual_story'),
  style_reference_label:z.string().min(1).default('Impressed / v5 visual story style'),
  style_notes:z.string().default(''),
  real_app_clips_required:z.boolean().default(true),
  real_app_clips_min:z.number().int().min(0).max(50).default(5),
  broll_required:z.boolean().default(true),
  broll_min:z.number().int().min(0).max(50).default(3),
  avatar_requirement:z.enum(['required','optional','forbidden']).default('optional'),
  voiceover_required:z.boolean().default(true),
  derive_video_duration_from_audio:z.boolean().default(true),
  require_asset_id_per_beat:z.boolean().default(true),
  allow_generic_cards_as_primary:z.boolean().default(false),
  block_if_required_assets_missing:z.boolean().default(false)
});

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const db=(await getDb()); const job=getJob(db,id); if(!job) throw Object.assign(new Error('Job not found'),{code:'not_found'}); const contracts=listDeliverableContracts(db,id); const active_contract=contracts.find((c:any)=>c.status==='active')??null; const evaluation=active_contract?evaluateDeliverableContract({contract:active_contract.contract_json,evidence:listEvidence(db,id),artifacts:listArtifactVersions(db,id)}):null; return json({job_id:id,contracts,active_contract,evaluation}); }catch(e){return errorResponse(e);} }
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){ try{ const {id}=await params; const input=await readJson(req,RequestSchema); const db=(await getDb()); const job=getJob(db,id); if(!job) throw Object.assign(new Error('Job not found'),{code:'not_found'}); const contract=defaultDeliverableContract({job_id:id,source:'human_ui',overrides:{style_reference:{id:input.style_reference_id,label:input.style_reference_label,notes:input.style_notes,must_use:true,forbidden_styles:['generic dark quote cards','same card layout every beat','microtext-heavy UI wallpaper','conversation cards as the whole video']},required_assets:{real_app_clips:{required:input.real_app_clips_required,min_count:input.real_app_clips_min,accepted_types:['screen_recording','user_clip','project_asset'],notes:'Clips must show the actual app/project, not abstract evidence cards.'},broll:{required:input.broll_required,min_count:input.broll_min,accepted_types:['screen_recording','user_clip','project_asset','generated_support_visual'],notes:'B-roll must advance a beat: demo, transition, before/after, proof detail, or workflow shot.'},avatar_presenter:{requirement:input.avatar_requirement,notes:'Use presenter/avatar only from a real approved asset.'},voiceover:{required:input.voiceover_required,must_complete_before_video:true,derive_video_duration_from_audio:input.derive_video_duration_from_audio,notes:'Render/measure full narration first; video duration follows audio.'}},renderer_policy:{require_asset_id_per_beat:input.require_asset_id_per_beat,allow_generic_cards_as_primary:input.allow_generic_cards_as_primary,require_voiceover_timing:input.voiceover_required,block_if_required_assets_missing:input.block_if_required_assets_missing}}}); const row=createDeliverableContract(db,{job_id:id,contract}); const evaluation=evaluateDeliverableContract({contract:row.contract_json,evidence:listEvidence(db,id),artifacts:listArtifactVersions(db,id)}); return json({job_id:id,deliverable_contract:row,summary:summarizeContract(row.contract_json),evaluation}); }catch(e){return errorResponse(e);} }
