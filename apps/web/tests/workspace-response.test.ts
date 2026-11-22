import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkspaceResponse} from '../app/components/workspace-response';
test('empty or HTML error replies show recovery guidance instead of parser errors',async()=>{
  for(const response of [new Response(null,{status:500}),new Response('<html>Unavailable</html>',{status:502})])
    await assert.rejects(readWorkspaceResponse(response),{message:"Couldn't read the reply. Check the project before trying again."});
  await assert.rejects(readWorkspaceResponse(Response.json({error:{message:'Review the source first.'}},{status:400})),{message:'Review the source first.'});
  assert.deepEqual(await readWorkspaceResponse(Response.json({status:'ready'})),{status:'ready'});
});
