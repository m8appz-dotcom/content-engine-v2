import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionPlanArtifact } from '../src/artifacts/production-planner';
import { runDeterministicProductiveCrew } from '../../../services/crew/crews/content_engine_v2';

test('production plan consumes productive crew decisions instead of empty MVP defaults',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',path:'/tmp/proof.png',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const script={id:'script_1',beats:[
    {beat_id:'beat_1',time_start_sec:0,time_end_sec:10,line:'Mira prueba real.',suggested_visual:'Prueba',evidence_ids:['evi_1']},
    {beat_id:'beat_2',time_start_sec:10,time_end_sec:20,line:'Detalle claro.',suggested_visual:'Detalle',evidence_ids:['evi_1']},
    {beat_id:'beat_3',time_start_sec:20,time_end_sec:30,line:'Cierre con beneficio claro.',suggested_visual:'CTA',evidence_ids:['evi_1']}
  ],claims:[{evidence_ids:['evi_1'],claim_text:'x'}],duration_sec:30,hook:'Hook',cta:'CTA'};
  const crew=runDeterministicProductiveCrew({job_id:'job_1',script,evidence});
  const plan=createProductionPlanArtifact({job_id:'job_1',script,evidence,productive_crew:crew});
  assert.equal(plan.productive_crew_id,crew.id);
  assert.equal(plan.voiceover_plan.needs_tts,true);
  assert.equal(plan.music_plan.required,true);
  assert.equal(plan.sfx_plan.required,true);
  assert.ok(plan.broll_plan.length>=3);
  assert.equal(plan.approval_requirements.synthetic_approval_allowed_for_publish,false);
  assert.ok(plan.scenes.every((s:any)=>s.beat_kind && s.audio_intent && s.secondary_visual_or_broll && s.scene_template && s.music_cue && s.sfx_cue));
});
