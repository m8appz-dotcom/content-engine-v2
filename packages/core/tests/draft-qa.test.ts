import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { migrate } from '../src/db/client';
import { addEvidence, createDraft, createJob, createProductionPlan, createQaReport, createScriptCandidate, createStoryboard, createStoryAngle, transitionJob, updateScriptStatus } from '../src/db/repositories';
import { generateEvidenceBackedAngles } from '../src/artifacts/story-miner';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';
import { createProductionPlanArtifact } from '../src/artifacts/production-planner';
import { createStoryboardArtifact } from '../src/artifacts/storyboarder';
import { createDraftArtifact } from '../../video/src/renderer/draft-renderer';
import { reviewDraft } from '../../qa/src/scoring/qa-reviewer';

test('storyboard_ready renders structured draft but blocks QA and publishing without usable product voice',async()=>{
  const stamp=Date.now(); const dbPath=`/tmp/content-engine-v2-draft-${stamp}.sqlite`; const out=`/tmp/content-engine-v2-outputs-${stamp}`;
  const db=migrate(dbPath); const job=createJob(db,{title:'Draft QA'}); mkdirSync(out,{recursive:true}); const assetPath=`${out}/proof.svg`; writeFileSync(assetPath,`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#123'/><text x='90' y='260' font-size='86' fill='white'>Dashboard real</text><text x='90' y='390' font-size='56' fill='#66e3a2'>Evidencia visual</text></svg>`);
  transitionJob(db,job.id,'evidence_collecting'); transitionJob(db,job.id,'evidence_collected');
  const ev=addEvidence(db,{job_id:job.id,type:'screenshot',title:'Visual proof',path:assetPath,rights_status:'owned',privacy_level:'public',public_safe:true,metadata:{}}) as any;
  const angle=generateEvidenceBackedAngles({job_id:job.id,evidence:[ev]})[0]; createStoryAngle(db,{job_id:job.id,angle}); transitionJob(db,job.id,'angles_generating'); transitionJob(db,job.id,'angles_generated');
  const script=generateEvidenceBackedScripts({job_id:job.id,angle,evidence:[ev],count:1})[0]; script.duration_sec=20; createScriptCandidate(db,{job_id:job.id,script}); transitionJob(db,job.id,'scripts_generating'); transitionJob(db,job.id,'scripts_generated'); transitionJob(db,job.id,'script_pending_approval'); updateScriptStatus(db,job.id,script.id,'approved'); transitionJob(db,job.id,'script_approved');
  const plan=createProductionPlanArtifact({job_id:job.id,script,evidence:[ev]}); const planRow=createProductionPlan(db,{job_id:job.id,script_id:script.id,plan}); transitionJob(db,job.id,'production_planning'); transitionJob(db,job.id,'production_planned');
  const storyboard=createStoryboardArtifact({job_id:job.id,script,production_plan:planRow}); createStoryboard(db,{job_id:job.id,script_id:script.id,production_plan_id:plan.id,storyboard}); transitionJob(db,job.id,'storyboard_generating'); transitionJob(db,job.id,'storyboard_ready');
  const draft=await createDraftArtifact({job_id:job.id,script,storyboard,outputsPath:out}); createDraft(db,{job_id:job.id,script_id:script.id,storyboard_id:storyboard.id,draft}); transitionJob(db,job.id,'rendering_draft'); transitionJob(db,job.id,'draft_rendered');
  const report=reviewDraft({job_id:job.id,draft,script,storyboard,evidence:[ev]}); createQaReport(db,{job_id:job.id,draft_id:draft.id,report}); transitionJob(db,job.id,'qa_pending'); transitionJob(db,job.id,report.pass?'qa_passed':'qa_failed');
  assert.equal(report.pass,false); assert.equal(report.publish_ready,false); assert.equal(report.scores.evidence_support,3); assert.deepEqual([...report.blocking_issues].sort(),['product_voiceover_unusable','voiceover_source_missing']); assert.equal(draft.notes.product_voiceover_usable,false); assert.equal(draft.notes.voiceover_source,null); assert.ok(draft.video_path.endsWith('.mp4')); assert.ok(draft.contact_sheet_path.endsWith('.png'));
  db.close(); unlinkSync(dbPath); rmSync(out,{recursive:true,force:true});
});
