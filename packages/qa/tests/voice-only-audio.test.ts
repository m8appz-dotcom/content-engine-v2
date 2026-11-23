import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';
import {reviewDraft} from '../src/scoring/qa-reviewer';

test('an explicit narrated voice-only mix passes file checks without music, while missing speech still blocks it',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'content-voice-only-qa-'));
 try{
  // File-presence fixtures isolate this rubric. Renderer tests verify real PCM.
  const file=(name:string)=>{const p=path.join(root,name);writeFileSync(p,'fixture');return p;};
  const draft:any={id:'draft',render_status:'draft_rendered',video_path:file('fixture.mp4'),contact_sheet_path:file('fixture.png'),notes:{audio_mix_mode:'voice_only',audio_verified:true,voiceover_path:file('fixture.wav'),voiceover_source:'configured-product-voice',product_voiceover_usable:true,music_path:null,sfx_path:null,audio_metrics:{mean_volume_db:-17,max_volume_db:-1.5}}};
  const input={job_id:'job',draft,script:{voiceover:'Read the source and review the claims before approving this draft. A structural check does not prove a claim true.',editorial_criteria:{must_read:['source'],must_not_read:['unsupported claims'],quality_bars:['clear evidence']}},storyboard:{timeline:[{id:'scene',narration:'Read the source.',evidence_ids:['evidence']}],captions:[{text:'Read the source.'}]},evidence:[{id:'evidence',rights_status:'owned',privacy_level:'public'}]};
  assert.deepEqual(reviewDraft(input).blocking_issues,[]);assert.equal(reviewDraft(input).pass,true);
  draft.notes.audio_mix_mode=undefined;
  assert.deepEqual(reviewDraft(input).blocking_issues,['music_bed_missing','sfx_missing']);
  draft.notes.audio_mix_mode='voice_only';draft.notes.product_voiceover_usable=false;
  assert.ok(reviewDraft(input).blocking_issues.includes('product_voiceover_unusable'));assert.equal(reviewDraft(input).pass,false);
  draft.notes.product_voiceover_usable=true;draft.notes.voiceover_path=path.join(root,'missing.wav');
  assert.ok(reviewDraft(input).blocking_issues.includes('voiceover_missing'));assert.equal(reviewDraft(input).pass,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
