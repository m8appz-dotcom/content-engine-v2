import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync,mkdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildContentEditorialFilm,documentStepsFromClaim,narrationCaptions,type EditorialPlanInput} from '../src/renderer/editorial-plan';

function fixture(topic='delivery'){
 const root=mkdtempSync(path.join(tmpdir(),'editorial-job-'));
 const image=path.join(root,topic+'-capture.png'),document=path.join(root,topic+'-handbook.md');
 execFileSync(process.env.FFMPEG_BIN||'ffmpeg',['-v','error','-f','lavfi','-i','color=c='+(topic==='delivery'?'0x335577':'0x775533')+':s=640x960','-frames:v','1',image],{stdio:'ignore'});
 const lines=topic==='delivery'?[
  'Parcel labels remain attached to each shipment.',
  'Delivery scans record the destination and receiving time.',
  'A dispatcher reviews each delivery. The operator releases the route.',
 ]:[
  'Pump inspections start with a visible pressure reading.',
  'Maintenance records include the measured pressure and inspection date.',
  'A supervisor approves the maintenance record. The mechanic closes the inspection.',
 ];
 writeFileSync(document,'# '+topic+' handbook\n\n'+lines[1]+'\n\nImplementation notes: provider routing and database writes are separate technical concerns.');
 const timeline=lines.map((narration,index)=>({id:'tl_'+(index+1),start_sec:index===0?0:index===1?5:12,end_sec:index===0?5:index===1?12:20,narration,evidence_ids:[topic+'_image',topic+'_document']}));
 const storyboard={id:topic+'_board',job_id:topic+'_job',script_id:topic+'_script',timeline:structuredClone(timeline),editorial_criteria:{must_not_read:['provider','database']}};
 const review={job_id:storyboard.job_id,script_id:storyboard.script_id,storyboard_id:storyboard.id,script_status:'approved',storyboard_status:'approved',script_approval_id:topic+'_script_approval',storyboard_approval_id:topic+'_board_approval'};
 const input:EditorialPlanInput={
  root,narration:lines.join(' '),duration:20,speechDuration:15.7,scriptApproved:true,storyboardApproved:true,
  storyboard,timeline,brand:topic==='delivery'?'Parcel operations':'Pump maintenance',
  evidenceAssets:[
   {evidence_id:topic+'_image',kind:'image',path:image,title:topic+' inspection capture'},
   {evidence_id:topic+'_document',kind:'document',path:document,title:topic+' operations handbook',description:lines[1]},
  ],
  sceneSources:[
   {scene_id:'tl_1',evidence_id:topic+'_image',kind:'source',selection_reason:'The approved opening names this visible source.'},
   {scene_id:'tl_2',evidence_id:topic+'_document',kind:'document',selection_reason:lines[1]},
   {scene_id:'tl_3',evidence_id:topic+'_image',kind:'decision',selection_reason:'The approved narration describes review of this job.',review_record:review},
  ],
  speechSegments:[
   {text:lines[0],start:0,end:2.69},
   {text:lines[1],start:2.81,end:7.08},
   {text:lines[2].split('. ')[0]+'.',start:7.20,end:11.38},
   {text:lines[2].split('. ')[1],start:11.50,end:15.7},
  ],
 };
 return {root,image,document,input,close:()=>rmSync(root,{recursive:true,force:true})};
}
function useFixture(fn:(f:ReturnType<typeof fixture>)=>void){const f=fixture();try{fn(f);}finally{f.close();}}
function rejected(fn:()=>unknown){assert.throws(fn,(error:any)=>error.code==='visual_validation_failed');}

test('check diagram labels retain actual approved words and omit unmatched or oversized claims',()=>{
 assert.deepEqual(documentStepsFromClaim('Content Engine checks the proposed output against defined rules before saving it.'),['proposed output','defined rules','saving it']);
 assert.deepEqual(documentStepsFromClaim('A dispatcher checks the shipment ID against the manifest before loading the truck.'),['shipment ID','manifest','loading the truck']);
 assert.deepEqual(documentStepsFromClaim('Delivery scans record the receiving time.'),[]);
 assert.deepEqual(documentStepsFromClaim('A system checks '+ 'very long input '.repeat(5)+'against rules before proceeding.'),[]);
});

