import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorialVisualRevision} from '../src/artifacts/editorial-visual-revision';

function fixture() {
  const evidence=(id:string,path:string)=>({id,job_id:'job',path,title:`Source ${id}`,description:'Actual project material',public_safe:1,rights_status:'owned',privacy_level:'public'});
  const approval=(id:string,artifact_id:string,field:string)=>({id,job_id:'job',artifact_id,status:'approved',approved_by:'fixture-reviewer',metadata_json:JSON.stringify({approval_context:'human_review',[field]:true})});
  return {job_id:'job',script:{id:'script',job_id:'job',status:'approved',script_json:{voiceover:'Read the source. Check the structure. Review before approving.',claims:[{id:'claim',evidence_ids:['doc']}]}},storyboard:{id:'board',job_id:'job',script_id:'script',status:'approved',storyboard_json:{timeline:[{id:'one',narration:'Read the source.',evidence_ids:['image'],shot_recipe:{layout_treatment:'source'}},{id:'two',narration:'Check the structure.',evidence_ids:['image'],shot_recipe:{evidence_treatment:'validation document'}},{id:'three',narration:'Review before approving.',evidence_ids:['image']}],preview_assets:[{evidence_id:'image',path:'assets/original.jpg'}]}},evidence:[evidence('image','assets/original.jpg'),evidence('doc','sources/guide.md'),evidence('new-image','assets/current.jpg')],approvals:[approval('script-approval','script','human_reviewed_script_text'),approval('board-approval','board','human_reviewed_storyboard_preview')]};
}

