import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisualTreatmentArtifact } from '../src/artifacts/visual-treatment';

test('visual treatment turns generic scenes into human shot recipes',()=>{
  const script={id:'script_1'};
  const plan={id:'plan_1',scenes:[
    {id:'scene_1',beat_id:'b1',beat_kind:'hook',scene_template:'HookScene'},
    {id:'scene_2',beat_id:'b2',beat_kind:'proof',scene_template:'ProofZoomScene'},
    {id:'scene_3',beat_id:'b3',beat_kind:'cta',scene_template:'CtaScene'}
  ]};
  const treatment=createVisualTreatmentArtifact({job_id:'job_1',script,production_plan:plan,evidence:[{id:'e1',title:'Content Engine dashboard screenshot'}]});
  assert.equal(treatment.scene_shot_recipes.length,3);
  assert.equal(treatment.scene_shot_recipes[0].foreground_text,'Prueba real');
  assert.ok(!JSON.stringify(treatment).includes('HookScene'));
  assert.ok(treatment.scene_shot_recipes.every((r:any)=>r.foreground_text.split(' ').length<=6));
  assert.equal(treatment.scene_shot_recipes[1].evidence_treatment,'context_crop');
});
