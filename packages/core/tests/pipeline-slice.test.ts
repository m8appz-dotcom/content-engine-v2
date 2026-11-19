import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { migrate } from '../src/db/client';
import { createJob, addEvidence, transitionJob, createStoryAngle, listStoryAngles } from '../src/db/repositories';
import { generateEvidenceBackedAngles } from '../src/artifacts/story-miner';

test('evidence-backed story miner creates three validated angles',()=>{
  const dbPath=`/tmp/content-engine-v2-test-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const job=createJob(db,{title:'Test job'});
  transitionJob(db,job.id,'evidence_collecting');
  transitionJob(db,job.id,'evidence_collected');
  const ev=addEvidence(db,{job_id:job.id,type:'screenshot',title:'Homepage proof',path:'outputs/evidence/test/home.png',rights_status:'owned',privacy_level:'public',public_safe:true,metadata:{}}) as any;
  const angles=generateEvidenceBackedAngles({job_id:job.id,evidence:[ev],source_registry_snapshot_id:'srcsnap_test'});
  assert.equal(angles.length,3);
  assert.deepEqual(angles.map(a=>a.visual_evidence_ids[0]),[ev.id,ev.id,ev.id]);
  for(const angle of angles) createStoryAngle(db,{job_id:job.id,angle});
  assert.equal(listStoryAngles(db,job.id).length,3);
  db.close(); unlinkSync(dbPath);
});
