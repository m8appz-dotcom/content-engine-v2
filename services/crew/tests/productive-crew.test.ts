import test from 'node:test';
import assert from 'node:assert/strict';
import { runDeterministicProductiveCrew } from '../crews/content_engine_v2';

test('productive crew returns all live production roles with concrete decisions',()=>{
  const script={id:'script_1',beats:[
    {beat_id:'beat_1',line:'Abre con prueba real.',evidence_ids:['evi_1']},
    {beat_id:'beat_2',line:'Muestra el detalle.',evidence_ids:['evi_1']},
    {beat_id:'beat_3',line:'Cierra con beneficio.',evidence_ids:['evi_1']}
  ],claims:[],duration_sec:30,hook:'Hook',cta:'CTA'};
  const run=runDeterministicProductiveCrew({job_id:'job_1',script,evidence:[{id:'evi_1',type:'screenshot',title:'UI real',rights_status:'owned',privacy_level:'public',public_safe:1}]});
  assert.equal(run.roles.length,7);
  assert.deepEqual(run.roles,['creative_director','scriptwriter','storyboard_artist','video_producer','motion_designer','audio_producer','qa_editor']);
  assert.equal(run.decisions.length,7);
  assert.equal(run.audio_needs.voiceover_required,true);
  assert.equal(run.audio_needs.music_required,true);
  assert.equal(run.audio_needs.sfx_required,true);
  assert.equal(run.approval_needs.synthetic_approval_allowed_for_publish,false);
  assert.ok(run.beat_decisions.every(b=>b.viewer_read.length>10 && b.primary_visual.length>4 && b.audio_intent.length>4));
});
