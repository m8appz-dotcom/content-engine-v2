import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeDirection } from '../src/artifacts/creative-director';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';

test('creative director produces editorial direction before script generation',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',title:'Captura real',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const angle={id:'angle_1',visual_evidence_ids:['evi_1']};
  const direction=createCreativeDirection({job_id:'job_1',angle,evidence});
  assert.equal(direction.created_by,'creative_director');
  assert.equal(direction.audio_decision.voiceover_required,true);
  assert.equal(direction.broll_decision.required,true);
  assert.ok(direction.reject_script_if.some(x=>/captura/i.test(x)));
  const scripts=generateEvidenceBackedScripts({job_id:'job_1',angle,evidence,count:1,creative_direction:direction});
  assert.equal(scripts[0].creative_direction_id,direction.id);
  assert.ok(scripts[0].beats.every((b:any)=>b.beat_kind && b.audio_intent && b.why_it_matters));
  assert.ok(scripts[0].forbidden_reads.length>0);
});