test('document diagram is bound to another domain claim rather than a packaged Content template',()=>useFixture(f=>{
 const claim='A dispatcher checks the shipment ID against the manifest before loading the truck.';
 f.input.timeline[1].narration=claim;
 f.input.storyboard.timeline[1].narration=claim;
 f.input.narration=f.input.timeline.map(scene=>scene.narration).join(' ');
 f.input.speechSegments![1].text=claim;
 writeFileSync(f.document,'# Dispatch handbook\n\n'+claim);
 const scene=buildContentEditorialFilm(f.input).film.scenes[1];
 assert.deepEqual(scene.documentSteps,['shipment ID','manifest','loading the truck']);
 assert.equal(scene.excerpt,claim);
 assert.equal(scene.excerptKind,'approved_claim');
 assert.equal(scene.sourceId,'delivery_document');
 assert.doesNotMatch(JSON.stringify(scene.documentSteps),/Content|schema|business|database|approved|checked/i);
}));

test('two unrelated jobs use their own copy and real source identities without packaged demo leakage',()=>{
 const a=fixture('delivery'),b=fixture('maintenance');
 try{
  const first=buildContentEditorialFilm(a.input),second=buildContentEditorialFilm(b.input);
  assert.equal(first.validation.pass,true);assert.equal(second.validation.pass,true);
  assert.notEqual(first.film.brand,second.film.brand);
  assert.notEqual(first.film.scenes[0].headline,second.film.scenes[0].headline);
  assert.notEqual(first.film.scenes[0].image?.src,second.film.scenes[0].image?.src);
  assert.deepEqual(first.film.scenes.map(s=>s.sourceId),['delivery_image','delivery_document','delivery_image']);
  assert.deepEqual(second.film.scenes.map(s=>s.sourceId),['maintenance_image','maintenance_document','maintenance_image']);
  for(const result of [first,second]){
   assert.deepEqual(result.film.scenes.map(s=>s.kind),['source','document','decision']);
   const displayed=JSON.stringify(result.film);
   assert.doesNotMatch(displayed,/Content Engine|Core invariant|Schema validation|Database write|provider routing/);
   assert.equal(result.film.scenes[1].excerptKind,'approved_claim');
   assert.notEqual(result.film.scenes[1].headline,result.film.scenes[1].excerpt);
   assert.notEqual(result.film.scenes[2].headline,result.film.scenes[2].decisionText);
   assert.ok(result.sourceFiles.every(file=>file.startsWith(a.root+path.sep)||file.startsWith(b.root+path.sep)));
   assert.ok(result.validation.scenes.every(scene=>!('min_font_px' in scene)&&!('source_area_fraction' in scene)&&scene.geometry_measured===false));
   assert.equal(result.validation.perceptual_review_required,true);
  }
 }finally{a.close();b.close();}
});

test('measured segment boundaries determine scene cuts and hold the last scene to the complete audio duration',()=>useFixture(f=>{
 const result=buildContentEditorialFilm(f.input);
 assert.deepEqual(result.film.scenes.map(s=>[s.start,s.end]),[[0,2.81],[2.81,7.20],[7.20,20]]);
 assert.equal(result.film.scenes.at(-1)?.caption.at(-1)?.end,15.7);
 assert.equal(result.film.scenes.flatMap(s=>s.caption).map(c=>c.text).join(' '),f.input.narration);
 assert.ok(result.validation.scenes.every(s=>s.scene_timing_source==='provided_segment_boundaries'));
 assert.ok(result.validation.scenes.every(s=>s.caption_timing_source==='word_proportion_within_provided_segments'));
}));

