import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import path from 'node:path';import {tmpdir} from 'node:os';import {spawnSync,execFileSync} from 'node:child_process';
import {muxDraftAudio} from '../src/renderer/draft-renderer';
const ffmpeg=process.env.FFMPEG_BIN||'ffmpeg',available=spawnSync(ffmpeg,['-version']).status===0;
test('a visual re-render preserves the accepted AAC packets exactly',{skip:!available},()=>{
 const root=mkdtempSync(path.join(tmpdir(),'content-aac-copy-'));
 try{
  const source=path.join(root,'accepted.mp4'),visual=path.join(root,'new-visual.mp4'),out=path.join(root,'output.mp4');
  execFileSync(ffmpeg,['-y','-f','lavfi','-i','color=c=black:s=64x64:r=30:d=2','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1.9851875','-c:v','libx264','-c:a','aac','-shortest','-movie_timescale','48000',source],{stdio:'ignore'});
  execFileSync(ffmpeg,['-y','-f','lavfi','-i','color=c=white:s=64x64:r=30:d=2','-c:v','libx264',visual],{stdio:'ignore'});
  muxDraftAudio({ffmpeg,silentVideo:visual,mixPath:'not-used.wav',preservedVideo:source,destination:out});
  const hash=(file:string)=>execFileSync(ffmpeg,['-v','error','-i',file,'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-'],{encoding:'utf8'}).trim();
  assert.equal(hash(out),hash(source));
  const packets=(file:string)=>JSON.parse(execFileSync(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=pts,dts,duration,side_data_list','-of','json',file],{encoding:'utf8'})).packets;
  assert.deepEqual(packets(out),packets(source),'Audio positions, packet durations and priming metadata must remain unchanged.');
 }finally{rmSync(root,{recursive:true,force:true});}
});
