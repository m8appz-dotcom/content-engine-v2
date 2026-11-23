import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {readNarrationSegments} from '../src/audio/narration-timing';

test('measured sentence timing uses the recorded PCM gaps and rejects ambiguity',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'narration-timing-'));
 try{
  const rate=22050,sound=Buffer.alloc(rate*2),pause=Buffer.alloc(Math.round(rate*.12)*2);
  for(let i=0;i<sound.length;i+=2)sound.writeInt16LE(123,i);
  const data=Buffer.concat([sound,pause,sound]),header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);
  const file=path.join(dir,'source.wav');writeFileSync(file,Buffer.concat([header,data]));
  const measured=readNarrationSegments(file,'The first sentence. The second sentence.');
  assert.equal(measured?.length,2);assert.equal(measured?.[0].end,1);assert.equal(measured?.[1].start,1.12);
  assert.equal(readNarrationSegments(file,'One sentence only.'),undefined);
  assert.equal(readNarrationSegments(file,'First. Second. Third.'),undefined);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