test('captions balance short tails within each supplied segment without crossing its pause',()=>useFixture(f=>{
 const eight='A convincing draft still needs a closer look.';
 const grouped=narrationCaptions(eight,2.8);
 assert.deepEqual(grouped.map(c=>c.text.split(' ').length),[4,4]);
 assert.equal(grouped.map(c=>c.text).join(' '),eight);
 assert.deepEqual(grouped.map(c=>[c.start,c.end]),[[0,1.4],[1.4,2.8]]);
 const result=buildContentEditorialFilm(f.input),captions=result.film.scenes.flatMap(s=>s.caption);
 assert.deepEqual(result.film.scenes[1].caption.map(c=>c.text.split(' ').length),[4,4]);
 assert.ok(captions.every(c=>c.text.split(' ').length>=2&&c.text.split(' ').length<=7));
 assert.ok(captions.every(c=>f.input.speechSegments!.some(segment=>c.start>=segment.start-1e-9&&c.end<=segment.end+1e-9)));
 assert.equal(captions.map(c=>c.text).join(' '),f.input.narration);
 assert.ok(result.validation.scenes.every(s=>s.caption_timing_source==='word_proportion_within_provided_segments'));
}));

test('decision reveal follows the second sentence and the end card uses only the retained audio tail',()=>useFixture(f=>{
 const original=structuredClone(f.input);
 const {film}=buildContentEditorialFilm({...f.input,publicProductUrl:'https://product.example.com/'});
 const decision=film.scenes[2];
 assert.ok(Math.abs(decision.decisionRevealSec!-(11.50-7.20))<1e-9);
 assert.ok(Math.abs(decision.start+decision.decisionRevealSec!-11.50)<1e-9);
 assert.ok(Math.abs(film.endCard!.start-15.9)<1e-9);
 assert.deepEqual({...film.endCard,start:15.9},{start:15.9,title:film.brand,line:decision.headline,url:'https://product.example.com'});
 assert.equal(film.duration,20);
 assert.equal(film.scenes.at(-1)!.end,20);
 assert.equal(film.scenes.at(-1)!.caption.at(-1)!.end,15.7);
 assert.deepEqual(f.input,original,'The visual plan never modifies approved narration, source timing, or the storyboard.');
}));

test('short tails omit end cards and only canonical public HTTPS origins may be displayed',()=>useFixture(f=>{
 const short={...f.input,duration:16.4,timeline:f.input.timeline.map((scene,index)=>index===2?{...scene,end_sec:16.4}:scene)};
 assert.equal(buildContentEditorialFilm(short).film.endCard,undefined);
 for(const url of ['http://product.example.com','https://localhost','https://127.0.0.1','https://[::1]','https://voice.local','https://host.internal','https://machine.ts.net','https://user:secret@product.example.com','https://product.example.com/path','https://product.example.com/../','https://product.example.com/?','https://product.example.com/#'])rejected(()=>buildContentEditorialFilm({...f.input,publicProductUrl:url}));
 assert.equal(buildContentEditorialFilm(f.input).film.endCard?.url,undefined);
}));

test('image focus uses only a validated rectangle within the unmodified actual source',()=>useFixture(f=>{
 const focus={x:120,y:200,width:400,height:600};
 f.input.evidenceAssets[0].focus=focus;
 const image=buildContentEditorialFilm(f.input).film.scenes[0].image!;
 assert.deepEqual(image.focus,focus);
 assert.equal(image.width,640);assert.equal(image.height,960);
 assert.deepEqual(Buffer.from(image.src.split(',')[1],'base64'),readFileSync(f.image));
 for(const invalid of [{...focus,x:-1},{...focus,width:0},{...focus,x:300},{...focus,y:500},{...focus,height:NaN}]){
  f.input.evidenceAssets[0].focus=invalid;
  rejected(()=>buildContentEditorialFilm(f.input));
 }
}));

test('explicit new source revision is recorded without modifying approved storyboard references',()=>useFixture(f=>{
 const before=structuredClone(f.input.storyboard);
 f.input.evidenceAssets[0].evidence_id='new_actual_capture';
 f.input.sceneSources![0].evidence_id='new_actual_capture';
 f.input.sceneSources![2].evidence_id='new_actual_capture';
 const result=buildContentEditorialFilm(f.input);
 assert.equal(result.film.scenes[0].sourceId,'new_actual_capture');
 assert.deepEqual(f.input.storyboard,before);
}));

