import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reviewDraft } from '../src/scoring/qa-reviewer';

test('QA blocks drafts that have video but no verified audible audio',()=>{
  const out=mkdtempSync(path.join(tmpdir(),'ce2-qa-audio-'));
  const video=path.join(out,'draft.mp4'); const sheet=path.join(out,'sheet.png'); const timeline=path.join(out,'timeline.json');
  writeFileSync(video,'placeholder'); writeFileSync(sheet,'png'); writeFileSync(timeline,JSON.stringify({draft_id:'draft_1'}));
  const draft={id:'draft_1',video_path:video,contact_sheet_path:sheet,timeline_json_path:timeline,render_status:'draft_rendered',notes:{audio_verified:false,audio_metrics:{mean_volume_db:-91,max_volume_db:-91}}};
  const script={id:'script_1',voiceover:'Esta narración debería existir y escucharse claramente antes de aprobar QA.',claims:[]};
  const storyboard={timeline:[{id:'tl_1',evidence_ids:['evi_1'],narration:'Debe escucharse'}],captions:[{text:'caption'}]};
  const qa=reviewDraft({job_id:'job_1',draft,script,storyboard,evidence:[{id:'evi_1',rights_status:'owned',privacy_level:'public'}]});
  assert.equal(qa.pass,false);
  assert.ok(qa.blocking_issues.includes('audio_not_verified'));
  assert.ok(qa.blocking_issues.includes('audio_effectively_silent'));
  assert.equal(qa.scores.audio_quality,null);
  assert.equal(qa.technical_checks.checks.audio_measurement_metadata.status,'failed');
  assert.equal(qa.perceptual_review.status,'pending');
  rmSync(out,{recursive:true,force:true});
});
