import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createSparkNarration,narrationChunks} from '../src/ai/spark-narration';

test('narration preserves sentence boundaries, words and abbreviations within bounded requests',()=>{
  const text='Dr. Smith checks the source. Content Engine checks the draft. '+ 'Review the evidence carefully. '.repeat(12);
  const parts=narrationChunks(text);
  assert.equal(parts.join(' '),text.trim());
  assert.equal(parts[0],'Dr. Smith checks the source.');
  assert.ok(parts.every(part=>part.length<=240));
  const long='Read '+ 'the source '.repeat(60)+'carefully.';
  assert.equal(narrationChunks(long).join(' '),long);
  assert.ok(narrationChunks(long).every(part=>part.length<=240));
});

test('speech assembly retains every PCM packet and inserts only pauses between complete sentences',async()=>{
  const root=mkdtempSync(path.join(tmpdir(),'content-speech-'));
  const previous={url:process.env.SPARK_TTS_URL,token:process.env.SPARK_TTS_TOKEN};
  process.env.SPARK_TTS_URL='http://127.0.0.1:18121';process.env.SPARK_TTS_TOKEN='test-fixture';
  try{
    const inputs:string[]=[];
    const fetcher:typeof fetch=async(_url,options)=>{
      const input=JSON.parse(String(options?.body));inputs.push(input.input);
      assert.equal(input.voice,'Aria');assert.equal(input.language,'en-US');
      const pcm=Buffer.alloc(8820,inputs.length);
      const body=new ReadableStream({start(c){c.enqueue(pcm.subarray(0,333));c.enqueue(pcm.subarray(333));c.close();}});
      return new Response(body,{headers:{'Content-Type':'audio/pcm','X-Audio-Sample-Rate':'22050'}});
    };
    const destination=path.join(root,'voice.wav');
    const result=await createSparkNarration('Content Engine checks the draft. Read the source.',destination,fetcher);
    assert.deepEqual(inputs,['CON-tent Engine checks the draft.','Read the source.']);
    const wav=readFileSync(destination),pauseBytes=Math.round(22050*0.12)*2;
    assert.equal(wav.readUInt32LE(24),22050);assert.equal(wav.readUInt32LE(40),17640+pauseBytes);
    assert.ok(wav.subarray(44,8864).every(byte=>byte===1));
    assert.ok(wav.subarray(8864,8864+pauseBytes).every(byte=>byte===0));
    assert.ok(wav.subarray(8864+pauseBytes).every(byte=>byte===2));
    assert.equal(result.duration,(17640+pauseBytes)/44100);
    const failed=path.join(root,'invalid.wav');
    await assert.rejects(()=>createSparkNarration('Read the source.',failed,async()=>new Response(Buffer.alloc(8820),{headers:{'Content-Type':'audio/pcm','X-Audio-Sample-Rate':'24000'}})),{code:'provider_failed'});
    assert.equal(existsSync(failed),false);
    await assert.rejects(()=>createSparkNarration('Read the source.',failed,async()=>new Response(Buffer.alloc(4411),{headers:{'Content-Type':'audio/pcm','X-Audio-Sample-Rate':'22050'}})),{code:'provider_failed'});
    assert.equal(existsSync(failed),false);
  }finally{
    if(previous.url===undefined)delete process.env.SPARK_TTS_URL;else process.env.SPARK_TTS_URL=previous.url;
    if(previous.token===undefined)delete process.env.SPARK_TTS_TOKEN;else process.env.SPARK_TTS_TOKEN=previous.token;
    rmSync(root,{recursive:true,force:true});
  }
});
