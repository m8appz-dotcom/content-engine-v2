import test from 'node:test';
import assert from 'node:assert/strict';
import { extractConversationEvents } from '../src/artifacts/conversation-evidence';
import { generateEvidenceBackedAngles } from '../src/artifacts/story-miner';

test('conversation evidence extracts critique decision and drives story angle',()=>{
  const artifact=extractConversationEvents({job_id:'job_1',conversation_text:'user: Una basura de video con una voz inaceptable\nassistant: corregí espeak y generé cards\nuser: Exacto, aplica el fix'});
  assert.ok(artifact.events.some(e=>e.event_type==='human_critique'));
  const evidence=artifact.events.map(e=>({id:e.id,job_id:'job_1',type:'conversation_event',title:e.quote,description:e.story_value,rights_status:'owned',privacy_level:'internal',public_safe:false,metadata_json:JSON.stringify({event_type:e.event_type,speaker:e.speaker})}));
  const angles=generateEvidenceBackedAngles({job_id:'job_1',evidence,count:1});
  assert.equal(angles[0].title,'De crítica humana a mejora real del sistema');
  assert.ok(angles[0].visual_evidence_ids.length>0);
});
