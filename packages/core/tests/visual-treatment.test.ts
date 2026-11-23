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
  assert.equal(treatment.scene_shot_recipes[0].foreground_text,'Content Engine dashboard screenshot');
  assert.ok(!JSON.stringify(treatment).includes('HookScene'));
  assert.ok(treatment.scene_shot_recipes.every((r:any)=>r.foreground_text.split(' ').length<=8));
  assert.equal(treatment.scene_shot_recipes[1].evidence_treatment,'context_crop');
});

test('visual treatment takes words from the current narration and real conversation',()=>{
  const treatment=createVisualTreatmentArtifact({job_id:'job_2',script:{id:'script_2'},production_plan:{id:'plan_2',scenes:[{id:'scene_1',voiceover_line:'Review the invoice before you approve the payment.'}]},evidence:[{id:'e2',title:'Invoice review'}]});
  assert.equal(treatment.scene_shot_recipes[0].foreground_text,'Review the invoice before you approve the payment.');
  assert.equal(treatment.scene_shot_recipes[0].layout_treatment.proof_module.value,'Invoice review');
  const conversation=createVisualTreatmentArtifact({job_id:'job_3',script:{id:'script_3',production_readiness:{mode:'conversation_story'}},production_plan:{id:'plan_3',scenes:[{id:'scene_1',evidence_ids:['quote_1']}]},evidence:[{id:'quote_1',type:'customer_quote',metadata:{quote:'The invoice arrived without a reference number.'}}]});
  assert.equal(conversation.scene_shot_recipes[0].layout_treatment.proof_module.value,'The invoice arrived without a reference number.');
});
