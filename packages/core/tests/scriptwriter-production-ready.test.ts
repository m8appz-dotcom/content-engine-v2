import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreativeDirection } from '../src/artifacts/creative-director';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';

test('scriptwriter creates retention-first audiovisual beats, not flat voiceover',()=>{
  const evidence=[{id:'evi_1',type:'screenshot',title:'Captura real',rights_status:'owned',privacy_level:'public',public_safe:1}];
  const angle={id:'angle_1',visual_evidence_ids:['evi_1']};
  const creative=createCreativeDirection({job_id:'job_1',angle,evidence});
  const [script]=generateEvidenceBackedScripts({job_id:'job_1',angle,evidence,count:1,creative_direction:creative});
  assert.deepEqual(script.beats.map((b:any)=>b.beat_kind),['hook','setup','proof','tension','reveal','benefit','cta']);
  assert.equal(script.duration_sec,42);
  assert.ok(script.voiceover.length>120);
  assert.ok(script.beats.every((b:any)=>b.suggested_visual && b.audio_intent && b.why_it_matters && b.change_from_previous));
  assert.equal(script.production_readiness!.has_visual_contract,true);
  assert.equal(script.production_readiness!.has_audio_contract,true);
  assert.equal(script.production_readiness!.has_change_per_beat,true);
});
