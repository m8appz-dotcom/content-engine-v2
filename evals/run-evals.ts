import { pathToFileURL } from 'node:url';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { StoryAngleSchema, ScriptCandidateSchema } from '../packages/core/src/schemas/artifacts';
import { generateEvidenceBackedAngles } from '../packages/core/src/artifacts/story-miner';
import { generateEvidenceBackedScripts } from '../packages/core/src/artifacts/scriptwriter';
import { verifyScriptClaims } from '../packages/core/src/artifacts/claim-verifier';
import { createProductionPlanArtifact } from '../packages/core/src/artifacts/production-planner';
import { createStoryboardArtifact } from '../packages/core/src/artifacts/storyboarder';
import { createDraftArtifact } from '../packages/video/src/renderer/draft-renderer';
import { reviewDraft } from '../packages/qa/src/scoring/qa-reviewer';
import { privacyScanText } from '../packages/core/src/artifacts/privacy-scan';

type EvalResult={name:string;pass:boolean;score:number;details?:unknown};
function assertEval(name:string, condition:boolean, details?:unknown):EvalResult{ return {name,pass:condition,score:condition?1:0,details}; }
function loadFixture(){ return JSON.parse(readFileSync('evals/fixtures/pipeline-golden.json','utf8')); }
export async function runEvals(options:{renderDraft?:boolean}={}){
  const fixture=loadFixture(); const results:EvalResult[]=[];
  const angles=generateEvidenceBackedAngles({job_id:fixture.job_id,evidence:fixture.evidence,source_registry_snapshot_id:fixture.source_registry_snapshot_id,count:3});
  results.push(assertEval('story-miner returns 3 schema-valid evidence-backed angles', angles.length===3 && angles.every((a:any)=>StoryAngleSchema.safeParse(a).success && a.visual_evidence_ids.length>0), {count:angles.length}));
  const scripts=generateEvidenceBackedScripts({job_id:fixture.job_id,angle:angles[0],evidence:fixture.evidence,count:1,style_profile_id:'eval'});
  results.push(assertEval('scriptwriter returns schema-valid script with mapped claims', scripts.length===1 && ScriptCandidateSchema.safeParse(scripts[0]).success && scripts[0].claims.every((c:any)=>c.evidence_ids.length>0), {claims:scripts[0]?.claims?.length}));
  const verification=verifyScriptClaims({script:scripts[0],evidence:fixture.evidence});
  results.push(assertEval('claim verifier approves golden script', verification.overall_pass===true && verification.claim_checks.every((c:any)=>c.support_level!=='unsupported'), verification));
  const bad={...scripts[0],claims:[...scripts[0].claims,{id:'bad',script_id:scripts[0].id,claim_text:'Unsupported claim',claim_type:'factual',support_level:'direct',evidence_ids:['missing'],public_safe:true,requires_human_approval:false,rewrite_suggestion:null}]};
  const badCheck=verifyScriptClaims({script:bad,evidence:fixture.evidence});
  results.push(assertEval('claim verifier blocks missing evidence', badCheck.overall_pass===false && badCheck.claim_checks.some((c:any)=>c.support_level==='unsupported'), badCheck));
  const dummyKey = ['sk', 'test', 'fixture'.repeat(4)].join('_');
  const privacy=privacyScanText(`token=${dummyKey} email bad@example.com`);
  results.push(assertEval('privacy scan finds secret/email patterns', privacy.some(f=>f.type==='api_key') && privacy.some(f=>f.type==='email'), privacy));
  const plan=createProductionPlanArtifact({job_id:fixture.job_id,script:scripts[0],evidence:fixture.evidence});
  const storyboard=createStoryboardArtifact({job_id:fixture.job_id,script:scripts[0],production_plan:plan});
  if(options.renderDraft!==false){
    const draft=await createDraftArtifact({job_id:fixture.job_id,script:scripts[0],storyboard,outputsPath:'outputs/evals'});
    const qa=reviewDraft({job_id:fixture.job_id,draft,script:scripts[0],storyboard,evidence:fixture.evidence});
    results.push(assertEval('draft render + QA golden pass', draft.video_path.endsWith('.mp4') && draft.contact_sheet_path.endsWith('.png') && qa.pass===true, {draft,qa}));
  } else {
    mkdirSync('outputs/evals/test-contract',{recursive:true});
    const videoPath='outputs/evals/test-contract/draft_v1.mp4';
    const sheetPath='outputs/evals/test-contract/contact_sheet_v1.png';
    const timelinePath='outputs/evals/test-contract/timeline.json';
    writeFileSync(videoPath,'contract placeholder: real renderer covered by packages/video/tests/draft-renderer.test.ts');
    writeFileSync(sheetPath,'contract placeholder: contact sheet path covered by renderer test');
    writeFileSync(timelinePath,JSON.stringify({draft_id:'draft_eval_contract',render_type:'remotion_asset_backed_draft_mp4'}));
    const voicePath='outputs/evals/test-contract/voiceover.wav'; const musicPath='outputs/evals/test-contract/music.wav'; const sfxPath='outputs/evals/test-contract/sfx.wav';
    writeFileSync(voicePath,'contract placeholder: renderer test verifies actual audible voiceover'); writeFileSync(musicPath,'contract placeholder'); writeFileSync(sfxPath,'contract placeholder');
    // Contract-only fixture: these metadata assertions do not prove rendered speech or production readiness.
    const draft={id:'draft_eval_contract',video_path:videoPath,contact_sheet_path:sheetPath,timeline_json_path:timelinePath,render_status:'draft_rendered',notes:{composer:'remotion',uses_real_preview_assets:true,placeholder_render:false,audio_verified:true,voiceover_path:voicePath,voiceover_source:'contract-placeholder',product_voiceover_usable:true,music_path:musicPath,sfx_path:sfxPath,audio_metrics:{mean_volume_db:-18,max_volume_db:-3}}};
    const qa=reviewDraft({job_id:fixture.job_id,draft,script:scripts[0],storyboard,evidence:fixture.evidence});
    results.push(assertEval('draft QA contract golden pass', qa.pass===true && qa.scores.visual_proof===5 && qa.publish_ready===false, {qa}));
    const missingVoice={...draft,notes:{...draft.notes,voiceover_source:null,product_voiceover_usable:false}};
    const blocked=reviewDraft({job_id:fixture.job_id,draft:missingVoice,script:scripts[0],storyboard,evidence:fixture.evidence});
    results.push(assertEval('draft QA contract blocks unusable product voice', blocked.pass===false && blocked.publish_ready===false && blocked.blocking_issues.includes('voiceover_source_missing') && blocked.blocking_issues.includes('product_voiceover_unusable'), {qa:blocked}));
  }
  const pass=results.every(r=>r.pass); const summary={ok:pass,passed:results.filter(r=>r.pass).length,total:results.length,results,created_at:new Date().toISOString()};
  mkdirSync('evals/reports',{recursive:true}); writeFileSync(path.join('evals/reports','current.json'),JSON.stringify(summary,null,2));
  return summary;
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){ runEvals({renderDraft:process.env.CONTENT_ENGINE_EVAL_RENDER_DRAFT==='1'}).then(s=>{ console.log(JSON.stringify(s,null,2)); if(!s.ok) process.exit(1); }).catch(e=>{ console.error(e); process.exit(1); }); }
