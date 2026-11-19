import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { migrate } from '../src/db/client';
import { createUser } from '../src/db/repositories';
import { APPROVAL_ROLES, PUBLISH_ROLES, requireHumanActor, requireKnownActor, isSyntheticActor } from '../src/auth';

test('approval and publish gates require known roles',()=>{
  const dbPath=`/tmp/content-engine-v2-auth-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const owner=createUser(db,{id:'owner_1',name:'Owner',role:'owner'});
  const reviewer=createUser(db,{id:'reviewer_1',name:'Reviewer',role:'reviewer'});
  const operator=createUser(db,{id:'operator_1',name:'Operator',role:'operator'});
  const viewer=createUser(db,{id:'viewer_1',name:'Viewer',role:'viewer'});
  assert.equal(requireKnownActor(db,owner.id,APPROVAL_ROLES,'approve').role,'owner');
  assert.equal(requireKnownActor(db,reviewer.id,APPROVAL_ROLES,'approve').role,'reviewer');
  assert.equal(requireKnownActor(db,operator.id,PUBLISH_ROLES,'publish').role,'operator');
  assert.throws(()=>requireKnownActor(db,viewer.id,APPROVAL_ROLES,'approve'),/requires role/);
  assert.throws(()=>requireKnownActor(db,reviewer.id,PUBLISH_ROLES,'publish'),/requires role/);
  assert.throws(()=>requireKnownActor(db,null,APPROVAL_ROLES,'approve'),/requires actor/);
  db.close(); unlinkSync(dbPath);
});

test('production gates reject synthetic/test actors as human approval',()=>{
  const dbPath=`/tmp/content-engine-v2-human-auth-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const realOwner=createUser(db,{id:'owner_real',name:'Adrian Owner',role:'owner'});
  const e2eOwner=createUser(db,{id:'owner_e2e',name:'E2E Owner',role:'owner'});
  const botOperator=createUser(db,{id:'operator_bot',name:'Automation Bot',role:'operator'});
  assert.equal(isSyntheticActor(realOwner),false);
  assert.equal(isSyntheticActor(e2eOwner),true);
  assert.equal(requireHumanActor(db,realOwner.id,PUBLISH_ROLES,'publish').id,realOwner.id);
  assert.throws(()=>requireHumanActor(db,e2eOwner.id,PUBLISH_ROLES,'publish'),/real human actor/);
  assert.throws(()=>requireHumanActor(db,botOperator.id,PUBLISH_ROLES,'publish'),/real human actor/);
  db.close(); unlinkSync(dbPath);
});
