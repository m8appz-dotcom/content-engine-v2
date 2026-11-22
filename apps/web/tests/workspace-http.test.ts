import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {readJson,publicArtifact} from '../app/lib/http';
test('JSON parsing rejects invalid and oversized chunked requests',async()=>{
  const schema=z.object({title:z.string()});
  assert.deepEqual(await readJson(new Request('http://localhost',{method:'POST',body:'{"title":"A story"}'}),schema),{title:'A story'});
  await assert.rejects(readJson(new Request('http://localhost',{method:'POST',body:'{'}),schema),{code:'invalid_json'});
  const nested='{"metadata":'+ '{"a":'.repeat(2500)+'null'+'}'.repeat(2500)+'}';
  await assert.rejects(readJson(new Request('http://localhost',{method:'POST',body:nested}),z.object({metadata:z.unknown()})),{code:'request_too_complex'});
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(65536));c.enqueue(new Uint8Array(65537));c.close();}});
  await assert.rejects(readJson(new Request('http://localhost',{method:'POST',body:stream,duplex:'half'} as RequestInit),schema),{code:'request_too_large'});
});
test('hosted responses retain useful artifact content and omit private filesystem diagnostics',()=>{
  const result=publicArtifact({video_path:'/home/private/draft.mp4',title:'My video',story:{notes:'Failed at C:\\private\\result.wav',narration:'Show the source.'},items:[{output_path:'/tmp/file',score:91}],stack:'private stack'});
  assert.deepEqual(result,{title:'My video',story:{notes:'Private workspace artifact',narration:'Show the source.'},items:[{score:91}]});
});
