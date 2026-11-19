import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeDirection } from '../src/artifacts/creative-director';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';
import { createProductionPlanArtifact } from '../src/artifacts/production-planner';
import { createStoryboardArtifact } from '../src/artifacts/storyboarder';

test('editorial criteria flows from Creative Director into script, production plan, and storyboard',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',path:'/tmp/proof.png',title:'Prueba real',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const angle={id:'angle_1',visual_evidence_ids:['evi_1']};
  const creative=createCreativeDirection({job_id:'job_1',angle,evidence});
  assert.ok(creative.editorial_criteria.must_read.length>=1);
  assert.ok(creative.editorial_criteria.qa_blockers.includes('silent_or_unverified_audio'));
  const [script]=generateEvidenceBackedScripts({job_id:'job_1',angle,evidence,count:1,creative_direction:creative});
  assert.deepEqual(script.editorial_criteria.must_not_read,creative.editorial_criteria.must_not_read);
  const plan=createProductionPlanArtifact({job_id:'job_1',script,evidence});
  assert.deepEqual(plan.editorial_criteria.quality_bars,creative.editorial_criteria.quality_bars);
  const storyboard=createStoryboardArtifact({job_id:'job_1',script,production_plan:plan});
  assert.deepEqual(storyboard.editorial_criteria.qa_blockers,creative.editorial_criteria.qa_blockers);
  assert.ok(storyboard.human_preview_summary.approval_prompt.includes('criterios editoriales'));
});
