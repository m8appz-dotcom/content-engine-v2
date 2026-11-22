import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/jobs/[id]/scripts/route';

test('a rejected asynchronous script operation returns JSON instead of escaping the handler',async()=>{
  const saved={database:process.env.DATABASE_PATH,hosted:process.env.CONTENT_ORIGINAL_WORKSPACE};
  process.env.DATABASE_PATH=':memory:';
  delete process.env.CONTENT_ORIGINAL_WORKSPACE;
  try{
    const response=await POST(new Request('http://localhost/api/jobs/missing/scripts',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{params:Promise.resolve({id:'missing'})});
    assert.ok(response.status>=400);
    assert.match(response.headers.get('Content-Type')||'',/application\/json/);
    const payload=await response.json();
    assert.equal(typeof payload.error.code,'string');
    assert.equal(typeof payload.error.message,'string');
  }finally{
    if(saved.database===undefined)delete process.env.DATABASE_PATH;else process.env.DATABASE_PATH=saved.database;
    if(saved.hosted===undefined)delete process.env.CONTENT_ORIGINAL_WORKSPACE;else process.env.CONTENT_ORIGINAL_WORKSPACE=saved.hosted;
  }
});
