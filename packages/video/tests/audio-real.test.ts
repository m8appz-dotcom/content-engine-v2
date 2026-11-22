import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createDraftArtifact } from '../src/renderer/draft-renderer';

const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='1080' height='1920'><rect width='1080' height='1920' fill='#101827'/><text x='90' y='260' font-size='86' fill='white'>Audio real</text><text x='90' y='390' font-size='56' fill='#66e3a2'>VO + música + SFX</text></svg>`;

test('draft renderer refuses bad local robotic VO and muxes non-silent music/SFX bed when product voice is missing',async()=>{
  const out=mkdtempSync(path.join(tmpdir(),'ce2-audio-real-'));
  const asset=path.join(out,'evidence.svg'); writeFileSync(asset,svg);
  const script={id:'script_audio',hook:'El audio debe escucharse, no solo existir como pista AAC.',cta:'CTA',duration_sec:20,voiceover:'El audio debe escucharse claramente. Esta narración prueba que el draft contiene voz real, música de cama y un efecto de transición audible.'};
  const storyboard={id:'storyboard_audio',estimated_duration_sec:20,timeline:[{id:'tl_1',start_sec:0,end_sec:20,evidence_ids:['evi_1'],narration:script.voiceover,scene_template:'HookScene',beat_kind:'hook'}],captions:[{scene_id:'s1',start_sec:0,end_sec:5,text:'Audio real audible'}],preview_assets:[{evidence_id:'evi_1',path:asset,type:'screenshot',rights_status:'owned'}]};
  const draft=await createDraftArtifact({job_id:'job_audio',script,storyboard,outputsPath:out});
  assert.equal(draft.notes.audio_verified,true);
  assert.ok(draft.notes.voiceover_path);
  assert.ok(existsSync(draft.notes.voiceover_path));
  assert.equal(draft.notes.voiceover_required,true);
  assert.equal(draft.notes.voiceover_blocker,'acceptable_voiceover_source_missing');
  assert.equal(draft.notes.voiceover_source,null);
  assert.equal(draft.notes.product_voiceover_usable,false);
  assert.ok(draft.notes.music_path && existsSync(draft.notes.music_path));
  assert.ok(draft.notes.sfx_path && existsSync(draft.notes.sfx_path));
  assert.ok(Number(draft.notes.audio_metrics.mean_volume_db)>-45);
  assert.ok(Number(draft.notes.audio_metrics.max_volume_db)>-30);
  const codec=execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','csv=p=0',draft.video_path],{encoding:'utf8'}).trim();
  assert.equal(codec,'aac');
  rmSync(out,{recursive:true,force:true});
});
