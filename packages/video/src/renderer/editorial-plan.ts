import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isIP} from 'node:net';
import type {EditorialCaption,EditorialFilm,EditorialScene} from '../remotion/editorial-types';

export type EditorialSpeechSegment={text:string;start:number;end:number};
export type EditorialEvidenceAsset={evidence_id:string;path:string;kind?:string;type?:string;title?:string;description?:string;privacy_level?:string;rights_status?:string;focus?:{x:number;y:number;width:number;height:number}};
export type EditorialSceneSource={
 scene_id:string;evidence_id:string;kind:'source'|'document'|'decision';selection_reason:string;
 review_record?:{job_id:string;script_id:string;storyboard_id:string;script_status:string;storyboard_status:string;script_approval_id:string;storyboard_approval_id:string};
};
export type EditorialPlanInput={
 root:string;allowedRoots?:readonly string[];narration:string;duration:number;speechDuration:number;
 scriptApproved:boolean;storyboardApproved:boolean;storyboard:any;timeline:readonly any[];
 evidenceAssets:readonly EditorialEvidenceAsset[];sceneSources?:readonly EditorialSceneSource[];
 speechSegments?:readonly EditorialSpeechSegment[];brand?:string;publicProductUrl?:string;
};
function invalid(issue:string):never{throw Object.assign(new Error('The visual plan could not be matched to its narration and readable sources.'),{code:'visual_validation_failed',details:{issue}});}
function text(value:unknown){return typeof value==='string'?value.normalize('NFC').replace(/\s+/g,' ').trim():'';}
function words(value:string){return text(value).split(' ').filter(Boolean);}
function headline(value:string,max=66){
 const clean=text(value);if(clean.length<=max)return clean;
 const prefix=clean.slice(0,max-1),cut=prefix.lastIndexOf(' ');
 return prefix.slice(0,cut>max/2?cut:prefix.length)+'…';
}
function finite(value:unknown){return typeof value==='number'&&Number.isFinite(value);}
function identity(value:unknown){const id=text(value);if(!id||id.length>160||!/^[A-Za-z0-9_-]+$/.test(id))invalid('source_identity_invalid');return id;}
function balancedGroups<T>(items:readonly T[],max=7):T[][]{
 if(!items.length)return [];
 const count=Math.ceil(items.length/max),size=Math.floor(items.length/count),extra=items.length%count,groups:T[][]=[];
 let offset=0;for(let index=0;index<count;index++){const length=size+(index<extra?1:0);groups.push(items.slice(offset,offset+length));offset+=length;}
 return groups;
}
// Display only a caller-verified public HTTPS origin; this performs no lookup
// or fetch and does not certify availability of the destination.
function productOrigin(value:string|undefined):string|undefined{
 if(value===undefined)return undefined;
 if(typeof value!=='string'||value!==value.trim())invalid('public_product_url_invalid');
 let url:URL;try{url=new URL(value);}catch{invalid('public_product_url_invalid');}
 const host=url.hostname.toLowerCase();
 if(value!==url.origin&&value!==url.origin+'/')invalid('public_product_url_invalid');
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.port||!host.includes('.')||isIP(host)||host.startsWith('[')||['localhost','local','internal','localdomain','lan','home','home.arpa','ts.net'].some(suffix=>host===suffix||host.endsWith('.'+suffix)))invalid('public_product_url_invalid');
 return url.origin;
}
/** Labels quote the approved claim; they do not assert completed checks. */
export function documentStepsFromClaim(claim:string):string[]{
 const match=text(claim).match(/checks? (?:the )?(.+?) against (.+?) before (.+?)[.!?]?$/i);
 if(!match)return [];
 const labels=match.slice(1).map(label=>label.replace(/^the\s+/i,'').replace(/[.!?,;:]+$/,'').trim());
 return labels.length===3&&labels.every(label=>label.length>0&&label.length<=45)?labels:[];
}
export function narrationCaptions(value:string,speechDuration:number):EditorialCaption[]{
 const tokens=words(value);if(!tokens.length||!finite(speechDuration)||speechDuration<=0)invalid('narration_timing_invalid');
 const captions:EditorialCaption[]=[];let used=0;
 for(const group of balancedGroups(tokens)){const start=used/tokens.length*speechDuration;used+=group.length;captions.push({text:group.join(' '),start,end:used/tokens.length*speechDuration});}
 return captions;
}
function inside(root:string,file:string){const relative=path.relative(root,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
function checkedFile(raw:string,root:string,allowed:readonly string[]){
 if(typeof raw!=='string'||!raw||raw.includes('\0')||raw.split(/[\\/]/).includes('..'))invalid('source_path_invalid');
 const target=path.resolve(root,raw),canonical=realpathSync(target);
 if(!allowed.some(base=>inside(base,canonical)))invalid('source_outside_allowed_roots');
 let cursor=path.parse(target).root;const components=path.relative(cursor,target).split(path.sep);
 for(let i=0;i<components.length;i++){
  cursor=path.join(cursor,components[i]);const stat=lstatSync(cursor);
  if(stat.isSymbolicLink()||(i<components.length-1?!stat.isDirectory():!stat.isFile()))invalid('linked_or_invalid_source');
 }
 const stat=lstatSync(canonical);if(stat.size<=0||stat.size>20*1024*1024)invalid('source_size_invalid');
 return canonical;
}
function readImage(file:string){
 const output=JSON.parse(execFileSync(process.env.FFPROBE_BIN||'ffprobe',[
  '-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height','-of','json',file,
 ],{encoding:'utf8',timeout:10000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}));
 const image=output.streams?.[0],width=Number(image?.width),height=Number(image?.height);
 if(!['png','mjpeg'].includes(image?.codec_name)||!Number.isInteger(width)||!Number.isInteger(height)||width<320||height<180||width>20000||height>20000||width*height>40000000)invalid('source_resolution_invalid');
 // Validate the actual image without writing or altering a source file.
 execFileSync(process.env.FFMPEG_BIN||'ffmpeg',['-v','error','-xerror','-err_detect','explode','-i',file,'-map','0:v:0','-frames:v','1','-f','null','-'],{timeout:10000,maxBuffer:65536,stdio:['ignore','ignore','pipe']});
 const bytes=readFileSync(file),mime=image.codec_name==='png'?'image/png':'image/jpeg';
 return {src:'data:'+mime+';base64,'+bytes.toString('base64'),width,height,focus:{x:0,y:0,width,height}};
}
function documentExcerpt(file:string,context:string){
 if(lstatSync(file).size>262144)invalid('document_too_large');
 const bytes=readFileSync(file),content=bytes.toString('utf8');
 if(!Buffer.from(content,'utf8').equals(bytes)||content.includes('\0'))invalid('document_not_utf8');
 const terms=new Set(words(context.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')).filter(word=>word.length>3));
 const pieces=content.split(/\r?\n\r?\n/).flatMap(paragraph=>paragraph.length<=320?[paragraph]:paragraph.split(/\r?\n|(?<=[.!?])\s+/));
 const ranked=pieces.map((piece,index)=>({piece:piece.trim(),index,score:words(piece.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ')).reduce((sum,word)=>sum+(terms.has(word)?1:0),0)}))
  .filter(item=>item.piece.length>=16&&item.piece.length<=320&&item.score>0&&item.piece.charCodeAt(0)!==96).sort((a,b)=>b.score-a.score||a.index-b.index);
 if(!ranked.length)invalid('document_not_linked_to_scene');
 return ranked[0].piece;
}
function reviewSemantics(value:string){return /\b(?:review(?:s|ed|ing)?|approv(?:e[sd]?|al|ing)|decid(?:e[sd]?|ing)|decision|revis(?:ar|a|ión)|aprob(?:ar|a|ación)|decis(?:ión|ion))\b/iu.test(value);}
function timedWords(narration:string,speechDuration:number,segments:readonly EditorialSpeechSegment[]|undefined){
 const chunks=segments?.length?segments:[{text:narration,start:0,end:speechDuration}];
 if(chunks.length>1000||text(chunks.map(s=>s.text).join(' '))!==narration)invalid('speech_segments_words_mismatch');
 let previousEnd=0;const timed:Array<{text:string;start:number;end:number;first:boolean;last:boolean}>=[];
 for(const chunk of chunks){
  const tokens=words(chunk.text);
  if(!tokens.length||!finite(chunk.start)||!finite(chunk.end)||chunk.start<previousEnd-0.000001||chunk.end<=chunk.start||chunk.end>speechDuration+0.000001)invalid('speech_segments_timing_invalid');
  tokens.forEach((token,index)=>timed.push({text:token,start:chunk.start+(chunk.end-chunk.start)*index/tokens.length,end:chunk.start+(chunk.end-chunk.start)*(index+1)/tokens.length,first:index===0,last:index===tokens.length-1}));
  previousEnd=chunk.end;
 }
 return {timed,provided:Boolean(segments?.length)};
}
/** No packaged demo lookup: every source and spoken line belongs to this job. */
export function buildContentEditorialFilm(input:EditorialPlanInput){
 try{
  const narration=text(input.narration),board=input.storyboard?.storyboard_json??input.storyboard;
  if(!narration||!board||!Array.isArray(board.timeline)||!Array.isArray(input.timeline)||!input.timeline.length||input.timeline.length>24)invalid('storyboard_missing');
  if(!finite(input.duration)||!finite(input.speechDuration)||input.duration<=0||input.duration>3600||input.speechDuration<=0||input.speechDuration>input.duration)invalid('narration_timing_invalid');
  const publicProductUrl=productOrigin(input.publicProductUrl);
  const boardId=identity(board.id??input.storyboard.id),jobId=identity(board.job_id??input.storyboard.job_id),scriptId=identity(board.script_id??input.storyboard.script_id);
  if(text(input.timeline.map(scene=>scene.narration).join(' '))!==narration||text(board.timeline.map((scene:any)=>scene.narration).join(' '))!==narration)invalid('storyboard_narration_mismatch');
  const ids=input.timeline.map(scene=>identity(scene.id));
  if(new Set(ids).size!==ids.length||board.timeline.length!==ids.length||board.timeline.some((scene:any,index:number)=>scene.id!==ids[index]))invalid('storyboard_scene_identity_mismatch');
  let priorEnd=0;
  for(const scene of input.timeline){
   if(!text(scene.narration)||!finite(scene.start_sec)||!finite(scene.end_sec)||scene.start_sec<priorEnd-0.000001||scene.end_sec<=scene.start_sec||scene.end_sec>input.duration+0.000001)invalid('storyboard_timing_invalid');
   priorEnd=scene.end_sec;
  }
  if(input.timeline[0].start_sec!==0||Math.abs(priorEnd-input.duration)>0.05)invalid('storyboard_timing_invalid');
  if(!Array.isArray(input.evidenceAssets)||!input.evidenceAssets.length)invalid('evidence_missing');
  const root=realpathSync(input.root),allowed=(input.allowedRoots??[root]).map(base=>{const canonical=realpathSync(base);if(!lstatSync(canonical).isDirectory())invalid('source_root_invalid');return canonical;});
  const assets=new Map<string,EditorialEvidenceAsset>();
  for(const asset of input.evidenceAssets){
   const id=identity(asset.evidence_id);if(assets.has(id))invalid('duplicate_evidence_identity');
   if(asset.privacy_level&&asset.privacy_level!=='public')invalid('source_not_public');
   if(asset.rights_status&&!['owned','licensed','authorized','generated'].includes(asset.rights_status))invalid('source_rights_unavailable');
   assets.set(id,asset);
  }
  const choices=new Map<string,EditorialSceneSource>();
  for(const choice of input.sceneSources??[]){
   if(!ids.includes(choice.scene_id)||choices.has(choice.scene_id)||!['source','document','decision'].includes(choice.kind)||!text(choice.selection_reason))invalid('scene_source_mapping_invalid');
   choices.set(choice.scene_id,choice);
  }
  const loaded=new Map<string,{asset:EditorialEvidenceAsset;file:string;kind:'image'|'document';name:string;image?:ReturnType<typeof readImage>}>();
  function load(id:string){
   const cached=loaded.get(id);if(cached)return cached;
   const asset=assets.get(id);if(!asset)invalid('scene_evidence_missing');
   const file=checkedFile(asset.path,root,allowed),ext=path.extname(file).toLowerCase(),declared=asset.kind??asset.type;
   const kind:'image'|'document'|null=declared==='document'?'document':declared==='image'||declared==='screenshot'||declared==='capture'?'image':/\.(md|txt)$/.test(ext)?'document':/\.(png|jpe?g)$/.test(ext)?'image':null;
   if(!kind||(kind==='document'&&!['.md','.txt'].includes(ext)))invalid('source_type_unsupported');
   const name=text(asset.title)||path.basename(file);if(name.length>160)invalid('source_label_too_long');
   const image=kind==='image'?readImage(file):undefined;
   if(asset.focus!==undefined){
    const focus=asset.focus;
    if(!image||!focus||!finite(focus.x)||!finite(focus.y)||!finite(focus.width)||!finite(focus.height)||focus.x<0||focus.y<0||focus.width<=0||focus.height<=0||focus.x+focus.width>image.width||focus.y+focus.height>image.height)invalid('source_focus_invalid');
    image.focus={x:focus.x,y:focus.y,width:focus.width,height:focus.height};
   }
   const result={asset,file,kind,name,...(image?{image}:{})};
   loaded.set(id,result);return result;
  }
  const {timed,provided}=timedWords(narration,input.speechDuration,input.speechSegments);
  const starts:number[]=[];let count=0;
  const ranges=input.timeline.map(scene=>{
   const length=words(scene.narration).length,start=count;count+=length;
   if(!length||!timed[count-1])invalid('scene_words_missing');
   starts.push(start===0?0:timed[start].start);return {first:start,last:count-1};
  });
  const globalIssues:string[]=[];
  if(!input.scriptApproved)globalIssues.push('script_review_missing');
  if(!input.storyboardApproved)globalIssues.push('storyboard_review_missing');
  const validationScenes:any[]=[];
  const scenes:EditorialScene[]=input.timeline.map((scene,index)=>{
   const choice=choices.get(scene.id),referenced=Array.isArray(scene.evidence_ids)?scene.evidence_ids:[];
   const selected=choice?.evidence_id??referenced[0];
   // An explicit, server-validated visual revision may select a new genuine
   // source without rewriting the immutable approved storyboard's old refs.
   if(!selected||(!choice&&!referenced.includes(selected)))invalid('source_not_referenced_by_scene');
   const source=load(identity(selected)),kind=choice?.kind??(source.kind==='document'?'document':'source');
   if(kind==='source'&&source.kind!=='image'||kind==='document'&&source.kind!=='document')invalid('source_role_mismatch');
   const line=text(scene.narration),range=ranges[index],caption:EditorialCaption[]=[];
   for(let offset=range.first;offset<=range.last;){
    let end=offset;while(end<range.last&&!timed[end].last)end++;
    // Balance within each provided speech segment, never across its pause.
    for(const group of balancedGroups(timed.slice(offset,end+1)))caption.push({text:group.map(word=>word.text).join(' '),start:group[0].start,end:group.at(-1)!.end});
    offset=end+1;
   }
   const result:EditorialScene={id:scene.id,kind,start:starts[index],end:starts[index+1]??input.duration,headline:headline(line.split(/(?<=[.!?])\s+/)[0]),eyebrow:kind==='source'?'Source':kind==='document'?'Document':'Review',sourceId:selected,sourceName:source.name,caption,scriptApproved:input.scriptApproved,storyboardApproved:input.storyboardApproved};
   if(kind==='source')result.image=source.image!;
   if(kind==='document'){
    // Establish a real document link without turning its implementation details
    // into the film's message or presenting the approved claim as a quotation.
    documentExcerpt(source.file,line+' '+(source.asset.description??'')+' '+(choice?.selection_reason??''));
    const claim=line.split(/(?<=[.!?])\s+/)[0];
    if(claim.length>230)invalid('approved_claim_too_long');
    result.headline=headline(source.name);result.excerpt=claim;result.excerptKind='approved_claim';result.documentSteps=documentStepsFromClaim(claim);
   }
   if(kind==='decision'){
    const record=choice?.review_record;
    if(!reviewSemantics(line)||!record||record.job_id!==jobId||record.script_id!==scriptId||record.storyboard_id!==boardId||record.script_status!=='approved'||record.storyboard_status!=='approved'||!input.scriptApproved||!input.storyboardApproved)invalid('review_record_missing_or_unrelated');
    identity(record.script_approval_id);identity(record.storyboard_approval_id);
    if(record.script_approval_id===record.storyboard_approval_id)invalid('review_records_not_distinct');
    const sentences=line.split(/(?<=[.!?])\s+/);result.decisionText=sentences[0];result.decisionActions=sentences.slice(1);
    result.headline=headline(sentences.length>1?words(sentences.at(-1)!.split(',')[0]).slice(0,6).join(' '):source.name);
    if(sentences.length>1){
     const second=timed[range.first+words(sentences[0]).length];
     if(!second)invalid('decision_reveal_invalid');
     result.decisionRevealSec=second.start-result.start;
     if(!Number.isFinite(result.decisionRevealSec)||result.decisionRevealSec<0||result.decisionRevealSec>=result.end-result.start)invalid('decision_reveal_invalid');
    }
    if(result.decisionText.length>230||result.decisionActions.some(action=>action.length>230))invalid('review_copy_too_long');
   }
   const exact=provided&&timed[range.first].first&&timed[range.last].last;
   validationScenes.push({scene_id:scene.id,layout:kind,source_kind:source.kind,source_id:selected,source_name:source.name,source_width_px:source.image?.width,source_height_px:source.image?.height,planned_start_sec:scene.start_sec,planned_end_sec:scene.end_sec,narration_start_sec:timed[range.first].start,narration_end_sec:timed[range.last].end,scene_timing_source:exact?'provided_segment_boundaries':'estimated_word_proportion',caption_timing_source:provided?'word_proportion_within_provided_segments':'estimated_word_proportion',caption_count:caption.length,geometry_measured:false,pass:globalIssues.length===0,issues:[...globalIssues]});
   return result;
  });
  if(text(scenes.flatMap(scene=>scene.caption.map(caption=>caption.text)).join(' '))!==narration)invalid('caption_words_missing');
  for(const scene of scenes)if(scene.end<=scene.start||scene.caption.some(c=>c.text.length>140)||text(scene.decisionText).length>320)invalid('text_or_timing_density_exceeded');
  const brand=text(input.brand)||loaded.values().next().value!.name;
  const film:EditorialFilm={version:'editorial_v1',brand:headline(brand,70),duration:input.duration,scenes};
  if(input.duration-input.speechDuration>=1-0.000000001)film.endCard={start:Math.min(input.duration,input.speechDuration+0.2),title:film.brand,line:scenes.at(-1)!.headline,...(publicProductUrl?{url:publicProductUrl}:{})};
  return {film,validation:{version:'editorial_v1',scope:'source_and_timing_integrity',pass:globalIssues.length===0,issues:globalIssues,perceptual_review_required:true,editorial_constraints:board.editorial_criteria??board.human_preview_summary?.forbidden_reads??null,scenes:validationScenes},sourceFiles:[...new Set([...loaded.values()].map(source=>source.file))]};
 }catch(error){if((error as any)?.code==='visual_validation_failed')throw error;invalid('source_unreadable');}
}
