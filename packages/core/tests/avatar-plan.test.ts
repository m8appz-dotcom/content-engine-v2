import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionPlanArtifact } from '../src/artifacts/production-planner';
import { createStoryboardArtifact } from '../src/artifacts/storyboarder';

test('avatar/presenter stays disabled unless Creative Director explicitly requests it',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',path:'/tmp/proof.png',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const script={id:'script_1',hook:'Hook',cta:'CTA',duration_sec:20,avatar_decision:{use_avatar:false,reason:'Evidence is enough.',presenter_role:'none',asset_required:false},beats:[{beat_id:'beat_1',beat_kind:'hook',time_start_sec:0,time_end_sec:20,line:'Mira la evidencia.',suggested_visual:'proof',evidence_ids:['evi_1']}],claims:[{claim_text:'x',evidence_ids:['evi_1']}]};
  const plan=createProductionPlanArtifact({job_id:'job_1',script,evidence});
  assert.equal(plan.avatar_plan.enabled,false);
  assert.equal(plan.avatar_plan.role,'none');
  const storyboard=createStoryboardArtifact({job_id:'job_1',script,production_plan:plan});
  assert.equal(storyboard.avatar_plan.enabled,false);
});

test('avatar/presenter request requires a real presenter asset in the plan',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',path:'/tmp/proof.png',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const script={id:'script_1',hook:'Hook',cta:'CTA',duration_sec:20,avatar_decision:{use_avatar:true,reason:'Presenter should add trust at CTA.',presenter_role:'cta',asset_required:true},beats:[{beat_id:'beat_1',beat_kind:'cta',time_start_sec:0,time_end_sec:20,line:'Aprueba antes de publicar.',suggested_visual:'proof',evidence_ids:['evi_1']}],claims:[{claim_text:'x',evidence_ids:['evi_1']}]};
  const plan=createProductionPlanArtifact({job_id:'job_1',script,evidence});
  assert.equal(plan.avatar_plan.enabled,true);
  assert.equal(plan.avatar_plan.asset_required,true);
  assert.equal(plan.avatar_plan.asset_path,null);
  assert.ok(plan.avatar_plan.reject_if.includes('presenter asset missing'));
});