test('a visual-only revision uses actual project sources and leaves approved inputs immutable',()=>{
  const input=fixture(),before=JSON.stringify(input);
  const revision=createEditorialVisualRevision(input);
  assert.equal(JSON.stringify(input),before);
  assert.equal(revision.source_storyboard_id,'board');assert.equal(revision.script_id,'script');
  assert.equal(revision.status,'pending_visual_review');assert.equal(revision.narration_preserved,true);
  assert.match(revision.source_storyboard_sha256,/^[a-f0-9]{64}$/);
  assert.match(revision.source_script_sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(revision.assets.map(a=>a.evidence_id),['image','doc']);
  assert.deepEqual(revision.scene_sources.map(s=>[s.kind,s.evidence_id]),[['source','image'],['document','doc'],['decision','image']]);
  assert.equal(revision.scene_sources[2].review_record?.script_approval_id,'script-approval');
  assert.equal(revision.scene_sources[2].review_record?.storyboard_approval_id,'board-approval');
  assert.match(revision.approval_scope,/not this visual revision/);
  assert.equal((revision as any).approved_by,undefined);
});

test('a new capture is used only through explicit owned evidence IDs',()=>{
  const input=fixture();
  const revision=createEditorialVisualRevision({...input,source_evidence_ids:['new-image','doc']});
  assert.deepEqual(revision.assets.map(a=>a.path),['assets/current.jpg','sources/guide.md']);
  assert.equal(revision.scene_sources[0].evidence_id,'new-image');
  assert.throws(()=>createEditorialVisualRevision({...input,source_evidence_ids:['missing']}),{code:'business_validation_failed'});
  assert.throws(()=>createEditorialVisualRevision({...input,source_evidence_ids:['new-image','new-image']}),{code:'business_validation_failed'});
  input.evidence[2].job_id='another-job';
  assert.throws(()=>createEditorialVisualRevision({...input,source_evidence_ids:['new-image']}),{code:'business_validation_failed'});
});

test('restricted, unsafe and unrelated public files are not substitute sources',()=>{
  for(const change of [{public_safe:0},{privacy_level:'restricted'},{rights_status:'unknown'},{path:'secret.json'}]) {
    const input=fixture();Object.assign(input.evidence[0],change);
    assert.throws(()=>createEditorialVisualRevision({...input,source_evidence_ids:['image']}),{code:'business_validation_failed'});
  }
  const input=fixture();input.script.script_json.claims[0].evidence_ids=[];
  assert.equal(createEditorialVisualRevision(input).assets.some(a=>a.kind==='document'),false);
});

test('review-record scenes require recorded human approvals and matching spoken content',()=>{
  const input=fixture();input.approvals=[];
  let revision=createEditorialVisualRevision(input);
  assert.equal(revision.scene_sources.some(s=>s.kind==='decision'),false);
  assert.deepEqual(revision.source_approval_ids,[]);
  const synthetic=fixture();synthetic.approvals[1].metadata_json=JSON.stringify({approval_context:'synthetic_e2e',human_reviewed_storyboard_preview:true});
  assert.equal(createEditorialVisualRevision(synthetic).scene_sources.some(s=>s.kind==='decision'),false);
  const neutral=fixture();neutral.storyboard.storyboard_json.timeline[2].narration='The source remains available.';
  assert.equal(createEditorialVisualRevision(neutral).scene_sources.some(s=>s.kind==='decision'),false);
  const malformed=fixture();malformed.approvals[1].metadata_json='null';
  assert.equal(createEditorialVisualRevision(malformed).scene_sources.some(s=>s.kind==='decision'),false);
  const wrong=fixture();wrong.approvals[1].artifact_id='another-board';
  assert.equal(createEditorialVisualRevision(wrong).scene_sources.some(s=>s.kind==='decision'),false);
});

test('unrelated projects receive no Content Engine-specific source path or fixed copy',()=>{
  const input=fixture();input.job_id='other';input.script.job_id='other';input.storyboard.job_id='other';
  input.evidence=input.evidence.map(item=>({...item,job_id:'other',title:'Independent source'}));
  input.approvals=[];input.storyboard.storyboard_json.timeline=input.storyboard.storyboard_json.timeline.slice(0,1);
  const revision=createEditorialVisualRevision(input);
  assert.equal(revision.scene_sources.length,1);
  assert.equal(revision.assets.some(a=>a.path.includes('docs/')),false);
  assert.equal(JSON.stringify(revision).includes('Content Engine'),false);
});


test('subsequent renders reuse explicit selections only for the same account, job and unchanged approved sources',()=>{
  const input=fixture();
  const prior=createEditorialVisualRevision({...input,scope_actor_id:'account-one',source_evidence_ids:['new-image','doc']});
  const repeat=createEditorialVisualRevision({...input,scope_actor_id:'account-one',prior_visual_revision:prior});
  assert.equal(repeat.selection_mode,'preserved_explicit_evidence');
  assert.deepEqual(repeat.selected_evidence_ids,['new-image','doc']);
  assert.equal(repeat.scene_sources[0].evidence_id,'new-image');
  const override=createEditorialVisualRevision({...input,scope_actor_id:'account-one',prior_visual_revision:prior,source_evidence_ids:['image','doc']});
  assert.equal(override.selection_mode,'explicit_evidence');assert.equal(override.scene_sources[0].evidence_id,'image');
  for(const change of [{scope_actor_id:'another-account'},{job_id:'another-job'},{script_id:'other-script'},{source_storyboard_id:'other-board'},{source_storyboard_sha256:'wrong'},{source_script_sha256:'wrong'}]) {
    const result=createEditorialVisualRevision({...input,scope_actor_id:'account-one',prior_visual_revision:{...prior,...change}});
    assert.equal(result.selection_mode,'approved_storyboard_sources');assert.equal(result.scene_sources[0].evidence_id,'image');
  }
  // Even a correctly scoped prior selection must pass the current evidence gate.
  input.evidence[2].privacy_level='restricted';
  assert.throws(()=>createEditorialVisualRevision({...input,scope_actor_id:'account-one',prior_visual_revision:prior}),{code:'business_validation_failed'});
  assert.throws(()=>createEditorialVisualRevision({...input,scope_actor_id:'account-one',prior_visual_revision:{...prior,selected_evidence_ids:['missing']}}),{code:'business_validation_failed'});
});
