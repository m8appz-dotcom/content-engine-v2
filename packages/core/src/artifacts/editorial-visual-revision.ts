import {createHash, randomUUID} from 'node:crypto';

export type EditorialEvidenceAsset = {evidence_id:string;kind:'image'|'document';path:string;title:string;description:string;focus?:{x:number;y:number;width:number;height:number}};
export type EditorialReviewRecord = {job_id:string;script_id:string;storyboard_id:string;script_status:'approved';storyboard_status:'approved';script_approval_id:string;storyboard_approval_id:string};
export type EditorialSceneSource = {scene_id:string;evidence_id:string;kind:'source'|'document'|'decision';selection_reason:string;review_record?:EditorialReviewRecord};

function invalid(message:string):never {throw Object.assign(new Error(message),{code:'business_validation_failed'});}
function approvalMetadata(record:any) {
  if(record.metadata && typeof record.metadata==='object' && !Array.isArray(record.metadata))return record.metadata;
  try{const value=JSON.parse(record.metadata_json??'{}');return value && typeof value==='object' && !Array.isArray(value)?value:{};}catch{return {};}
}
function imageOrDocument(item:any):EditorialEvidenceAsset|null {
  if(typeof item.path!=='string'||item.url||(item.public_safe!==true&&item.public_safe!==1)||item.privacy_level!=='public'||!['owned','licensed','authorized','generated'].includes(item.rights_status))return null;
  const kind=/\.(png|jpe?g)$/i.test(item.path)?'image':/\.(md|txt)$/i.test(item.path)?'document':null;
  if(!kind)return null;
  const metadata=approvalMetadata(item),focus=kind==='image'?metadata.editorial_focus:undefined;
  if(focus!==undefined&&(!focus||['x','y','width','height'].some(key=>typeof focus[key]!=='number'||!Number.isFinite(focus[key]))))return null;
  return {evidence_id:item.id,kind,path:item.path,title:String(item.title||'Project source'),description:String(item.description||''),...(focus?{focus:{x:focus.x,y:focus.y,width:focus.width,height:focus.height}}:{})};
}

