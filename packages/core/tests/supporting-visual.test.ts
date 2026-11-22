import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductionPlanArtifact} from '../src/artifacts/production-planner';
test('documentary claims retain a real public image as supporting scene evidence',()=>{
  const evidence=[{id:'document',type:'project_asset',path:'docs/architecture.md',title:'Architecture',rights_status:'owned',privacy_level:'public',public_safe:1},{id:'capture',type:'screenshot',path:'docs/original.jpg',title:'Original app',rights_status:'owned',privacy_level:'public',public_safe:1},{id:'private',type:'screenshot',path:'/private/image.jpg',rights_status:'owned',privacy_level:'internal',public_safe:0}];
  const script={id:'script',hook:'Show the source.',cta:'Review the story.',voiceover:'Show the source and review the story.',duration_sec:20,claims:[{claim_text:'Claims link to sources.',evidence_ids:['document']}],beats:[{beat_id:'one',time_start_sec:0,time_end_sec:20,line:'Show the source and review the story.',suggested_visual:'Original application',evidence_ids:['document']}]};
  const plan=createProductionPlanArtifact({job_id:'project',script,evidence});
  assert.deepEqual(plan.assets_needed.map(a=>a.evidence_id),['document','capture']);
  assert.deepEqual(plan.scenes[0].evidence_ids,['document','capture']);
});
