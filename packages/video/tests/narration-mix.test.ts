import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';
import {makeAudioTrack} from '../src/renderer/draft-renderer';
const ffmpeg=process.env.FFMPEG_BIN||'ffmpeg';const available=spawnSync(ffmpeg,['-version']).status===0;
test('narrated production audio stays voice-only at 48 kHz and never trims the voice',{skip:!available},()=>{
 const root=mkdtempSync(path.join(tmpdir(),'content-narration-mix-'));
 try{
  const source=path.join(root,'source.wav');execFileSync(ffmpeg,['-y','-f','lavfi','-i','sine=frequency=440:duration=1:sample_rate=22050',source],{stdio:'ignore'});
  const result=makeAudioTrack({ffmpeg,duration:1,dir:root,narration:'Test narration fixture',voiceoverRequired:true,voiceoverPath:source});
  assert.equal(result.musicPath,null);assert.equal(result.sfxPath,null);assert.equal(existsSync(path.join(result.audioDir,'music_bed.wav')),false);assert.equal(existsSync(path.join(result.audioDir,'sfx_cues.wav')),false);
  const probe=JSON.parse(execFileSync(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-show_entries','stream=sample_rate,channels:format=duration','-of','json',result.mixPath],{encoding:'utf8'}));
  assert.equal(probe.streams[0].sample_rate,'48000');assert.equal(probe.streams[0].channels,1);assert.ok(Math.abs(Number(probe.format.duration)-1)<0.01);
  const pcm=execFileSync(ffmpeg,['-v','error','-i',result.mixPath,'-f','f32le','-ac','1','-ar','48000','pipe:1']);
  const amplitude=(frequency:number)=>{let real=0,imaginary=0;for(let i=0;i<pcm.length/4;i++){const value=pcm.readFloatLE(i*4),angle=2*Math.PI*frequency*i/48000;real+=value*Math.cos(angle);imaginary+=value*Math.sin(angle);}return Math.hypot(real,imaginary);};
  assert.ok(amplitude(196)/amplitude(440)<0.001,'No artificial 196 Hz music tone');assert.ok(amplitude(920)/amplitude(440)<0.001,'No artificial 920 Hz tick');
  assert.throws(()=>makeAudioTrack({ffmpeg,duration:0.5,dir:root,narration:'Test',voiceoverRequired:true,voiceoverPath:source}),{code:'audio_timing_invalid'});
 }finally{rmSync(root,{recursive:true,force:true});}
});
