import test from 'node:test';
import assert from 'node:assert/strict';
import { unlinkSync } from 'node:fs';
import { migrate } from '../src/db/client';
import { createJob, createTaskRun, finishTaskRun, listTaskRuns, withTaskRun } from '../src/db/repositories';

test('task runs are created, finished, and listed for a job', async()=>{
  const dbPath=`/tmp/content-engine-v2-task-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const job=createJob(db,{title:'Task runs'});
  const task=createTaskRun(db,{job_id:job.id,task_type:'smoke',input:{a:1}}) as any;
  finishTaskRun(db,task.id,'succeeded',{ok:true});
  const runs=listTaskRuns(db,job.id) as any[];
  assert.equal(runs.length,1);
  assert.equal(runs[0].status,'succeeded');
  await withTaskRun(db,{job_id:job.id,task_type:'wrapped'},async()=>({wrapped:true}));
  assert.equal((listTaskRuns(db,job.id) as any[]).length,2);
  db.close(); unlinkSync(dbPath);
});

test('migration includes idempotency table',()=>{
  const dbPath=`/tmp/content-engine-v2-idem-${Date.now()}.sqlite`;
  const db=migrate(dbPath);
  const table=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='idempotency_keys'").get() as any;
  assert.equal(table.name,'idempotency_keys');
  db.close(); unlinkSync(dbPath);
});