/** A derived visual selection, not a new storyboard, script, or human approval. */
export function createEditorialVisualRevision(input:{job_id:string;script:any;storyboard:any;evidence:any[];approvals?:any[];source_evidence_ids?:string[];scope_actor_id?:string;prior_visual_revision?:any}) {
  const script=input.script,board=input.storyboard;
  if(!script?.id||!board?.id||script.status!=='approved'||board.status!=='approved'||board.script_id!==script.id
    ||(script.job_id&&script.job_id!==input.job_id)||(board.job_id&&board.job_id!==input.job_id))invalid('The visual revision requires this project’s approved script and storyboard.');
  const original=board.storyboard_json??board;
  const scriptContent=script.script_json??script;
  const timeline=original.timeline??[];
  if(!Array.isArray(timeline)||!timeline.length||timeline.some((scene:any)=>typeof scene.id!=='string'||!scene.id))invalid('The approved storyboard needs identified scenes.');
  const candidates=input.evidence.filter(item=>item.job_id===input.job_id).map(imageOrDocument).filter((asset):asset is EditorialEvidenceAsset=>asset!==null);
  const storyboardHash=createHash('sha256').update(JSON.stringify(original)).digest('hex');
  const scriptHash=createHash('sha256').update(JSON.stringify(scriptContent)).digest('hex');
  const prior=input.prior_visual_revision;
  const sameRecordedScope=prior && typeof input.scope_actor_id==='string' && input.scope_actor_id.length>0
    && prior.scope_actor_id===input.scope_actor_id && prior.job_id===input.job_id && prior.script_id===script.id
    && prior.source_storyboard_id===board.id && prior.source_storyboard_sha256===storyboardHash && prior.source_script_sha256===scriptHash
    && ['explicit_evidence','preserved_explicit_evidence'].includes(prior.selection_mode);
  const reused=input.source_evidence_ids===undefined && sameRecordedScope;
  const explicit:string[]|undefined=input.source_evidence_ids ?? (reused?prior.selected_evidence_ids:undefined);
  if(reused && (!Array.isArray(explicit)||explicit.some((id:unknown)=>typeof id!=='string')))invalid('The previously selected visual evidence must be selected again.');
  const referenced=new Set<string>([...(original.preview_assets??[]).map((asset:any)=>asset.evidence_id),...timeline.flatMap((scene:any)=>scene.evidence_ids??[])]);
  const claimed=new Set<string>((scriptContent.claims??[]).flatMap((claim:any)=>claim.evidence_ids??[]));
  const supported=candidates.filter(asset=>asset.kind==='image'||claimed.has(asset.evidence_id)||referenced.has(asset.evidence_id));
  let assets:EditorialEvidenceAsset[];
  if(explicit!==undefined) {
    if(!explicit.length||explicit.length>32||new Set(explicit).size!==explicit.length||explicit.some(id=>!supported.some(asset=>asset.evidence_id===id)))invalid('Choose available public evidence belonging to this project.');
    assets=explicit.map(id=>supported.find(asset=>asset.evidence_id===id)!);
  } else {
    // Existing storyboard images remain the default. A newly added capture needs
    // an explicit evidence selection rather than silently replacing its visuals.
    assets=supported.filter(asset=>asset.kind==='document'||referenced.has(asset.evidence_id));
  }
  if(!assets.length)invalid('Select readable public evidence before revising the visuals.');
  const images=assets.filter(asset=>asset.kind==='image'),documents=assets.filter(asset=>asset.kind==='document');
  const approvals=input.approvals??[];
  const approved=(artifactId:string,field:string)=>approvals.find(record=>{
    const metadata=approvalMetadata(record);
    return record.job_id===input.job_id&&record.artifact_id===artifactId&&record.status==='approved'
      &&typeof record.id==='string'&&record.id&&typeof record.approved_by==='string'&&record.approved_by
      &&metadata.approval_context==='human_review'&&metadata[field]===true;
  });
  const scriptApproval=approved(script.id,'human_reviewed_script_text'),boardApproval=approved(board.id,'human_reviewed_storyboard_preview');
  const reviewRecord:EditorialReviewRecord|undefined=scriptApproval&&boardApproval?{job_id:input.job_id,script_id:script.id,storyboard_id:board.id,script_status:'approved',storyboard_status:'approved',script_approval_id:scriptApproval.id,storyboard_approval_id:boardApproval.id}:undefined;
  const scene_sources:EditorialSceneSource[]=timeline.map((scene:any,index:number)=>{
    const preview=(original.human_preview??[]).find((card:any)=>card.scene_id===(scene.scene_id??scene.id));
    const role=[scene.kind,scene.role,scene.beat_kind,scene.scene_template,scene.layout_treatment,scene.shot_recipe?.layout_treatment,scene.shot_recipe?.evidence_treatment,preview?.beat_kind].filter(value=>typeof value==='string').join(' ');
    const documentary=/document|validation|structure|schema|process|method|check/i.test(role);
    const spoken=typeof scene.narration==='string'?scene.narration:'';
    const decision=/review|approv|decid|decisi|sign.?off|make (?:the|your) call|choose|revis|aprob/i.test(spoken);
    const originalAsset=assets.find(asset=>(scene.evidence_ids??[]).includes(asset.evidence_id));
    const image=(explicit?images[0]:images.find(asset=>(scene.evidence_ids??[]).includes(asset.evidence_id)))??images[0];
    if(reviewRecord&&decision) {
      const source=image??originalAsset??assets[0];
      return {scene_id:scene.id,evidence_id:source.evidence_id,kind:'decision',selection_reason:'existing_recorded_approvals',review_record:{...reviewRecord}};
    }
    if(documents.length&&(documentary||(timeline.length>=3&&index===1)||!image)) {
      const source=documents.find(asset=>(scene.evidence_ids??[]).includes(asset.evidence_id))??documents[0];
      return {scene_id:scene.id,evidence_id:source.evidence_id,kind:'document',selection_reason:documentary?'storyboard_document_role':'available_project_document'};
    }
    const source=image??originalAsset??assets[0];
    return {scene_id:scene.id,evidence_id:source.evidence_id,kind:source.kind==='document'?'document':'source',selection_reason:'project_evidence'};
  });
  return {
    id:`visual_revision_${randomUUID()}`,version:'editorial_visual_revision_v1' as const,
    job_id:input.job_id,script_id:script.id,source_storyboard_id:board.id,status:'pending_visual_review' as const,
    selection_mode:explicit?(reused?'preserved_explicit_evidence':'explicit_evidence'):'approved_storyboard_sources',
    selected_evidence_ids:assets.map(asset=>asset.evidence_id),
    ...(input.scope_actor_id?{scope_actor_id:input.scope_actor_id}:{}),
    source_storyboard_sha256:storyboardHash,
    source_script_sha256:scriptHash,
    narration_preserved:true,approval_scope:'Existing approvals describe the original script and storyboard, not this visual revision.',
    source_approval_ids:reviewRecord?[reviewRecord.script_approval_id,reviewRecord.storyboard_approval_id]:[],
    assets,scene_sources,
  };
}
