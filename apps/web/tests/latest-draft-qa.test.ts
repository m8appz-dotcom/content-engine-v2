import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';

test('QA of a previous draft cannot mark the newly rendered video as checked',()=>{
  const root=mkdtempSync(path.join(tmpdir(),'content-qa-version-'));
  try{
    // The subprocess closes every SQLite connection before removing its fixture.
    const output=execFileSync(process.execPath,['--import','tsx','--input-type=module','--eval',`
      import {migrate} from './packages/core/src/db/client.ts';
      import {createJob,createStoryAngle,createScriptCandidate,createProductionPlan,createStoryboard,createDraft,getJob,listQaReports} from './packages/core/src/db/repositories.ts';
      import {POST} from './apps/web/app/api/jobs/[id]/qa/route.ts';
      const db=migrate();const job=createJob(db,{title:'Versioned QA fixture'});
      createStoryAngle(db,{job_id:job.id,angle:{id:'angle',title:'Fixture'}});
      createScriptCandidate(db,{job_id:job.id,script:{id:'script',angle_id:'angle',status:'approved',duration_sec:20}});
      createProductionPlan(db,{job_id:job.id,script_id:'script',plan:{id:'plan'}});
      createStoryboard(db,{job_id:job.id,script_id:'script',production_plan_id:'plan',storyboard:{id:'board'}});
      for(const id of ['old','new'])createDraft(db,{job_id:job.id,script_id:'script',storyboard_id:'board',draft:{id,video_path:'fixture.mp4',render_status:'draft_rendered'}});
      db.prepare('UPDATE drafts SET created_at=? WHERE id=?').run('2026-01-01T00:00:00Z','old');
      db.prepare('UPDATE drafts SET created_at=? WHERE id=?').run('2026-01-02T00:00:00Z','new');
      db.prepare('UPDATE jobs SET status=? WHERE id=?').run('draft_rendered',job.id);
      const response=await POST(new Request('http://localhost/api/jobs/'+job.id+'/qa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft_id:'old'})}),{params:Promise.resolve({id:job.id})});
      console.log(JSON.stringify({status:response.status,payload:await response.json(),job:getJob(db,job.id).status,reports:listQaReports(db,job.id).length,drafts:db.prepare('SELECT COUNT(*) AS n FROM drafts').get().n}));
      db.close();
    `],{cwd:process.cwd(),env:{...process.env,CONTENT_ORIGINAL_WORKSPACE:'0',DATABASE_PATH:path.join(root,'fixture.sqlite')},encoding:'utf8'});
    const result=JSON.parse(output.trim().split('\n').at(-1)!);
    assert.equal(result.status,409);assert.equal(result.payload.error.code,'stale_draft');
    assert.equal(result.job,'draft_rendered');assert.equal(result.reports,0);assert.equal(result.drafts,2);
  }finally{rmSync(root,{recursive:true,force:true});}
});