test('missing timing artifacts remain explicitly estimated and never alter approved words',()=>useFixture(f=>{
 const result=buildContentEditorialFilm({...f.input,speechSegments:undefined});
 assert.ok(result.validation.scenes.every(s=>s.scene_timing_source==='estimated_word_proportion'));
 assert.equal(result.film.scenes.flatMap(s=>s.caption).map(c=>c.text).join(' '),f.input.narration);
 assert.equal(narrationCaptions(f.input.narration,15.7).map(c=>c.text).join(' '),f.input.narration);
}));

test('decision roles require related real approval records and review semantics',()=>useFixture(f=>{
 const original=f.input.sceneSources![2].review_record!;
 f.input.sceneSources![2].review_record=undefined;
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.sceneSources![2].review_record={...original,job_id:'different_job'};
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.sceneSources![2].review_record={...original,storyboard_approval_id:original.script_approval_id};
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.sceneSources![2].review_record=original;
 f.input.timeline[2].narration='The truck reaches the gate.';
 f.input.storyboard.timeline[2].narration=f.input.timeline[2].narration;
 f.input.narration=f.input.timeline.map(s=>s.narration).join(' ');
 f.input.speechSegments=undefined;
 rejected(()=>buildContentEditorialFilm(f.input));
}));

test('absent choice never invents a third decision role',()=>useFixture(f=>{
 const result=buildContentEditorialFilm({...f.input,sceneSources:undefined});
 assert.deepEqual(result.film.scenes.map(s=>s.kind),['source','source','source']);
 assert.ok(result.film.scenes.every(s=>!s.decisionText));
}));

test('missing, unreferenced and cross-root sources fail closed',()=>useFixture(f=>{
 f.input.evidenceAssets[0].path=path.join(f.root,'missing.png');
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.evidenceAssets[0].path=f.image;
 f.input.sceneSources![0].evidence_id='not_in_assets';
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.sceneSources![0].evidence_id='delivery_image';
 const outside=fixture('unrelated');
 try{f.input.evidenceAssets[0].path=outside.image;rejected(()=>buildContentEditorialFilm(f.input));}finally{outside.close();}
}));

test('linked directories and truncated image files cannot certify readable evidence',()=>useFixture(f=>{
 const linked=path.join(f.root,'linked'),actual=path.join(f.root,'actual');mkdirSync(actual);
 writeFileSync(path.join(actual,'capture.png'),readFileSync(f.image));
 symlinkSync(actual,linked,process.platform==='win32'?'junction':'dir');
 f.input.evidenceAssets[0].path=path.join(linked,'capture.png');
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.evidenceAssets[0].path=f.image;
 writeFileSync(f.image,readFileSync(f.image).subarray(0,40));
 rejected(()=>buildContentEditorialFilm(f.input));
}));

test('tiny actual sources, mismatched narration and invalid timing artifacts are rejected',()=>useFixture(f=>{
 execFileSync(process.env.FFMPEG_BIN||'ffmpeg',['-y','-v','error','-f','lavfi','-i','color=s=80x80','-frames:v','1',f.image],{stdio:'ignore'});
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.narration='Unapproved narration.';
 rejected(()=>buildContentEditorialFilm(f.input));
}));

test('malformed supplied speech segments never silently become approximate timing',()=>useFixture(f=>{
 f.input.speechSegments![1].text='Different spoken words.';
 rejected(()=>buildContentEditorialFilm(f.input));
 f.input.speechSegments![1].text=f.input.timeline[1].narration;
 f.input.speechSegments![1].start=1;
 rejected(()=>buildContentEditorialFilm(f.input));
}));

test('approval flags are factual and validation reports incomplete review',()=>useFixture(f=>{
 f.input.sceneSources=f.input.sceneSources!.map(s=>({...s,kind:'source' as const,evidence_id:'delivery_image',review_record:undefined}));
 const result=buildContentEditorialFilm({...f.input,scriptApproved:false,storyboardApproved:false});
 assert.equal(result.validation.pass,false);
 assert.ok(result.film.scenes.every(s=>!s.scriptApproved&&!s.storyboardApproved));
}));
