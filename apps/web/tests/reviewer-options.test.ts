import test from 'node:test';
import assert from 'node:assert/strict';
import {migrate} from '../../../packages/core/src/db/client';
import {createUser} from '../../../packages/core/src/db/repositories';
import {reviewerOptions} from '../app/lib/reviewers';
test('local reviewer options contain only known human approval roles; hosted identity is fixed',()=>{
  const db=migrate(':memory:');
  try{
    createUser(db,{id:'alex_reviewer',name:'Alex Rivera',role:'reviewer'});
    createUser(db,{id:'service_worker',name:'Automation',role:'service_worker'});
    createUser(db,{id:'viewer',name:'Viewer',role:'viewer'});
    assert.deepEqual(reviewerOptions(db),{actor:null,sessionBound:false,reviewers:[{id:'alex_reviewer',name:'Alex Rivera'}]});
    Object.defineProperty(db,'workspaceActor',{value:'authenticated_account'});
    assert.deepEqual(reviewerOptions(db),{actor:'authenticated_account',sessionBound:true,reviewers:[]});
  }finally{db.close();}
});
