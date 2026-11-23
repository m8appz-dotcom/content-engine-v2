import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {reviewDraft} from '../src/scoring/qa-reviewer';

function fixture(run:(input:any)=>void) {
  const root=mkdtempSync(path.join(tmpdir(),'content-qa-truth-'));
  try {
    // Presence/metadata fixtures only. These bytes are not media or human acceptance.
    const file=(name:string)=>{const p=path.join(root,name);writeFileSync(p,'file presence fixture');return p;};
    run({job_id:'job',draft:{id:'draft',render_status:'draft_rendered',video_path:file('video.mp4'),contact_sheet_path:file('sheet.png'),notes:{audio_mix_mode:'voice_only',audio_verified:true,voiceover_path:file('voice.wav'),voiceover_source:'private-speech',product_voiceover_usable:true,audio_metrics:{mean_volume_db:-17,max_volume_db:-1.5}}},script:{voiceover:'Read the original sources and check every claim before approving the full video and audio.',claims:[{id:'claim',evidence_ids:['source']}],editorial_criteria:{must_read:['source'],must_not_read:['unsupported claim'],quality_bars:['readable source']}},storyboard:{timeline:[{id:'scene',evidence_ids:['source'],narration:'Read the source.'}],captions:[{text:'Read the source.'}]},evidence:[{id:'source',rights_status:'owned',privacy_level:'public'}]});
  } finally { rmSync(root,{recursive:true,force:true}); }
}
function pending(report:ReturnType<typeof reviewDraft>) {
  assert.equal(report.assessment_type,'technical_checks');
  assert.equal(report.requires_human_review,true);
  assert.equal(report.perceptual_review.status,'pending');
  assert.equal(report.perceptual_review.required,true);
  assert.equal(report.perceptual_review.geometry_status,'not_evaluated');
  assert.equal(report.publish_ready,false);
  for(const value of Object.values(report.scores))assert.equal(value,null);
  for(const value of Object.values(report.perceptual_review.scores))assert.equal(value,null);
}
function visualValidation() {
  return {version:'editorial_v1',scope:'source_and_timing_integrity',perceptual_review_required:true,pass:true,issues:[],scenes:[{scene_id:'scene',layout:'source',source_kind:'document',source_id:'source',geometry_measured:false,narration_start_sec:0,narration_end_sec:5,caption_count:1,pass:true,issues:[]}]};
}

test('passing technical metadata never claims visual, editorial or listening quality',()=>fixture(input=>{
  // Even stored assertions of human acceptance are not inputs to this checker.
  input.draft.notes.scores={visual_proof:5,audio_quality:5};
  input.draft.notes.perceptual_review={status:'approved',reviewer:'fixture'};
  const report=reviewDraft(input);
  assert.equal(report.pass,true);assert.equal(report.technical_checks.pass,true);
  assert.equal(report.technical_checks.status,'passed');
  assert.equal(report.technical_checks.checks.renderer_visual_validation.status,'not_provided');
  assert.match(report.technical_checks.scope,/no media decoding or perceptual assessment/);
  assert.match(report.gate_b_note,/Technical checks passed.*Review the full video and audio/);
  pending(report);
}));

test('missing sources, dangling scene references and claims without evidence stay blocked',()=>fixture(input=>{
  input.evidence=[];
  let report=reviewDraft(input);
  assert.equal(report.pass,false);
  for(const issue of ['evidence_missing','claim_missing_evidence:claim','timeline_missing_evidence:scene'])assert.ok(report.blocking_issues.includes(issue));
  assert.equal(report.technical_checks.checks.source_references.status,'failed');pending(report);
  input.evidence=[{id:'source',rights_status:'owned',privacy_level:'public'}];
  input.script.claims[0].evidence_ids=[];
  report=reviewDraft(input);assert.ok(report.blocking_issues.includes('claim_without_evidence:claim'));pending(report);
}));

test('file, rights/privacy and caption gates remain independent of perceptual scores',()=>fixture(input=>{
  input.draft.video_path=undefined;input.draft.contact_sheet_path=undefined;
  input.evidence[0].rights_status='unknown';input.evidence[0].privacy_level='restricted';input.storyboard.captions=[];
  const report=reviewDraft(input);assert.equal(report.pass,false);
  for(const issue of ['draft_video_missing','contact_sheet_missing','unsafe_rights:source','restricted_privacy:source','captions_missing'])assert.ok(report.blocking_issues.includes(issue));
  for(const check of ['artifact_files','rights_metadata','privacy_metadata','caption_metadata'] as const)assert.equal(report.technical_checks.checks[check].status,'failed');
  pending(report);
}));

