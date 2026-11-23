import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const perfectScores={evidence_support:5,rights_safety:5,privacy_safety:5,sme_clarity:5,hook_strength:5,narrative_coherence:5,visual_proof:5,caption_readability:5,audio_quality:5,pace:4};

function audioMetrics(draft:any){ return draft?.notes?.audio_metrics ?? {}; }
function needsVoiceover(storyboard:any){ return (storyboard?.timeline??[]).some((tl:any)=>tl.narration) || (storyboard?.human_preview??[]).some((card:any)=>card.voiceover_line); }
function editorialCriteria(storyboard:any, script:any){ return storyboard?.editorial_criteria ?? script?.editorial_criteria ?? null; }

export function reviewDraft(input:{job_id:string;draft:any;script:any;storyboard:any;evidence:any[]}){
  const draft=input.draft;
  const script=input.script.script_json ?? input.script;
  const storyboard=input.storyboard.storyboard_json ?? input.storyboard;
  const blocking_issues:string[]=[];
  const non_blocking_issues:string[]=[];
  const criteria=editorialCriteria(storyboard,script);
  if(!criteria) blocking_issues.push('editorial_criteria_missing');
  else {
    if(!(criteria.must_read??[]).length) blocking_issues.push('editorial_must_read_missing');
    if(!(criteria.must_not_read??[]).length) blocking_issues.push('editorial_must_not_read_missing');
    if(!(criteria.quality_bars??[]).length) blocking_issues.push('editorial_quality_bars_missing');
  }
  if(!draft.video_path || !existsSync(draft.video_path)) blocking_issues.push('draft_video_missing'); if(draft.video_path && !String(draft.video_path).endsWith('.mp4')) blocking_issues.push('draft_not_mp4');
  if(!draft.contact_sheet_path || !existsSync(draft.contact_sheet_path)) blocking_issues.push('contact_sheet_missing'); if(draft.contact_sheet_path && !String(draft.contact_sheet_path).endsWith('.png')) blocking_issues.push('contact_sheet_not_png');
  const evidenceIds=new Set(input.evidence.map(e=>e.id));
  for(const claim of script.claims??[]) for(const id of claim.evidence_ids??[]) if(!evidenceIds.has(id)) blocking_issues.push(`claim_missing_evidence:${claim.id}`);
  for(const item of input.evidence){ if(!['owned','licensed','generated','authorized'].includes(item.rights_status)) blocking_issues.push(`unsafe_rights:${item.id}`); if(item.privacy_level==='restricted') blocking_issues.push(`restricted_privacy:${item.id}`); }
  for(const tl of storyboard.timeline??[]) if((tl.evidence_ids??[]).length===0) blocking_issues.push(`timeline_missing_visual_evidence:${tl.id}`);
  if((storyboard.captions??[]).length===0) blocking_issues.push('captions_missing');
  if(draft.render_status!=='draft_rendered') blocking_issues.push('draft_not_rendered');
  if(draft.timeline_json_path && existsSync(draft.timeline_json_path)){ try{ const preview=JSON.parse(readFileSync(draft.timeline_json_path,'utf8')); if(!preview.draft_id) blocking_issues.push('timeline_unreadable'); }catch{ blocking_issues.push('timeline_unreadable'); } }
  if((script.voiceover??'').length<80) non_blocking_issues.push('voiceover_may_be_too_short');

  const metrics=audioMetrics(draft);
  const mean=Number(metrics.mean_volume_db);
  const max=Number(metrics.max_volume_db);
  if(!draft.notes?.audio_verified) blocking_issues.push('audio_not_verified');
  if(!draft.notes?.voiceover_path || !existsSync(draft.notes.voiceover_path)) blocking_issues.push('voiceover_missing');
  const voiceOnly=draft.notes?.audio_mix_mode==='voice_only';
  if(!voiceOnly && (!draft.notes?.music_path || !existsSync(draft.notes.music_path))) blocking_issues.push('music_bed_missing');
  if(!voiceOnly && (!draft.notes?.sfx_path || !existsSync(draft.notes.sfx_path))) blocking_issues.push('sfx_missing');
  if((needsVoiceover(storyboard)||voiceOnly) && !draft.notes?.voiceover_source) blocking_issues.push('voiceover_source_missing');
  if((needsVoiceover(storyboard)||voiceOnly) && draft.notes?.product_voiceover_usable!==true) blocking_issues.push('product_voiceover_unusable');
  if(String(draft.notes?.voiceover_source ?? '').includes('espeak')) blocking_issues.push('unacceptable_robotic_voiceover');
  if(!Number.isFinite(mean) || !Number.isFinite(max)) blocking_issues.push('audio_volume_metrics_missing');
  else if(mean < -45 || max < -30) blocking_issues.push('audio_effectively_silent');

  const scores={...perfectScores};
  if(blocking_issues.length){ scores.evidence_support=Math.min(scores.evidence_support,3); scores.visual_proof=Math.min(scores.visual_proof,3); }
  if(blocking_issues.some(i=>i.startsWith('audio_') || ['voiceover_missing','music_bed_missing','sfx_missing','voiceover_source_missing','product_voiceover_unusable','unacceptable_robotic_voiceover'].includes(i))){ scores.audio_quality=2; }
  const pass=blocking_issues.length===0 && Object.values(scores).every(v=>v>=4) && scores.evidence_support===5 && scores.rights_safety===5 && scores.privacy_safety===5;
  return {id:`qa_${randomUUID()}`,job_id:input.job_id,draft_id:draft.id,scores,editorial_criteria:criteria,blocking_issues,non_blocking_issues,pass,publish_ready:false,gate_b_note: pass?'QA passed. Explicit publish approval still required.':'QA failed; publish blocked.'};
}
