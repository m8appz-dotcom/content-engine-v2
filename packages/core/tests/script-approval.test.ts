import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { migrate } from '../src/db/client';
import { addEvidence, createJob, createScriptCandidate, createStoryAngle, transitionJob, updateScriptStatus } from '../src/db/repositories';
import { generateEvidenceBackedAngles } from '../src/artifacts/story-miner';
import { generateEvidenceBackedScripts } from '../src/artifacts/scriptwriter';
import { verifyScriptClaims, hasProhibitedPublicLanguage } from '../src/artifacts/claim-verifier';

test('script candidate verifies claims against mapped evidence',()=>{
  const dbPath=`/tmp/content-engine-v2-script-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const job=createJob(db,{title:'Script approval'});
  transitionJob(db,job.id,'evidence_collecting'); transitionJob(db,job.id,'evidence_collected');
  const ev=addEvidence(db,{job_id:job.id,type:'screenshot',title:'Visual proof',path:'outputs/evidence/proof.png',rights_status:'owned',privacy_level:'public',public_safe:true,metadata:{}}) as any;
  const angle=generateEvidenceBackedAngles({job_id:job.id,evidence:[ev]})[0];
  createStoryAngle(db,{job_id:job.id,angle}); transitionJob(db,job.id,'angles_generating'); transitionJob(db,job.id,'angles_generated');
  const script=generateEvidenceBackedScripts({job_id:job.id,angle,evidence:[ev],count:1})[0];
  createScriptCandidate(db,{job_id:job.id,script}); transitionJob(db,job.id,'scripts_generating'); transitionJob(db,job.id,'scripts_generated'); transitionJob(db,job.id,'script_pending_approval');
  const verification=verifyScriptClaims({script,evidence:[ev]});
  assert.equal(verification.overall_pass,true);
  assert.deepEqual(hasProhibitedPublicLanguage(script),[]);
  updateScriptStatus(db,job.id,script.id,'approved');
  transitionJob(db,job.id,'script_approved');
  db.close(); unlinkSync(dbPath);
});

test('claim verifier blocks claims with missing evidence mapping',()=>{
  const script={id:'script_bad',claims:[{id:'claim_bad',script_id:'script_bad',claim_text:'Ahorra 90% de tiempo',claim_type:'time_saving',support_level:'direct',evidence_ids:['missing'],public_safe:true,requires_human_approval:false,rewrite_suggestion:null}]};
  const verification=verifyScriptClaims({script,evidence:[]});
  assert.equal(verification.overall_pass,false);
  assert.equal(verification.claim_checks[0].support_level,'unsupported');
});