test('voice-only audio still requires usable speech, a source and numeric measured volume',()=>fixture(input=>{
  input.draft.notes.voiceover_source=null;input.draft.notes.product_voiceover_usable=false;
  let report=reviewDraft(input);assert.equal(report.pass,false);
  assert.ok(report.blocking_issues.includes('voiceover_source_missing'));assert.ok(report.blocking_issues.includes('product_voiceover_unusable'));pending(report);
  input.draft.notes.voiceover_source='private-speech';input.draft.notes.product_voiceover_usable=true;
  for(const invalid of [null,undefined,'',false,'-17',NaN,Infinity]) {
    input.draft.notes.audio_metrics.mean_volume_db=invalid;
    report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('audio_volume_metrics_missing'));pending(report);
  }
  input.draft.notes.audio_metrics.mean_volume_db=-60;
  report=reviewDraft(input);assert.ok(report.blocking_issues.includes('audio_effectively_silent'));
}));

test('renderer visual checks are optional objective metadata, never a perceptual approval',()=>fixture(input=>{
  input.draft.notes.visual_validation=visualValidation();
  let report=reviewDraft(input);assert.equal(report.pass,true);
  assert.equal(report.technical_checks.checks.renderer_visual_validation.status,'passed');pending(report);
  input.draft.notes.visual_validation.pass=false;
  input.draft.notes.visual_validation.issues=['text_too_small'];
  input.draft.notes.visual_validation.scenes[0].pass=false;
  input.draft.notes.visual_validation.scenes[0].issues=['text_too_small'];
  report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_failed'));pending(report);
}));

test('inconsistent and malformed renderer validation cannot claim a technical pass',()=>fixture(input=>{
  const invalidValues:any[]=[null,{}, {...visualValidation(),version:'other'}, {...visualValidation(),scenes:[]}, {...visualValidation(),pass:false}, {...visualValidation(),issues:['problem']}];
  for(const [key,value] of Object.entries({scene_id:'',layout:'',source_id:'',source_kind:'unsupported',source_area_fraction:1.1,min_font_px:31,narration_start_sec:-1,narration_end_sec:0,caption_count:0.5,pass:false,issues:['problem']})) {
    const validation=visualValidation();(validation.scenes[0] as any)[key]=value;invalidValues.push(validation);
  }
  for(const key of ['source_area_fraction','min_font_px','narration_start_sec','narration_end_sec','caption_count']) {
    const validation=visualValidation();(validation.scenes[0] as any)[key]=NaN;invalidValues.push(validation);
  }
  for(const validation of invalidValues) {
    input.draft.notes.visual_validation=validation;
    const report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_invalid'));pending(report);
  }
}));


test('renderer source integrity cannot use another project source and leaves geometry unmeasured',()=>fixture(input=>{
  const validation=visualValidation();validation.scenes[0].source_id='unrelated';
  input.draft.notes.visual_validation=validation;
  let report=reviewDraft(input);assert.equal(report.pass,false);
  assert.ok(report.blocking_issues.includes('visual_validation_source_missing'));pending(report);
  validation.scenes[0].source_id='source';
  report=reviewDraft(input);assert.equal(report.pass,true);pending(report);
}));


test('unmeasured geometry passes source/timing checks without claiming readability',()=>fixture(input=>{
  const validation=visualValidation();
  input.draft.notes.visual_validation=validation;
  input.draft.duration_sec=6;
  const scene=validation.scenes[0] as any;
  scene.source_width_px=936;scene.source_height_px=879;
  scene.planned_start_sec=0;scene.planned_end_sec=6;
  let report=reviewDraft(input);assert.equal(report.pass,true);pending(report);
  assert.equal(Object.hasOwn(scene,'min_font_px'),false);assert.equal(Object.hasOwn(scene,'source_area_fraction'),false);
  scene.min_font_px=44; // A measurement flag cannot be contradicted by supplied values.
  report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_invalid'));
  scene.geometry_measured=true;scene.source_area_fraction=0.6;
  report=reviewDraft(input);assert.equal(report.pass,true);pending(report);
  for(const [key,value] of Object.entries({min_font_px:NaN,source_area_fraction:1.1,source_width_px:'936',source_height_px:-1,planned_end_sec:-1})) {
    const old=scene[key];scene[key]=value;
    report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_invalid'));pending(report);
    scene[key]=old;
  }
}));

test('source/timing validation is bound to the actual storyboard scenes and video duration',()=>fixture(input=>{
  input.draft.duration_sec=4;
  const validation=visualValidation();input.draft.notes.visual_validation=validation;
  let report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_timing_invalid'));
  input.draft.duration_sec=6;validation.scenes[0].scene_id='other-scene';
  report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_scene_mismatch'));
  validation.scenes[0].scene_id='scene';(validation as any).scope='visual_quality';
  report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_invalid'));
  validation.scope='source_and_timing_integrity';validation.perceptual_review_required=false;
  report=reviewDraft(input);assert.equal(report.pass,false);assert.ok(report.blocking_issues.includes('visual_validation_invalid'));
}));
