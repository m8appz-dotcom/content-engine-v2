import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { defaultDeliverableContract, evaluateDeliverableContract } from '../src/artifacts/deliverable-contract';
import { migrate } from '../src/db/client';
import { addEvidence, createArtifactVersion, createDeliverableContract, createJob, getActiveDeliverableContract, listArtifactVersions, listEvidence } from '../src/db/repositories';

test('deliverable contract persists visible obligations and evaluates missing/ready/used',()=>{
  const dbPath=`/tmp/content-engine-v2-contract-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const job=createJob(db,{title:'Contract'});
  const contract=defaultDeliverableContract({job_id:job.id,source:'human_ui'});
  createDeliverableContract(db,{job_id:job.id,contract});
  const active=getActiveDeliverableContract(db,job.id)!;
  assert.equal(active.contract_json.style_reference.id,'impressed_v5_visual_story');
  assert.equal(active.contract_json.required_assets.real_app_clips.min_count,5);
  let evaluation=evaluateDeliverableContract({contract:active.contract_json,evidence:listEvidence(db,job.id),artifacts:listArtifactVersions(db,job.id)});
  assert.equal(evaluation.requirements.find(r=>r.key==='real_app_clips')?.status,'missing');
  assert.equal(evaluation.requirements.find(r=>r.key==='shot_asset_map')?.status,'missing');
  for(let i=0;i<5;i++) addEvidence(db,{job_id:job.id,type:'screen_recording',title:`Clip ${i}`,rights_status:'owned',privacy_level:'public',public_safe:true});
  createArtifactVersion(db,{job_id:job.id,artifact_type:'style_reference.json',artifact_id:'style_reference.json',artifact_json:{name:'style_reference.json'}});
  createArtifactVersion(db,{job_id:job.id,artifact_type:'shot_asset_map.json',artifact_id:'shot_asset_map.json',artifact_json:{name:'shot_asset_map.json'}});
  createArtifactVersion(db,{job_id:job.id,artifact_type:'voiceover_timing.json',artifact_id:'voiceover_timing.json',artifact_json:{name:'voiceover_timing.json'}});
  evaluation=evaluateDeliverableContract({contract:active.contract_json,evidence:listEvidence(db,job.id),artifacts:listArtifactVersions(db,job.id)});
  assert.equal(evaluation.requirements.find(r=>r.key==='real_app_clips')?.status,'ready');
  assert.equal(evaluation.requirements.find(r=>r.key==='shot_asset_map')?.status,'used');
  assert.equal(evaluation.requirements.find(r=>r.key==='voiceover_timing')?.status,'used');
  db.close(); unlinkSync(dbPath);
});
